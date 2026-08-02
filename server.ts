import express from "express";
import path from "path";
import multer from "multer";
import os from "os";
import fs from "fs";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Increase JSON body limits if needed
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup multer for file uploads (storing temporarily in the OS tmp directory)
const upload = multer({ dest: os.tmpdir() });

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

interface GenerateConfig {
  model?: string;
  contents: any;
  config?: any;
}

async function generateContentWithFallback(params: GenerateConfig) {
  const modelsToTry = [
    params.model || "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash"
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model} (Search: ${!!params.config?.tools})`);
      const response = await getAI().models.generateContent({
        ...params,
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || "";
      console.error(`Error with model ${model}:`, errorMsg);

      // If there are search tools and it failed due to exhausted quota, immediately retry WITHOUT search tools
      if (params.config?.tools && (errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota") || errorMsg.includes("Search") || errorMsg.includes("Limit") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429)) {
        console.warn(`Retrying model ${model} WITHOUT search grounding tools...`);
        try {
          const configWithoutTools = { ...params.config };
          delete configWithoutTools.tools;
          const response = await getAI().models.generateContent({
            ...params,
            model,
            contents: params.contents,
            config: configWithoutTools,
          });
          return response;
        } catch (innerError: any) {
          lastError = innerError;
          console.error(`Error without search on model ${model}:`, innerError.message || "");
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with available models.");
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  try {
    const file = req.file;
    const { style, bpm, extraInstructions, videoStyle, youtubeUrl } = req.body;

    if (!file && !youtubeUrl) {
      return res.status(400).json({ error: "Nenhum arquivo de áudio carregado e nenhum link do YouTube fornecido." });
    }

    if (!style || !bpm) {
      return res.status(400).json({ error: "Estilo e BPM desejado são obrigatórios." });
    }

    const selectedVideoStyle = videoStyle || "Cinematográfico 4K";
    let uploadedFile: any = null;

    if (file) {
      console.log(`Starting upload for: ${file.originalname} (${file.size} bytes) with video style: ${selectedVideoStyle}`);

      // Clean and determine the most reliable mimetype for Gemini
      let mimeType = (file.mimetype || "").split(";")[0].trim();
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === ".mp3") {
          mimeType = "audio/mp3";
        } else if (ext === ".wav") {
          mimeType = "audio/wav";
        } else if (ext === ".ogg") {
          mimeType = "audio/ogg";
        } else if (ext === ".m4a") {
          mimeType = "audio/m4a";
        } else if (ext === ".webm") {
          mimeType = "audio/webm";
        } else {
          // Safe robust default for audio files
          mimeType = "audio/wav";
        }
      }

      console.log(`Uploading file to Gemini with cleaned mimeType: ${mimeType}`);

      // Upload the file to Gemini via the File API using correct properties
      uploadedFile = await getAI().files.upload({
        file: file.path,
        config: {
          mimeType: mimeType,
        },
      });

      if (!uploadedFile || !uploadedFile.uri) {
        throw new Error("Failed to upload file to Gemini. No URI returned.");
      }

      console.log(`Upload successful. File URI: ${uploadedFile.uri}`);
    }

    let promptIntro = "";
    if (youtubeUrl) {
      promptIntro = `Actua como políglota, doctor en lingüística comparada, experto en fonética y máster en composición musical y métrica de nivel mundial.
Tu tarea es analizar en detalle la canción/música indicada en este enlace de YouTube: "${youtubeUrl}".
Como experto con capacidad de buscar información real, DEBES usar la herramienta de búsqueda de Google (Google Search) para encontrar los detalles verdaderos sobre esta canción, como título real, artista, letra (lyrics) original completa, andamiento (BPM) original aproximado, tonalidad (key) musical original, instrumentación real y timbres vocales del artista original.
NO inventes información arbitraria si puedes encontrar la información real de la canción. Si es un video menos conocido o cover, haz un análisis creativo coherente con el tipo de video.

Aclaremos lo siguiente: el usuario desea hacer una remezcla de esta canción al estilo "${style}" a ${bpm} BPM, PERO la canción original especificada en el link de YouTube tiene su PROPIO estilo/género, BPM y características reales que debes identificar de manera OBJETIVA en la sección "analysis".
`;
    } else {
      promptIntro = `Actua como políglota, doctor en lingüística comparada, experto en fonética y máster en composición musical y métrica de nivel mundial.
Tu tarea es analizar el audio proporcionado de forma 100% OBJETIVA, REAL e INMENSAMENTE DETALLADA, científica y profesional.
Aclaremos lo siguiente: el usuario desea hacer una remezcla de este audio original al estilo "${style}" a ${bpm} BPM, PERO el audio original tiene su PROPIO estilo/género, BPM y características reales.

Para la sección "analysis", debes realizar una detección acústica REAL, pura y sumamente profunda del audio subido, SIN dejarte influenciar bajo ningún concepto por el estilo de remezcla seleccionado ("${style}") o los BPM elegidos ("${bpm}").
Por ejemplo, si el audio original es una pista acústica de guitarra, pop, trap, rap, metal o folklore, debes identificarlo y describirlos con precisión matemática y artística en "analysis.genre" y "analysis.detectedBpm", sin forzarlo o sesgarlo al estilo "${style}".
`;
    }

    const commonPrompt = `${promptIntro}
Profundiza en:
1. Gênero/Estilo Original (genreAnalysis): Clasificación de estilo, orígenes, influencias y análisis rítmico del beat original de forma detallada.
2. Tonalidad y Escala Real (keyAnalysis): Detección sumamente detallada del tono (key), campo armónico, escalas mayores o menores, modos, estabilidad harmónica y progresión tentativa.
3. Timbre Vocal (vocalTimbreAnalysis): Análisis acústico de formantes de voz, rango de frecuencia, resonancia (pecho, cabeza, nasal), aire, granulación y expresividad.
4. Instrumentación (instrumentsAnalysis): Desglose exhaustivo de los instrumentos usados realmente en el archivo subido (o de la canción de YouTube), su rol, rango dinámico y espectro de frecuencias.
5. Métricas Numéricas de IA (vocalClarity, instrumentalDensity, harmonicPurity, rhythmicEnergy): Puntuaciones reales del 0 al 100 para claridad vocal, densidad de instrumentación, pureza harmónica y energía rítmica.

Además, debes generar tres versiones de la letra.

REGLAS PARA LAS LETRAS:
1. Letra Original: Transcripción completa o letra exacta de la canción en el idioma en que está cantada originalmente. ¡CRÍTICO!: SI LA CANCIÓN ANALIZADA (YA SEA DESDE ARCHIVO O CORRESPONDIENTE AL LINK DE YOUTUBE) ESTÁ EN INGLÉS, LA LETRA DEBE EXTRAERSE Y TRANSCRIBIRSE OBLIGATORIAMENTE EN INGLÉS ORIGINAL, COMPLETAMENTE SIN NINGUNA TRADUCCIÓN. Debe incluir etiquetas estructurales en inglés ([Verse 1], [Chorus], etc.).
2. Letra Distorsionada: Sonido 100% idéntico al original en el mismo idioma de la canción. Altera EXACTAMENTE UNA (1) palabra por línea que tenga más de 3 letras (ej: usar v/b, s/ss/ç, ch/x según el idioma). Las demás palabras quedan intactas.
3. Letra Alternativa: Tema libre pero con PROSODIA Y MÉTRICA EXACTAS en el mismo idioma de la canción original (por ejemplo, si la canción original está en inglés, la letra alternativa también debe estar en inglés). Debe tener el mismo número de sílabas y acentuación rítmica que la original para que encaje perfectamente en la melodía.

${extraInstructions ? `\nINSTRUÇÕES ADICIONAIS DO USUÁRIO: ${extraInstructions}\n` : ""}

Para el prompt de remix (sunoPrompt):
Usa el análisis del audio original y fusiónalo con los deseos del usuario para crear un prompt de remezcla de alta fidelidad para una IA musical (como Lyria o Suno).
El sunoPrompt debe ser descriptivo, especificando la energía del subgénero de remezcla "${style}" seleccionado por el usuario con el tempo de target de ${bpm} BPM, arreglado con sintetizadores o instrumentos propios de ese subgênero, incorporando "alternativeLyrics".
${style === "Afro/Organic House" ? `REGRA ADICIONAL CRÍTICA: Como o estilo selecionado é "Afro/Organic House", o sunoPrompt DEVE incorporar obrigatoriamente os seguintes elementos sonoros exatos: "afro house, organic house, deep house, sensual, sexy whispered female vocals, ${bpm} bpm, hypnotic rhythmic bassline, organic percussion, shakers, congas, deep tribal groove, lush atmospheric synths, sunset beach vibes, sophisticated dance groove, high frequency electronic production".` : ""}

REGLAS PARA LOS PROMPTS DE VIDEOCLIP (videoClipPrompts):
- DEBES generar una secuencia COMPLETA, EXTENSA y continua de escenas (mínimo de 8 a 15 escenas en total) para ilustrar la totalidad de la canción desde el primer segundo hasta el final. No te limites a solo 3 o 4 secciones genéricas.
- Debes mapear detalladamente y paso a paso cada sección estructural detectada en la letra original: Intro, Verso 1 (Cena A), Verso 1 (Cena B), Pre-Coro, Coro, Verso 2 (Cena A), Verso 2 (Cena B), Pre-Coro, Coro, Puente/Solo, Coro Final, Outro/Créditos.
- Cada escena individual debe incluir una descripción exhaustiva, cinematográfica e inmersiva adaptada estrictamente al estilo visual seleccionado por el usuario: "${selectedVideoStyle}". Describe con gran detalle la iluminación, el escenario, los movements de la cámara, las emociones y la paleta de colores de cada escena de forma creativa.

REGLAS PARA LA PORTADA DE SPOTIFY (spotifyCover):
- Genera un prompt altamente cinemático, artístico, moderno y de alta fidelidad para creadores de imágenes por IA (como Midjourney o DALL-E 3) que capture perfectamente la esencia del remix en el género "${style}".
- La carátula debe tener la estética visual de las grandes portadas editoriales de Spotify (estilo limpio, conceptual, fotografía de alta gama, o diseño gráfico futurista según el género).
- El prompt debe describir la composición, paleta de colores, el tipo de cámara u óleo, texturas, iluminación volumétrica y el "vibe" ideal sin incluir textos invasivos.
- Explica los requisitos técnicos de publicación obligatorios de Spotify (3000x3000px, proporción 1:1, formato JPEG/PNG sin comprimir, espacio de color RGB).

Provide the following strictly as a JSON object:
{
  "remixTitle": "A creative name for this remix in the ${style} style.",
  "analysis": {
    "genre": "A rich, short label of the style (e.g. Acoustic Pop, Reggae, Heavy Metal, etc.).",
    "mood": "Detailed tone and mood description of the actual track.",
    "timbres": "Description of overall sound timbres in the original file.",
    "instruments": "Short summary of instrumentation.",
    "vocalCharacteristics": "Brief highlights of vocal performance.",
    "key": "Exact musical key signature (e.g. G#m, F Minor).",
    "vocalTimbre": "Short vocal timbre summary.",
    "detectedBpm": "Detected physical BPM.",
    "keyAnalysis": "Highly comprehensive breakdown of tonal scale, scale degree tension, harmonic field, tuning accuracy, and chord structures detected.",
    "vocalTimbreAnalysis": "A high-fidelity analysis of vocal formant frequencies, chest/nasal/head resonance distribution, texture grain, vibrato frequency, dynamic range profile, and vocal delivery signature.",
    "genreAnalysis": "An extensive style analysis breaking down cultural roots, rhythmic patterns (syncopation, grid alignment), subgenres, and arrangement characteristics.",
    "instrumentsAnalysis": "A detailed, itemized analysis of each instrument detected in the audio file, its role, panning, and frequency density (low, mid, high ranges).",
    "vocalClarity": 85,
    "instrumentalDensity": 70,
    "harmonicPurity": 90,
    "rhythmicEnergy": 65
  },
  "originalLyrics": "Complete original lyrics with structural tags.",
  "distortedLyrics": "Phonetically identical lyrics with 1 intentional misspelling per line (>3 letters).",
  "alternativeLyrics": "Completely new lyrics with identical syllable count and rhythmic stress.",
  "sunoPrompt": "Detailed prompt for Suno/Lyria transforming the real detected style elements into a ${style} remix at ${bpm} BPM incorporating the alternativeLyrics.",
  "videoClipPrompts": [
    {
      "section": "The music scene or part identifier (e.g. Intro, Verse 1 - Parte A, Verse 1 - Parte B, Pre-Chorus, Chorus, Verse 2 - Parte A, Verse 2 - Parte B, Solo, Chorus Forte, Outro)",
      "visualPrompt": "A highly detailed, aesthetic and creative visual prompt describing the scene, environment, action, lighting, camera angles, color grading, and emotions to generate a music video clip that matches style ${style}, lyrics, and strictly uses the following visual style requested by the user: \"${selectedVideoStyle}\"."
    }
  ],
  "instagramCaption": "An interactive, high-converting Portuguese/English caption for an Instagram Post/Reel celebrating this release, including viral emojis, DJ/producer references, and highly relevant viral hashtags (e.g., #remix, #produtor, #[subgenre]).",
  "youtubeSeo": {
    "title": "A highly search-optimized and clickable Portuguese title for YouTube (e.g., Artist - Title (Style Remix / Bootleg / Edit) [BPM / Key]).",
    "description": "An extensive, beautifully structured Portuguese description for YouTube, including: Intro hooks, track info (BPM, Key, requested Style), a detailed musical paragraph, alternative lyrics, call-to-actions, social media placeholder links, and a section of relevant search tags & hashtags (e.g. #djs #productlabel).",
    "tags": "A comma-separated string of 15-20 highly search-optimized tags for YouTube tagging system."
  },
  "spotifyCover": {
    "visualPrompt": "A highly aesthetic and professional AI image generation prompt (Midjourney/DALL-E 3 syntax) to create a premium album cover artwork reflecting the requested style \"${style}\" with editorial aesthetics of a major Spotify hit. Do not write text/words inside the image.",
    "specifications": "Standard dimensions for publishing on Spotify: 3000 x 3000 pixels (1:1 Ratio), Jpeg/Png high-quality, RGB color palette, max 4MB size.",
    "concept": "A creative explanation in Portuguese about the concept, styling directions, and why it is perfectly tailored for Spotify editorial playlists."
  }
}

Ensure the output is ONLY valid JSON.`;

    let response;
    console.log("Generating content with prompt...");
    
    if (file && uploadedFile) {
      response = await generateContentWithFallback({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: uploadedFile.mimeType,
              },
            },
            { text: commonPrompt },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              remixTitle: { type: Type.STRING },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  genre: { type: Type.STRING },
                  mood: { type: Type.STRING },
                  timbres: { type: Type.STRING },
                  instruments: { type: Type.STRING },
                  vocalCharacteristics: { type: Type.STRING },
                  key: { type: Type.STRING },
                  vocalTimbre: { type: Type.STRING },
                  detectedBpm: { type: Type.STRING },
                  keyAnalysis: { type: Type.STRING },
                  vocalTimbreAnalysis: { type: Type.STRING },
                  genreAnalysis: { type: Type.STRING },
                  instrumentsAnalysis: { type: Type.STRING },
                  vocalClarity: { type: Type.INTEGER },
                  instrumentalDensity: { type: Type.INTEGER },
                  harmonicPurity: { type: Type.INTEGER },
                  rhythmicEnergy: { type: Type.INTEGER },
                },
                required: [
                  "genre", "mood", "timbres", "instruments", "vocalCharacteristics", "key", "vocalTimbre", "detectedBpm",
                  "keyAnalysis", "vocalTimbreAnalysis", "genreAnalysis", "instrumentsAnalysis",
                  "vocalClarity", "instrumentalDensity", "harmonicPurity", "rhythmicEnergy"
                ]
              },
              originalLyrics: { type: Type.STRING },
              distortedLyrics: { type: Type.STRING },
              alternativeLyrics: { type: Type.STRING },
              sunoPrompt: { type: Type.STRING },
              videoClipPrompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    section: { type: Type.STRING },
                    visualPrompt: { type: Type.STRING }
                  },
                  required: ["section", "visualPrompt"]
                }
              },
              instagramCaption: { type: Type.STRING },
              youtubeSeo: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tags: { type: Type.STRING },
                },
                required: ["title", "description", "tags"]
              },
              spotifyCover: {
                type: Type.OBJECT,
                properties: {
                  visualPrompt: { type: Type.STRING },
                  specifications: { type: Type.STRING },
                  concept: { type: Type.STRING }
                },
                required: ["visualPrompt", "specifications", "concept"]
              }
            },
            required: [
              "remixTitle", "analysis", "originalLyrics", "distortedLyrics", "alternativeLyrics", 
              "sunoPrompt", "videoClipPrompts", "instagramCaption", "youtubeSeo", "spotifyCover"
            ]
          }
        },
      });
    } else {
      // YouTube Analysis using Search Grounding
      response = await generateContentWithFallback({
        model: "gemini-3.5-flash",
        contents: commonPrompt,
        config: {
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              remixTitle: { type: Type.STRING },
              analysis: {
                type: Type.OBJECT,
                properties: {
                  genre: { type: Type.STRING },
                  mood: { type: Type.STRING },
                  timbres: { type: Type.STRING },
                  instruments: { type: Type.STRING },
                  vocalCharacteristics: { type: Type.STRING },
                  key: { type: Type.STRING },
                  vocalTimbre: { type: Type.STRING },
                  detectedBpm: { type: Type.STRING },
                  keyAnalysis: { type: Type.STRING },
                  vocalTimbreAnalysis: { type: Type.STRING },
                  genreAnalysis: { type: Type.STRING },
                  instrumentsAnalysis: { type: Type.STRING },
                  vocalClarity: { type: Type.INTEGER },
                  instrumentalDensity: { type: Type.INTEGER },
                  harmonicPurity: { type: Type.INTEGER },
                  rhythmicEnergy: { type: Type.INTEGER },
                },
                required: [
                  "genre", "mood", "timbres", "instruments", "vocalCharacteristics", "key", "vocalTimbre", "detectedBpm",
                  "keyAnalysis", "vocalTimbreAnalysis", "genreAnalysis", "instrumentsAnalysis",
                  "vocalClarity", "instrumentalDensity", "harmonicPurity", "rhythmicEnergy"
                ]
              },
              originalLyrics: { type: Type.STRING },
              distortedLyrics: { type: Type.STRING },
              alternativeLyrics: { type: Type.STRING },
              sunoPrompt: { type: Type.STRING },
              videoClipPrompts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    section: { type: Type.STRING },
                    visualPrompt: { type: Type.STRING }
                  },
                  required: ["section", "visualPrompt"]
                }
              },
              instagramCaption: { type: Type.STRING },
              youtubeSeo: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tags: { type: Type.STRING },
                },
                required: ["title", "description", "tags"]
              },
              spotifyCover: {
                type: Type.OBJECT,
                properties: {
                  visualPrompt: { type: Type.STRING },
                  specifications: { type: Type.STRING },
                  concept: { type: Type.STRING }
                },
                required: ["visualPrompt", "specifications", "concept"]
              }
            },
            required: [
              "remixTitle", "analysis", "originalLyrics", "distortedLyrics", "alternativeLyrics", 
              "sunoPrompt", "videoClipPrompts", "instagramCaption", "youtubeSeo", "spotifyCover"
            ]
          }
        },
      });
    }

    console.log("Content generated successfully.");

    // Cleanup the uploaded file from Gemini (optional, but good practice since there's a quota)
    try {
      if (uploadedFile && uploadedFile.name) {
        await getAI().files.delete({ name: uploadedFile.name });
      }
    } catch (e) {
      console.error("Failed to delete file from Gemini storage:", e);
    }

    // Cleanup the local tmp file
    try {
      if (file && file.path) {
        fs.unlinkSync(file.path);
      }
    } catch (e) {
      console.error("Failed to delete local tmp file:", e);
    }

    let aiResText = "";
    try {
      // In the latest SDK, response.text() is a method
      aiResText = typeof (response as any).text === "function" ? (response as any).text() : (response as any).text;
    } catch (e) {
      console.warn("Failed to get text from response:", e);
      aiResText = (response as any).text || "";
    }

    if (!aiResText) {
       throw new Error("Resposta vazia da IA.");
    }

    console.log("Raw AI Response length:", aiResText.length);

    let result;
    try {
      // Try parsing directly first
      result = JSON.parse(aiResText);
    } catch (parseError) {
      console.warn("Direct JSON parse failed, attempting extraction...", parseError);
      // Attempt to extract JSON if there's surrounding text
      const jsonStart = aiResText.indexOf("{");
      const jsonEnd = aiResText.lastIndexOf("}");
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const extracted = aiResText.substring(jsonStart, jsonEnd + 1);
        try {
          result = JSON.parse(extracted);
        } catch (innerError) {
          throw new Error("Falha ao processar o formato JSON retornado pela IA.");
        }
      } else {
        throw new Error("O servidor de IA não retornou um formato de dados válido.");
      }
    }
    
    res.json(result);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    
    // Improved error handling for common Gemini issues
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.status === "RESOURCE_EXHAUSTED") {
      return res.status(429).json({ 
        error: "Limite de cota atingido (Quota Exceeded). Por favor, aguarde alguns minutos ou amanhã para tentar novamente." 
      });
    }

    res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred during analysis." });
  }
});

app.post("/api/generate-music", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });

    console.log("Generating music with Lyria Pro...");
    const response = await getAI().models.generateContentStream({
      model: "lyria-3-pro-preview",
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO],
      }
    });

    let audioBase64 = "";
    let lyrics = "";
    let mimeType = "audio/wav";

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      throw new Error("No audio data generated by Lyria.");
    }

    res.json({ audioBase64, lyrics, mimeType });
  } catch (error: any) {
    console.error("Music Generation Error:", error);

    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.status === "RESOURCE_EXHAUSTED") {
      return res.status(429).json({ 
        error: "Limite de cota atingido para geração de música. Por favor, tente novamente em alguns minutos." 
      });
    }

    res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred during music generation." });
  }
});

app.post("/api/create-music", async (req, res) => {
  try {
    const { idea, mood } = req.body;
    if (!idea || !mood) return res.status(400).json({ error: "Idea and mood are required." });

    const prompt = `Compose a new musical masterpiece based on this idea: "${idea}". 
    The mood should be "${mood}".
    Provide the output as a JSON object:
    {
      "remixTitle": "A creative title based on the idea.",
      "analysis": {
        "genre": "Genre suggested by the mood.",
        "mood": "${mood}",
        "timbres": "Description of timbres.",
        "instruments": "Suggested instrumentation.",
        "vocalCharacteristics": "Vocals style.",
        "key": "Suggested key.",
        "vocalTimbre": "Vocal timbre.",
        "detectedBpm": "Suggested BPM."
      },
      "originalLyrics": "Creative lyrics based on the idea.",
      "distortedLyrics": "Phonetically identical lyrics.",
      "alternativeLyrics": "Alternative lyrics for the prompt.",
      "sunoPrompt": "Detailed prompt for Suno/Lyria incorporating the mood and idea."
    }
    Ensure the output is ONLY valid JSON.`;

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const aiResText = typeof (response as any).text === "function" ? (response as any).text() : (response as any).text;
    const result = JSON.parse(aiResText);
    res.json(result);

  } catch (error: any) {
    console.error("Create Music Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "An unknown error occurred." });
  }
});

app.post("/api/rewrite-lyrics", async (req, res) => {
  try {
    const { lyrics, style, instructions } = req.body;
    if (!lyrics) {
      return res.status(400).json({ error: "Lyrics are required." });
    }

    console.log(`Rewriting lyrics for style: ${style || "creative"}`);

    const prompt = `Você é um compositor musical de elite e mestre em prosódia e métrica.
Sua tarefa é reescrever a letra de música fornecida abaixo no estilo desejado.

Letra original para reescrever:
"""
${lyrics}
"""

Estilo desejado: ${style || "Livre / Criativo"}
Instruções adicionais de reescrita: ${instructions || "Mantenha a métrica e a vibe original, mas mude o tema ou melhore as rimas de forma criativa."}

Regras obrigatórias:
1. Mantenha a estrutura (como [Verse 1], [Chorus], [Bridge], etc.) correspondente à métrica original.
2. Certifique-se de que a letra reescrita rime perfeitamente e seja extremamente cativante e musical.
3. Se houver instruções de idioma, reescreva no idioma solicitado.
4. Responda estritamente em formato JSON com a chave "rewrittenLyrics".

Forneça sua resposta estritamente como um objeto JSON de formato:
{
  "rewrittenLyrics": "A letra reescrita completa aqui, respeitando as quebras de linha com \\n e as etiquetas de estrutura."
}
Certifique-se de retornar APENAS o objeto JSON acima, sem explicações adicionais.`;

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let aiResText = "";
    try {
      aiResText = typeof (response as any).text === "function" ? (response as any).text() : (response as any).text;
    } catch (e) {
      aiResText = (response as any).text || "";
    }

    if (!aiResText) {
      throw new Error("Resposta vazia do modelo de IA.");
    }

    const result = JSON.parse(aiResText);
    res.json(result);
  } catch (error: any) {
    console.error("Rewrite Lyrics Error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Um erro ocorreu ao tentar reescrever a letra via Inteligência Artificial." 
    });
  }
});

app.post("/api/generate-creative-lyrics", async (req, res) => {
  try {
    const { idea, mood, style, bpm, language, length, isGospelMode, centralEmotion, songTheme, targetAudience, generalTone, accent, vocalTimbre, artistStyle, customArtist, secondaryStyle, fusionRatio } = req.body;
    if (!idea) {
      return res.status(400).json({ error: "O conceito/ideia é obrigatório para compor." });
    }

    console.log(`Generating elite deep lyric compositions. Gospel mode: ${!!isGospelMode}, style: ${style}, secondaryStyle: ${secondaryStyle || "None"} (${fusionRatio || 50}%), idea: ${idea.substring(0, 50)}... [Lang: ${language}, Mood: ${mood}, Accent: ${accent || "None"}, Timbre: ${vocalTimbre || "Padrão"}, Artista: ${artistStyle || "Nenhum"}, CustomArtista: ${customArtist || "Nenhum"}]`);

    let styleFusionStr = "";
    if (secondaryStyle && secondaryStyle !== style) {
      styleFusionStr = `\nFUSÃO DE ESTILOS SELECIONADA:
Você deve fundir o estilo principal "${style}" com o estilo secundário "${secondaryStyle}" na proporção de ${fusionRatio || 50}% para "${style}" e ${100 - (fusionRatio || 50)}% para "${secondaryStyle}".
Instruções de Fusão:
1. Misture elementos rítmicos, andamento (BPM ${bpm}) e características estéticas de ambos os estilos.
2. Na geração do 'prompt' técnico do Suno AI, mescle tags de ambos os estilos (ex: se for MPB e Afro House, misture "acoustic nylon guitar" com "deep house bassline, afro percussion, tribal house rhythm") respeitando a proporção de influência definida.
3. Garanta que a atmosfera lírica e a estrutura da música reflitam a fusão híbrida inovadora resultante.`;
    }

    const JAZZ_PROMPTS_MAPPING: Record<string, string> = {
      "Jazz Noir Tradicional": "vintage noir jazz, smoky and mysterious, 68 BPM, upright bass, brushed drums, soft piano chords, muted trumpet, subtle vibraphone, dim jazz club atmosphere with gentle vinyl crackle, instrumental only, no vocals, no singing, no spoken words. [Intro] sparse piano and bass, [Break] muted trumpet motif with soft brush accents, [Instrumental Interlude] mellow piano improvisation and vibraphone textures, [Outro] fading upright bass and warm vinyl ambience.",
      "Jazz Corporativo Anos 90": "90s corporate jazz lounge, calm and reflective, 72 BPM, mellow electric piano, soft tenor saxophone, clean electric bass, brushed snare, light jazz guitar, late-night office ambience with subtle city lights atmosphere, instrumental only, no vocals, no singing, no spoken words. [Intro] electric piano chords, [Break] gentle sax melody with restrained rhythm section, [Instrumental Interlude] smooth guitar and piano conversation, [Outro] soft piano resolution with fading office-night ambience.",
      "Lofi Chuvoso Melancólico": "rainy lofi jazz, melancholy and warm, 65 BPM, soft Rhodes piano, acoustic bass, dusty drum groove, delicate jazz guitar, subtle tape saturation, distant rain sound effects, cozy midnight room atmosphere, instrumental only, no vocals, no singing, no spoken words. [Intro] rain ambience and Rhodes chords, [Break] gentle bass melody with light percussion, [Instrumental Interlude] expressive jazz guitar over warm Rhodes textures, [Outro] fading rain, tape hiss, and soft piano chords."
    };

    const BLUES_PROMPTS_MAPPING: Record<string, string> = {
      "Delta Blues Tradicional": "authentic vintage delta blues, raw acoustic slide guitar, resonator guitar, stomping foot rhythm, warm acoustic bass, rustic porch ambience, 12-bar blues structure, instrumental only, no vocals, no singing, no spoken words. [Intro] solo slide guitar lick, [Break] rhythmic guitar thumping and foot stomps, [Instrumental Interlude] expressive delta slide improvisation, [Outro] fading resonator guitar chords and wooden porch sound.",
      "Chicago Blues Elétrico": "classic electric chicago blues, uptempo driving blues shuffle, stinging electric guitar solos, soulful blues harp harmonica, warm vintage piano, driving bassline, tight acoustic drums, dim lit smoky retro blues club vibe, instrumental only, no vocals, no singing, no spoken words. [Intro] driving guitar shuffle riff, [Break] screaming harmonica solo, [Instrumental Interlude] call and response between guitar and piano, [Outro] dramatic blues band finale.",
      "Soul Blues Melódico": "smooth melodic soul blues, warm and emotional, expressive electric guitar, rich Hammond B3 organ, slow driving beat, melodic electric bass, late-night jazz/blues lounge vibe, instrumental only, no vocals, no singing, no spoken words. [Intro] mellow organ chords and soft guitar lines, [Break] crying guitar solo, [Instrumental Interlude] soulful organ lead and guitar conversational licks, [Outro] slow fading guitar chords and warm organ resolution."
    };

    const AFRO_CINEMATIC_PROMPTS_MAPPING: Record<string, string> = {
      "Cinematic Organic Afro House": "cinematic organic afro house instrumental, no vocals, no spoken words, no chants, no choir, warm and emotional sunset journey soundtrack inspired by endless road trips, tropical coastlines, golden hour beaches, African landscapes, mountains and hidden paradises, deep organic groove with rich African percussion including congas, djembe, bongos, shakers and subtle hand percussion, warm analog bass, soft melodic synths, atmospheric pads, kalimba, marimba, delicate piano textures, cinematic strings and immersive natural ambience with ocean waves, wind and distant birds blended subtly into the mix, smooth hypnotic rhythms, uplifting yet relaxing energy, elegant melodic progression, spacious stereo imaging, crystal-clear mix, premium mastering, high-end production quality, immersive travel documentary atmosphere, emotional, soulful, inspiring and adventurous, 124 BPM, deep organic house, melodic afro house, dynamic build, long evolving arrangement, festival-quality sound, ultra-clean mix, 100% instrumental."
    };

    let jazzStyleGuideline = "";
    if (JAZZ_PROMPTS_MAPPING[style]) {
      jazzStyleGuideline = `\nDIRETRIZ DE ESTILO JAZZ ESPECIALISTA ATIVADA:
O usuário selecionou o estilo especializado "${style}".
Você deve obrigatoriamente construir o campo "prompt" do JSON de resposta baseado na seguinte diretriz técnica exata (em inglês) para o Suno AI:
"${JAZZ_PROMPTS_MAPPING[style]}"
Mantenha a essência instrumental descrita na diretriz técnica acima, pois estes estilos são tradicionalmente instrumentais, calmos e atmosféricos.`;
    }

    let bluesStyleGuideline = "";
    if (BLUES_PROMPTS_MAPPING[style]) {
      bluesStyleGuideline = `\nDIRETRIZ DE ESTILO BLUES ESPECIALISTA ATIVADA:
O usuário selecionou o estilo especializado "${style}".
Você deve obrigatoriamente construir o campo "prompt" do JSON de resposta baseado na seguinte diretriz técnica exata (em inglês) para o Suno AI:
"${BLUES_PROMPTS_MAPPING[style]}"
Mantenha a essência instrumental descrita na diretriz técnica acima, pois estes estilos são tradicionalmente instrumentais, calmos e atmosféricos.`;
    }

    let afroCinematicStyleGuideline = "";
    if (AFRO_CINEMATIC_PROMPTS_MAPPING[style]) {
      afroCinematicStyleGuideline = `\nDIRETRIZ DE ESTILO AFRO CINEMATIC ESPECIALISTA ATIVADA:
O usuário selecionou o estilo especializado "${style}".
Você deve obrigatoriamente construir o campo "prompt" do JSON de resposta baseado na seguinte diretriz técnica exata (em inglês) para o Suno AI:
"${AFRO_CINEMATIC_PROMPTS_MAPPING[style]}"
Mantenha a essência instrumental estrita, sem vocais, sem coral e sem falas conforme a diretriz técnica acima.`;
    }

    const artistMappingStr = `
INFLUÊNCIAS E TAGS DO ARTISTA SELECIONADO PARA COMPOSIÇÃO E PROMPT DO SUNO AI:
- "Coldplay (Arena Pop/Rock Atmosférico)": use tags adicionais como "arena rock, epic stadium pop, atmospheric delays, soaring melodies, Chris Martin style, uplifting chord progression" no prompt e componha com lírica épica e arranjos crescentes.
- "Billie Eilish (Dark Pop / Intimista)": use tags adicionais como "minimalist dark pop, intimate whispered vocals, sub-bass, eerie atmosphere, moody, delicate, Finneas style" no prompt e componha com lirismo sussurrado, obscuro e poético.
- "Alok (Slap House Comercial)": use tags adicionais como "slap house, deep club bass, bouncy rhythm, Brazilian bass, high energy, punchy kick" no prompt.
- "Daft Punk (French Touch / Synthpop)": use tags adicionais como "french house, vocoder, funk guitars, retro synthpop, 80s synth, grooving bassline" no prompt.
- "Jorge & Mateus (Sertanejo Universitário)": use tags adicionais como "sertanejo, acoustic guitars, accordion accents, romantic brazilian pop, melodic" no prompt.
- "Caetano Veloso / Gilberto Gil (MPB Clássico)": use tags adicionais como "acoustic bossa nova, classical nylon guitar, gentle percussion, warm MPB, sophisticated jazz chords, poetic" no prompt e componha com riqueza metafórica e sofisticação lírica.
- "Taylor Swift (Folk Pop Narrativo)": use tags adicionais como "folk pop, acoustic guitar storytelling, indie pop, emotional songwriting, delicate piano" no prompt e use estrutura narrativa profunda com rico storytelling.
- "The Weeknd (Dark R&B / Synthwave)": use tags adicionais como "dark r&b, 80s synthwave, driving retro synthesizer, cinematic, sensual, moody" no prompt.
- "Travis Scott (Trap Psicodélico)": use tags adicionais como "psychedelic trap, heavy 808 bass, dark atmospheric synths, trippy sound design, Travis Scott style" no prompt.
- "Hillsong Worship (Worship Moderno/Atmosférico)": use tags adicionais como "modern worship, ambient church guitar, delay, progressive buildup, majestic atmosphere" no prompt e use forte apelo congregacional, intimista que se eleva em júbilo.
- "Fernandinho / Harpa Cristã (Gospel Pentecostal tradicional)": use tags adicionais como "traditional brazilian pentecostal gospel, vibrant choir, energetic brass accents, powerful church band" no prompt e lirismo focado em adoração profunda e poder divino.
- "Gabriela Rocha (Worship de Grande Impacto Vocal)": use tags adicionais como "powerful high-pitched emotional worship vocals, rich piano, deep orchestral buildup, majestic, powerful vocals" no prompt e lírica de adoração íntima com clímax imponente.
- "Adolfinho / Wesley Safadão (Forró Estilizado)": use tags adicionais como "electronic forró, dynamic accordion, fast-paced brass, energetic party beat, brazilian northeastern rhythm" no prompt.
`;

    let prompt = "";
    if (isGospelMode) {
      prompt = `Você é um compositor especialista em música do gênero gospel brasileira com foco em conexão emocional e retenção do ouvinte.
Crie a letra completa de uma música do gênero gospel em português com as seguintes definições:

ESTILO PRINCIPAL: "${style}"
${styleFusionStr}

EMOÇÃO CENTRAL: "${centralEmotion || "fé em meio à dor"}"
TEMA DA MÚSICA: "${songTheme || "renovação"}"
PÚBLICO: "${targetAudience || "cristãos que estão passando por um momento difícil"}"
${accent ? `SOTAQUE / EXPRESSÃO REGIONAL: "${accent}" (Incorpore gírias de expressão poética, cadência rítmica e o linguajar característico desse sotaque/regionalismo de forma sutil e natural para criar forte apelo local)` : ""}
TIMBRE VOCAL SELECIONADO: "${vocalTimbre || "Padrão do estilo"}" (Você DEVE ajustar a orientação de vocal no prompt de engenharia sonora em inglês para condizer estritamente com esta escolha, adaptando os termos de voz:
- Se for "Voz Feminina (Suave & Sussurrada)", use "soft whispered female vocals, beautiful gentle female voice, emotional".
- Se for "Voz Feminina (Poderosa & Soul)", use "powerful soulful female vocals, deep expressive belt female voice".
- Se for "Voz Masculina (Suave & Intimista)", use "soft intimate male vocals, warm pleasant male voice".
- Se for "Voz Masculina (Enérgica & Drive)", use "passionate gritty male vocals, intense energetic male voice".
- Se for "Dueto (Voz Masculina e Feminina)", use "male female duet, male and female harmonies, dual lead singers".
- Se for "Coro Coletivo / Congregacional", use "congregational collective church choir singing, rich vocal harmony choir".
- Se for "Vocais Eteriais / Angelical (Choir)", use "celestial angelic choir, ethereal voice pads, ambient atmospheric vocals".
- Se for "Sem vocais (Instrumental puro)", use "pure instrumental, no vocals, no voice, instrumental focus".
- Caso contrário, use a predefinição padrão do gênero).

INFLUÊNCIA DE ARTISTA SELECIONADA: "${artistStyle || "Nenhum (Estilo Próprio)"}"
${artistMappingStr}
(Se a INFLUÊNCIA DE ARTISTA for diferente de "Nenhum", adapte o vocabulário, estrutura dos versos e o estilo de escrita da letra de acordo com as diretrizes do artista de forma criativa).

${customArtist ? `ARTISTA DE INSPIRAÇÃO ADICIONAL (PERSONALIZADO): "${customArtist}"
(Componha a letra inspirando-se fortemente no estilo, lirismo, temas, ritmo e atmosfera poética do artista ou banda "${customArtist}". Ajuste também as tags do prompt de engenharia sonora do Suno AI para mimetizar a sonoridade típica dele(a) se aplicável).` : ""}

ESTRUTURA OBRIGATÓRIA:
- Primeira linha: gancho com tensão emocional imediata, uma declaração forte ou pergunta que prenda o ouvinte.
- [Verse 1]: construção da jornada, linguagem visual e emocional, sem clichês óbvios.
- [Pre-Chorus]: elevação da tensão emocional, prepara para o clímax.
- [Chorus]: ponto de maior intensidade, mensagem central da música, linguagem simples e repetível, máximo 4 linhas, deve ser possível cantar mentalmente horas depois.
- [Verse 2]: aprofundamento emocional, nova perspectiva do tema.
- [Pre-Chorus]
- [Chorus]
- [Bridge]: virada emocional, pode ser íntima ou explosiva, deve representar o ponto de transformação da narrativa.
- [Chorus]
- [Outro] (Fechamento: última linha ancora o ouvinte com sensação de completude que convida a ouvir de novo)

REGRAS:
- Evite frases gastas e clichês óbvios.
- Use linguagem acessível mas com profundidade emocional.
- Cada seção deve criar desejo de ouvir a próxima.
- O refrão deve carregar a mensagem que o ouvinte vai lembrar.
- A letra deve ser escrita em português.
- Formate a letra agrupando claramente as seções usando as tags entre colchetes ([Verse 1], [Chorus], [Bridge], [Pre-Chorus], [Outro]).

A sua resposta deve ser estritamente um objeto JSON contendo as chaves descritas abaixo:
{
  "title": "Um título poético, forte e autêntico para a obra gospel brasileira",
  "lyrics": "A letra completa estruturada, seguindo a estrutura obrigatória, usando quebras de linha com \n para organizar os versos.",
  "prompt": "O prompt de engenharia sonora deve ser obrigatoriamente neste formato em inglês ajustando as tags de vocal para refletir o TIMBRE VOCAL SELECIONADO e adicionando as tags do artista se houver: 'gospel worship, contemporary christian music, ${bpm || 80} bpm, warm piano chords, soft orchestral strings, gentle choir pads, uplifting and spiritual atmosphere, [TAGS DA INFLUÊNCIA DO ARTISTA SE SELECIONADO OU DO ARTISTA PERSONALIZADO SE HOUVER], [TAGS DO TIMBRE VOCAL SELECIONADO], emotional and hopeful, smooth bass, ethereal reverb, cinematic feel'."
}

ATENÇÃO CRÍTICA SOBRE O FORMATO JSON:
- Você DEVE retornar apenas o objeto JSON válido.
- O campo 'prompt' e o campo 'lyrics' DEVEM ser strings contínuas, sem quebras de linha literais (ENTER real). Para criar quebras de linha, use estritamente o caractere de escape '\\n'.
- Não use aspas duplas soltas (\") dentro das strings; se precisar destacar termos, use aspas simples (').
- Não inclua conversas ou formatações de markdown como \`\`\`json no início ou fim do texto.`;
    } else {
      prompt = `Você é um compositor especialista em ${style || "música"} com foco em conexão emocional e retenção do ouvinte.
${jazzStyleGuideline}
${bluesStyleGuideline}
${afroCinematicStyleGuideline}
 
Crie a letra completa de uma música de estilo ${style || "música"} em ${language || "Português"} com as seguintes definições:

ESTILO PRINCIPAL: "${style}"
${styleFusionStr}
 
EMOÇÃO CENTRAL: "${centralEmotion || "superação"}"
TEMA DA MÚSICA: "${songTheme || "desafios"}"
PÚBLICO: "${targetAudience || "jovens sonhadores"}"
${(language === "Português" && accent) ? `SOTAQUE / EXPRESSÃO REGIONAL: "${accent}" (Como o idioma é o português, incorpore sutilmente vocabulário, gírias locais e métricas de canto características deste sotaque regional para conferir autenticidade única)` : ""}
TIMBRE VOCAL SELECIONADO: "${vocalTimbre || "Padrão do estilo"}" (Você DEVE ajustar a orientação de vocal no prompt de engenharia sonora em inglês para condizer estritamente com esta escolha, adaptando os termos de voz:
- Se for "Voz Feminina (Suave & Sussurrada)", use "soft whispered female vocals, beautiful gentle female voice, emotional".
- Se for "Voz Feminina (Poderosa & Soul)", use "powerful soulful female vocals, deep expressive belt female voice".
- Se for "Voz Masculina (Suave & Intimista)", use "soft intimate male vocals, warm pleasant male voice".
- Se for "Voz Masculina (Enérgica & Drive)", use "passionate gritty male vocals, intense energetic male voice".
- Se for "Dueto (Voz Masculina e Feminina)", use "male female duet, male and female harmonies, dual lead singers".
- Se for "Coro Coletivo / Congregacional", use "congregational collective church choir singing, rich vocal harmony choir".
- Se for "Vocais Eteriais / Angelical (Choir)", use "celestial angelic choir, ethereal voice pads, ambient atmospheric vocals".
- Se for "Sem vocais (Instrumental puro)", use "pure instrumental, no vocals, no voice, instrumental focus".
- Caso contrário, use a predefinição padrão do gênero "no lead vocals").

INFLUÊNCIA DE ARTISTA SELECIONADA: "${artistStyle || "Nenhum (Estilo Próprio)"}"
${artistMappingStr}
(Se a INFLUÊNCIA DE ARTISTA for diferente de "Nenhum", adapte o vocabulário, estrutura dos versos e o estilo de escrita da letra de acordo com as diretrizes do artista de forma criativa).
 
${customArtist ? `ARTISTA DE INSPIRAÇÃO ADICIONAL (PERSONALIZADO): "${customArtist}"
(Componha a letra inspirando-se fortemente no estilo, lirismo, temas, ritmo e atmosfera poética do artista ou banda "${customArtist}". Ajuste também as tags do prompt de engenharia sonora do Suno AI para mimetizar a sonoridade típica dele(a) se aplicável).` : ""}

ESTRUTURA OBRIGATÓRIA:
- Primeira linha: gancho com tensão emocional imediata ou pergunta que prenda o ouvinte.
- [Verse 1]: construção da jornada, linguagem visual e emocional.
- [Pre-Chorus]: elevação de tensão, prepara para o clímax.
- [Chorus]: ponto de maior intensidade, mensagem central, linguagem simples e repetível, máximo 4 linhas. Deve ser possível cantar mentalmente horas depois.
- [Verse 2]: aprofundamento emocional, nova perspectiva.
- [Pre-Chorus]
- [Chorus]
- [Bridge]: virada emocional, ponto de transformação da narrativa.
- [Chorus]
- [Outro] (Fechamento: última linha que ancora o ouvinte com sensação de completude e convida a ouvir de novo)
 
REGRAS:
- Evite clichês óbvios do gênero.
- Use linguagem acessível mas com profundidade emocional.
- Cada seção deve criar desejo de ouvir a próxima.
- O refrão deve ser a frase que o ouvinte lembra horas depois.
- O idioma da letra deve ser estritamente ${language || "Português"}.
- Adapte a quantidade de estrofes de acordo com o tamanho "${length || "Média"}" (Curta terá estrutura mais enxuta, Média terá a estrutura padrão acima, Longa pode adicionar um [Verse 3] extra).
- Formate a letra agrupando claramente as seções usando as tags entre colchetes ([Verse 1], [Chorus], [Bridge], [Pre-Chorus], [Outro]).
 
Tom geral: "${generalTone || "vibrante e inspirador"}"
 
Você também deve gerar o bloco de estilo técnico, específico e otimizado para o Suno AI, ideal para criar a identidade sonora de um canal no YouTube, atendendo aos seguintes parâmetros:
- GÊNERO DO CANAL: ${secondaryStyle && secondaryStyle !== style ? `${style} fundido com ${secondaryStyle} (proporção ${fusionRatio || 50}% / ${100 - (fusionRatio || 50)}%)` : (style || "música")}
- EMOÇÃO DO CANAL: ${centralEmotion || "superação"}
- PÚBLICO DO CANAL: ${targetAudience || "jovens sonhadores"}
- CLIMA / CLIMA DE REFERÊNCIA: ${generalTone || "vibrante e inspirador"}
- BPM: ${bpm || 128} bpm
- INSTRUMENTOS QUE DEVEM APARECER: [Insira instrumentos técnicos recomendados para este estilo, ex: lush synthesizer, warm acoustic guitar, elegant grand piano, deep bassline, ambient pads]
- ELEMENTOS REMOVIDOS (NÃO QUERO): no lead vocals (exceto se o timbre vocal selecionado exigir vocais), no heavy drums, instrumental focus
 
O prompt gerado deve ter entre 3 e 5 linhas de termos técnicos contínuos em inglês, consistindo inteiramente em termos técnicos em inglês de alta qualidade reconhecidos pelo Suno AI, todos separados por vírgulas. Deve ser altamente específico e moldado para garantir consistência e retenção. Inclua as tags apropriadas para o TIMBRE VOCAL SELECIONADO acima (ou "no lead vocals" se for Padrão ou Sem Vocais) e as tags de influência de artista se houver artista selecionado para priorizar a harmonia de alta definição.
 
A sua resposta deve ser estritamente um objeto JSON contendo as chaves descritas abaixo:
{
  "title": "Um título poético, forte e autêntico para a obra",
  "lyrics": "A letra completa estruturada, seguindo a estrutura obrigatória, usando quebras de linha com \\n para organizar os versos.",
  "prompt": "O bloco de estilo técnico de 3 a 5 linhas em inglês, separado por vírgulas, com os termos técnicos de estilo, clima, ritmo de ${bpm || 128} bpm, instrumentos ideais, e as tags de vocal e de influência de artista (se selecionada) para refletir o TIMBRE VOCAL SELECIONADO e a INFLUÊNCIA DE ARTISTA${secondaryStyle && secondaryStyle !== style ? ` fundindo com excelência as características de ${style} e ${secondaryStyle} conforme proporção definida` : ""}."
}
 
ATENÇÃO CRÍTICA SOBRE O FORMATO JSON:
- Você DEVE retornar apenas o objeto JSON válido.
- O campo 'prompt' e o campo 'lyrics' DEVEM ser strings contínuas, sem quebras de linha literais (ENTER real). Para criar quebras de linha, use estritamente o caractere de escape '\\n'.
- Não use aspas duplas soltas (\") dentro das strings; se precisar destacar termos, use aspas simples (').
- Não inclua conversas ou formatações de markdown como \`\`\`json no início ou fim do texto.`;
    }

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Um título poético, forte e autêntico para a obra",
            },
            lyrics: {
              type: Type.STRING,
              description: "A letra completa estruturada, seguindo a estrutura obrigatória, usando quebras de linha com \\n para organizar os versos.",
            },
            prompt: {
              type: Type.STRING,
              description: "O bloco de estilo técnico de 3 a 5 linhas em inglês, separado por vírgulas, com os termos técnicos de estilo, clima, ritmo, instrumentos, vocal tags.",
            }
          },
          required: ["title", "lyrics", "prompt"]
        }
      }
    });

    let aiResText = "";
    try {
      aiResText = typeof (response as any).text === "function" ? (response as any).text() : (response as any).text;
    } catch (e) {
      aiResText = (response as any).text || "";
    }

    if (!aiResText) {
      throw new Error("Não foi possível obter resposta de composição do Gemini.");
    }

    console.log("Raw creative lyric composition response received. Length:", aiResText.length);

    let result;
    const cleanText = aiResText.trim();
    try {
      result = JSON.parse(cleanText);
    } catch (e: any) {
      console.warn("Direct JSON parsing failed. Error:", e.message, "Attempting advanced repairs...");
      let repaired = cleanText;
      
      // Strip markdown wrapping if present
      if (repaired.startsWith("```")) {
        repaired = repaired.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      // Repair trailing commas
      repaired = repaired.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

      try {
        result = JSON.parse(repaired);
      } catch (e2: any) {
        console.warn("Repair step failed. Executing fallback regex extraction...");
        try {
          // Manual regex extractor for title, lyrics, and prompt keys
          const titleMatch = repaired.match(/"title"\s*:\s*"([\s\S]*?)"\s*,(?=\s*"lyrics")/i) || repaired.match(/"title"\s*:\s*"([\s\S]*?)"/i);
          const lyricsMatch = repaired.match(/"lyrics"\s*:\s*"([\s\S]*?)"\s*,(?=\s*"prompt")/i) || repaired.match(/"lyrics"\s*:\s*"([\s\S]*?)"/i);
          const promptMatch = repaired.match(/"prompt"\s*:\s*"([\s\S]*?)"\s*(?=})/i) || repaired.match(/"prompt"\s*:\s*"([\s\S]*?)"/i);

          if (titleMatch || lyricsMatch) {
            result = {
              title: titleMatch ? titleMatch[1].replace(/\\n/g, "\n").replace(/\r?\n/g, " ").replace(/\\"/g, '"').trim() : "Composição Espetacular",
              lyrics: lyricsMatch ? lyricsMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim() : "Não foi possível extrair a letra completa estruturada.",
              prompt: promptMatch ? promptMatch[1].replace(/\\n/g, "\n").replace(/\r?\n/g, ", ").replace(/\\"/g, '"').trim() : "gospel worship, piano chords, cinematic, no lead vocals"
            };
          } else {
            throw new Error("Não foi possível extrair campos estruturados do texto retornado pela IA.");
          }
        } catch (e3) {
          throw new Error("A IA gerou um formato inválido. Erro de sintaxe: " + e.message);
        }
      }
    }

    res.json(result);

  } catch (error: any) {
    console.error("Creative Studio Epic Lyric Generation Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Ocorreu um erro ao compor a letra via Inteligência Artificial."
    });
  }
});

app.post("/api/generate-phonetic-cover", async (req, res) => {
  try {
    const { originalLyrics } = req.body;
    if (!originalLyrics) {
      return res.status(400).json({ error: "A letra original é obrigatória para gerar o cover fonético." });
    }

    console.log(`Generating anti-copyright phonetic cover for lyrics. Length: ${originalLyrics.length}`);

    const prompt = `Você é um engenheiro de áudio e especialista em linguística e paródias fonéticas (phonetic covers).
O objetivo é reescrever a letra de música fornecida abaixo substituindo as palavras por outras que possuam sonoridade/pronúncia extremamente semelhante ou idêntica (homófonos ou quase-homófonos em português), mantendo a mesma métrica, ritmo, divisão de sílabas e cadência vocal para que possa ser cantada exatamente sobre o instrumental original como um "cover", porém alterando completamente as palavras escritas para evitar qualquer tipo de detecção de direitos autorais (copyright).

LETRA ORIGINAL:
"""
${originalLyrics}
"""

Instruções Cruciais:
1. Trabalhe linha por linha.
2. Troque cada palavra por outra (ou um grupo de palavras) com o som idêntico ou muito semelhante quando cantado. Exemplo clássico em português:
   - "Noites frias" -> "Nóis três fias"
   - "Eu quero você" -> "É o que era você" ou "Eu que era você"
   - "Como se fosse" -> "Como se fossem" ou "Como se foz e"
   - "Mais uma vez" -> "Mázio uma vez" ou "Mas o mar vez"
3. O significado das frases pode se tornar abstrato, satírico ou poético. O foco absoluto é a SEMELHANÇA FONÉTICA (pronúncia idêntica ou extremamente parecida) para que o fluxo de canto/vocal ("flow") permaneça rigorosamente igual ao original.
4. Mantenha a estrutura original, incluindo marcas de estrofes (como [Verse 1], [Chorus], [Intro], etc.) se existirem.
5. Explique resumidamente em poucas linhas as principais e melhores substituições fonéticas criadas para o usuário ver como a pronúncia foi preservada.

Retorne estritamente um objeto JSON no seguinte formato:
{
  "originalLyrics": "Letra original formatada",
  "coverLyrics": "Letra com palavras diferentes mas com a mesma pronúncia fonética",
  "explanation": "Explicação curta das melhores adaptações fonéticas e dicas de canto"
}

Atenção: Não inclua marcações de código markdown como \`\`\`json no início ou no fim do texto. Retorne apenas o JSON puro válido.`;

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalLyrics: {
              type: Type.STRING,
              description: "Letra original formatada",
            },
            coverLyrics: {
              type: Type.STRING,
              description: "Letra com palavras diferentes mas com a mesma pronúncia fonética",
            },
            explanation: {
              type: Type.STRING,
              description: "Explicação curta das melhores adaptações fonéticas e dicas de canto",
            }
          },
          required: ["originalLyrics", "coverLyrics", "explanation"]
        }
      }
    });

    let aiResText = "";
    try {
      aiResText = typeof (response as any).text === "function" ? (response as any).text() : (response as any).text;
    } catch (e) {
      aiResText = (response as any).text || "";
    }

    if (!aiResText) {
      throw new Error("Não foi possível obter resposta de composição do Gemini.");
    }

    let result;
    const cleanText = aiResText.trim();
    try {
      result = JSON.parse(cleanText);
    } catch (e: any) {
      console.warn("Direct JSON parsing failed for cover. Error:", e.message);
      let repaired = cleanText;
      if (repaired.startsWith("```")) {
        repaired = repaired.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      repaired = repaired.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      try {
        result = JSON.parse(repaired);
      } catch (e2) {
        throw new Error("A IA gerou um formato inválido para o cover fonético.");
      }
    }

    res.json(result);

  } catch (error: any) {
    console.error("Phonetic Cover Generation Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Ocorreu um erro ao gerar o cover fonético via Inteligência Artificial."
    });
  }
});

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();
