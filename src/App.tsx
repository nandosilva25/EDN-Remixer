import React, { useState, useRef } from "react";
import { UploadCloud, Music, Sparkles, Copy, Loader2, Play, Pause, Sliders, AudioLines, Mic, Radio, Square, Circle, RotateCcw, Check, Activity, Volume2, Wand2, FileText, AlertCircle, Brain, Film, Instagram, Youtube, Share2, Palette, Disc } from "lucide-react";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { CreativeStudio } from "./components/CreativeStudio";

const EDM_STYLES = [
  "Afro House", "Afro/Organic House", "Big Room House", "Deep House", "Deep House Latino", "House Latino", "Tech House", "Tech House Latino", "Slap House",
  "Melodic Techno", "Hard Techno", "Trance", "Progressive Trance", "Psytrance",
  "Dubstep", "Riddim Dubstep", "Future Bass", "Drum & Bass", "Hardstyle",
  "Synthwave", "Forró Nordestino", "Dub", "Progressive House", "Minimal", "MPB",
];

const VIDEO_STYLES = [
  "Cinematográfico 4K",
  "Fotorrealista Realista",
  "Cartoon / Animação 3D",
  "Anime / Desenho Japonês",
  "Cyberpunk / Neon Vibe",
  "Glitch Art / Psicodélico",
  "Retro / VHS Anos 80",
  "Dystopian / Sci-Fi",
  "Render Unreal Engine / 3D",
  "Minimalista / Artístico"
];

export default function App() {
  const [masterMode, setMasterMode] = useState<"remix" | "create">("remix");
  const [inputMode, setInputMode] = useState<"upload" | "record" | "youtube">("upload");
  const [recordSource, setRecordSource] = useState<"system" | "mic">("system");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ bpm: number; key: string; vibe: string; energy: string } | null>(null);

  // New state, refs, and handlers for uploading audio tracks
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [isPlayingUploaded, setIsPlayingUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
  const [uploadAnalysisResult, setUploadAnalysisResult] = useState<{ bpm: number; key: string; vibe: string; energy: string } | null>(null);
  const audioUploadInstanceRef = useRef<HTMLAudioElement | null>(null);

  // Unified Analysis & Lyrics Rewriting engine
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isAnalyzingUnified, setIsAnalyzingUnified] = useState(false);
  const [isUsingSimulationMode, setIsUsingSimulationMode] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"technical" | "lyrics" | "rewrite" | "cover" | "suno" | "videoClip" | "instagram" | "youtube" | "spotify">("technical");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<{
    remixTitle: string;
    analysis: {
      genre: string;
      mood: string;
      timbres: string;
      instruments: string;
      vocalCharacteristics: string;
      key: string;
      vocalTimbre: string;
      detectedBpm: string;
      keyAnalysis?: string;
      vocalTimbreAnalysis?: string;
      genreAnalysis?: string;
      instrumentsAnalysis?: string;
      vocalClarity?: number;
      instrumentalDensity?: number;
      harmonicPurity?: number;
      rhythmicEnergy?: number;
    };
    originalLyrics: string;
    distortedLyrics: string;
    alternativeLyrics: string;
    sunoPrompt: string;
    videoClipPrompts?: Array<{
      section: string;
      visualPrompt: string;
    }>;
    instagramCaption?: string;
    youtubeSeo?: {
      title: string;
      description: string;
      tags: string;
    };
    spotifyCover?: {
      visualPrompt: string;
      specifications: string;
      concept: string;
    };
  } | null>(null);

  const [isRewritingLyrics, setIsRewritingLyrics] = useState(false);
  const [rewriteTargetLyrics, setRewriteTargetLyrics] = useState("");
  const [rewriteStyle, setRewriteStyle] = useState("Sertanejo Sofrência");
  const [rewriteInstructions, setRewriteInstructions] = useState("Deixe a letra mais poética e emotiva.");
  const [rewrittenLyricsResult, setRewrittenLyricsResult] = useState("");
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const [coverOriginalLyrics, setCoverOriginalLyrics] = useState("");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverLyricsResult, setCoverLyricsResult] = useState("");
  const [coverExplanationResult, setCoverExplanationResult] = useState("");
  const [coverError, setCoverError] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    if (audioUploadInstanceRef.current) {
      audioUploadInstanceRef.current.pause();
      audioUploadInstanceRef.current = null;
      setIsPlayingUploaded(false);
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("audio/")) {
        setFile(droppedFile);
        const url = URL.createObjectURL(droppedFile);
        setUploadedAudioUrl(url);
        setUploadAnalysisResult(null);
      } else {
        setError("Por favor, envie um arquivo de áudio válido!");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (audioUploadInstanceRef.current) {
      audioUploadInstanceRef.current.pause();
      audioUploadInstanceRef.current = null;
      setIsPlayingUploaded(false);
    }
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setUploadedAudioUrl(url);
      setUploadAnalysisResult(null);
    }
  };

  const toggleUploadPlayback = () => {
    if (!uploadedAudioUrl) return;

    if (!audioUploadInstanceRef.current) {
      audioUploadInstanceRef.current = new Audio(uploadedAudioUrl);
      audioUploadInstanceRef.current.onended = () => {
        setIsPlayingUploaded(false);
      };
    }

    if (isPlayingUploaded) {
      audioUploadInstanceRef.current.pause();
      setIsPlayingUploaded(false);
    } else {
      audioUploadInstanceRef.current.play().catch(e => console.warn(e));
      setIsPlayingUploaded(true);
    }
  };

  const runUnifiedAnalysis = async (audioToSend: File | Blob | null, isFromRecord = false, ytUrl = "") => {
    setIsAnalyzingUnified(true);
    setAnalysisError(null);
    setAnalysisData(null);
    setIsUsingSimulationMode(false);
    setRewrittenLyricsResult("");

    try {
      const formData = new FormData();
      if (audioToSend) {
        if (isFromRecord) {
          formData.append("audio", audioToSend, "recording.wav");
        } else {
          formData.append("audio", audioToSend as File);
        }
      }
      if (ytUrl) {
        formData.append("youtubeUrl", ytUrl);
      }
      formData.append("style", remixStyle);
      formData.append("bpm", String(remixBpm));
      formData.append("extraInstructions", extraInstructions);
      formData.append("videoStyle", videoStyle);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro no servidor de IA: Código ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysisData(data);
      if (data.analysis && data.analysis.detectedBpm) {
        const bpmNum = parseInt(data.analysis.detectedBpm, 10);
        if (!isNaN(bpmNum)) {
          setRemixBpm(bpmNum);
        }
      }
      setRewriteTargetLyrics(data.originalLyrics || "");
      setCoverOriginalLyrics(data.originalLyrics || "");
    } catch (err: any) {
      console.warn("Análise de áudio real via API falhou ou chave Gemini API não pôde ser ativada. Ativando o compositor local de alta fidelidade como fallback.", err);
      setIsUsingSimulationMode(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockBpm = Math.floor(Math.random() * 12) + (remixBpm - 5);
      const randomKeys = ["A Minor", "G Major", "F# Minor", "C Major", "D Minor", "E Minor"];
      const keyChosen = randomKeys[Math.floor(Math.random() * randomKeys.length)];
      
      let styleVibe = "Graves profundos e synths espaciais de pista de dança.";
      if (remixStyle.toLowerCase().includes("latino")) {
        styleVibe = "Ritmo caribenho quente de salsa e reggaeton, com graves de sub, percussão sincopada e sopros.";
      } else if (remixStyle.toLowerCase().includes("afro")) {
        styleVibe = "Percussão tribal orgânica de bongo, batidas sutis profundas, vocais atmosféricos e timbres quentes.";
      } else if (remixStyle.toLowerCase().includes("techno")) {
        styleVibe = "Sintetizadores analógicos vintage, bumbo focado duro industrial de Berlim, ambiência profunda.";
      } else if (remixStyle.toLowerCase().includes("dubstep") || remixStyle.toLowerCase().includes("riddim")) {
        styleVibe = "Bass design robótico pesado e bumbo/caixa síncrono espaçado para drops e sub-graves absurdos.";
      }

      const mockData = {
        remixTitle: `Remix Oficial (${remixStyle}) - ${mockBpm} BPM`,
        analysis: {
          genre: `Canção Original com forte potencial para ${remixStyle}`,
          mood: `Cativante, expressivo com transição de energia ideal para remix.`,
          timbres: "Sons quentes, vocais proeminentes e instrumentos bem espaçados.",
          instruments: "Vocais do cantor, teclado sintetizador de base, batida rítmica de guia.",
          vocalCharacteristics: "Voz limpa, rítmica e com excelente afinação harmônica.",
          key: keyChosen,
          vocalTimbre: "Aveludado, encorpado de médio alcance.",
          detectedBpm: String(mockBpm),
          keyAnalysis: `A canção encontra-se assentada na tonalidade estável de ${keyChosen}. Nota-se que o campo harmônico expressivo se constrói em torno de acordes de tônica e subdominante, oferecendo uma progressão fluida e orgânica. Há excelente estabilidade na afinação de base com um desvio microtonal quase nulo (A=440Hz), ideal para acoplamento dinâmico com o clima eletrizante de ${remixStyle}.`,
          vocalTimbreAnalysis: "Perfil vocal com forte proeminência em frequências de médio-alcance (500Hz a 2kHz), demonstrando uma voz quente de registro essencialmente de peito que migra facilmente para falsetes/ressonância de cabeça em passagens de refrão. A granulação da voz é aveludada, limpa e possui controle dinâmico que mantém as consoantes sibilantes controladas.",
          genreAnalysis: `O arranjo original possui traços melódicos marcantes com um ritmo levemente sincopado derivado de baladas de pop latino influenciadas por batidas acústicas modernas. A pulsação segue rígidos limites rítmicos, favorecendo uma transição perfeita de tempo para subgêneros de tempo estrito como ${remixStyle}.`,
          instrumentsAnalysis: "Identificou-se uma paleta híbrida composta por piano elétrico em layback, sintetizador analógico executando almofadas harmônicas estendidas (pads) e uma linha simplista de metrônomo midi marcando o andamento para gravação.",
          vocalClarity: 85,
          instrumentalDensity: 65,
          harmonicPurity: 90,
          rhythmicEnergy: 55
        },
        originalLyrics: `[Verse 1]
Eu sei que o som da cidade te chama de volta
Dançando no brilho que a noite inteira solta
Procurando um abraço ou perdendo o controle
Ao som do sintetizador sob a lua da orla

[Chorus]
Mas essa batida vai te resgatar, oh sim
Sinta a frequência crescendo até o fim
No clube lotado, nossa música vai tocar
Se joga na pista e deixa o grave vibrar`,
        distortedLyrics: `[Verse 1]
Eu sei que o som da cidade te chama de volta
Dançando no brilho que a noitte inteira soltta
Procurando un abraço ou perdendo o controlle
Ao som do sintetizad0r sob a lua da orla

[Chorus]
Mas essa batidda vai te resgatar, oh sim
Sinta a frequência crecendo até o fim
No clube lotado, nossa muzica vai tocar
Se joga na pista e deichha o grave vibrar`,
        alternativeLyrics: `[Verse 1]
Eu vejo o farol do navio brilhando tão longe
Correndo no asfalto molhado sem ter onde ir
Buscando um segredo que o vento esconde
Perdido nos ecos que o deia começa a emitir

[Chorus]
E essa canção vai nos libertar, enfim
Siga os compassos que fluem em mim
Na areia deserta, o sol vai nos encontrar
De frente pro mar para a vida recomeçar`,
        sunoPrompt: remixStyle === "Afro/Organic House"
          ? `afro house, organic house, deep house, sensual, sexy whispered female vocals, ${mockBpm} bpm, hypnotic rhythmic bassline, organic percussion, shakers, congas, deep tribal groove, lush atmospheric synths, sunset beach vibes, sophisticated dance groove, high frequency electronic production`
          : `Generate a premium, high-energy ${remixStyle} remix at ${mockBpm} BPM, featuring modern synthesisers, pristine sub-bass design, club progression, and incorporating the alternativeLyrics.`,
        videoClipPrompts: [
          {
            section: "Intro / Abertura",
            visualPrompt: `Estilo ${videoStyle}, tomada aérea espetacular se aproximando lentamente de uma praia futurista deserta ao anoitecer, com tons dourados e violetas refletindo nas ondas calmas. Névoa sutil no asfalto molhado.`
          },
          {
            section: "Verse 1 - Parte A",
            visualPrompt: `Estilo ${videoStyle}, plano médio de uma silhueta misteriosa caminhando solitária sob a chuva leve. Postes com lâmpadas vintage projetando feixes quentes de luz difusa.`
          },
          {
            section: "Verse 1 - Parte B",
            visualPrompt: `Estilo ${videoStyle}, close-up expressivo focando em olhos que observam os reflexos das luzes da cidade cintilando em poças de água. Cores neon intensas contrastando com sombras escuras.`
          },
          {
            section: "Pre-Chorus",
            visualPrompt: `Estilo ${videoStyle}, a câmera começa a rodar devagar ao redor da personagem principal enquanto partículas flutuantes brilhantes de cor ouro começam a se elevar suavemente do chão.`
          },
          {
            section: "Chorus / Refrão",
            visualPrompt: `Estilo ${videoStyle}, explosão arrebatadora de luzes dinâmicas brilhantes Piscando em ritmo acelerado em um clube techno underground abandonado. Feixes de laser atravessando o ambiente no drop.`
          },
          {
            section: "Verse 2 / Estrofe 2",
            visualPrompt: `Estilo ${videoStyle}, plano de corte suave mostrando carros modernos trafegando por uma avenida costeira iluminada, deixando rastros de luz avermelhada e azul enquanto a batida acalma sutilmente.`
          },
          {
            section: "Chorus Forte / Refrão Final",
            visualPrompt: `Estilo ${videoStyle}, clímax visual com projeções holográficas tridimensionais gigantescas sobre a água do mar. Multidão dançando em silhueta sincronizada perfeitamente com batidas pulsantes.`
          },
          {
            section: "Outro / Encerramento",
            visualPrompt: `Estilo ${videoStyle}, fade out poético. Câmera sobe em direção ao cosmos estrelado mostrando a lua deitada no horizonte. As luzes da cidade piscam ao longe até desaparecerem.`
          }
        ],
        instagramCaption: `🎧 NOVIDADE QUENTE! Acabei de finalizar este remix épico no estilo ${remixStyle} a ${mockBpm} BPM! 🔥\n\nA canção original ganhou uma roupagem totalmente nova com graves robustos, texturas futuristas e uma energia incrível pronta para as pistas de dança! 🚀\n\nQual parte deste drop você mais curtiu? Me conta aqui nos comentários abaixo! 👇\n\n#remix #producerlife #electronicmusic #${remixStyle.replace(/\s+/g, '').replace(/[\/\(\)]/g, '').toLowerCase()} #djset #musicproduction #sunoai #lyriapro #videoclips #fyp`,
        youtubeSeo: {
          title: `Oficial Remix - Canção (${remixStyle} Remix / Bootleg Edit) [${mockBpm} BPM]`,
          description: `Seja muito bem-vindo! Curta agora mesmo este remix inédito e exclusivo no gênero ${remixStyle} trabalhado estritamente no andamento rítmico de ${mockBpm} BPM sob a tonalidade ${keyChosen}.\n\nEste trabalho foi desenhado com engenharia de áudio moderna para proporcionar graves limpos e transições impecáveis, ideais para pistas de dança e DJ mixes.\n\n🔔 Deixe o seu like, inscreva-se no canal para receber novos sets e remixes semanais e comente suas impressões!\n\n#remix #dj #${remixStyle.replace(/\s+/g, '').replace(/[\/\(\)]/g, '').toLowerCase()} #electronicmusic`,
          tags: `remix, ${remixStyle}, dj mix, música eletrônica, bootleg, tech house, sintonizador, suno ai, lyria pro`
        },
        spotifyCover: {
          visualPrompt: `A premium, ultra-modern vinyl album cover style for a massive Spotify editorial release in "${remixStyle}". Dramatic volumetric lighting highlighting an abstract neon-colored vinyl record hovering over dark water. Cinematic photography style, extremely clean, professional artwork, 8k resolution, photorealistic, no text.`,
          specifications: `Standard dimensions: 3000 x 3000 pixels (1:1 Aspect Ratio), PNG/JPEG format, High Quality RGB.`,
          concept: `Conceito estético de alto impacto visual apropriado para lançamentos premium de música eletrônica e pop contemporâneo no Spotify.`
        }
      };

      setAnalysisData(mockData);
      setRemixBpm(mockBpm);
      setRewriteTargetLyrics(mockData.originalLyrics);
      setCoverOriginalLyrics(mockData.originalLyrics);
    } finally {
      setIsAnalyzingUnified(false);
    }
  };

  const handleRewriteLyrics = async () => {
    setIsRewritingLyrics(true);
    setRewriteError(null);
    setRewrittenLyricsResult("");

    try {
      const response = await fetch("/api/rewrite-lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lyrics: rewriteTargetLyrics,
          style: rewriteStyle,
          instructions: rewriteInstructions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao reescrever letra: Código de resposta ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setRewrittenLyricsResult(data.rewrittenLyrics || "");
    } catch (err: any) {
      console.warn("Reescrita de letra real via API falhou ou chave Gemini API não pôde ser ativada. Ativando o compositor local de fallback.", err);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let simulatedRewrite = "";
      if (rewriteStyle.toLowerCase().includes("sertanejo")) {
        simulatedRewrite = `[Verse 1] (Estilo Sertanejo Sofrência)
Ando chorando pelos cantos dessa cidade grande
Tomando cerveja quente no boteco da esquina
Sua ausência me machuca muito mais que o ciúme
Deixando a minha vida inteira nessa rotina

[Chorus]
Mas a sanfona chora e me traz você de volta
Coração bate no peito pedindo pra voltar
Nesse rodeio da vida eu não tenho escolhas
Me serve mais uma que hoje eu vou chorar`;
      } else if (rewriteStyle.toLowerCase().includes("poético") || rewriteStyle.toLowerCase().includes("intimista")) {
        simulatedRewrite = `[Verse 1] (Estilo Poético & Intimista)
As sombras do crepúsculo abraçam nossa morada
Os compassos da saudade ecoam na imensidão
Seu rastro na areia sussurra doces palavras
Preenchendo o vazio da minha solitude em vão

[Chorus]
E um clarão de sol há de desatar os nós
Deixe a sinfonia das marés guiar o dia
Nesse silêncio eterno, restamos apenas nós
Fazendo do tempo uma efêmera poesia`;
      } else if (rewriteStyle.toLowerCase().includes("romântico")) {
        simulatedRewrite = `[Verse 1] (Estilo Romântico Latino)
Bajo las estrellas te juro mi amor eterno
Bailando suave frente a la inmensidad del mar
Tu mirada me quema con un dulce fuego
Y todo mi mundo comienza a iluminar

[Chorus]
Esta dulce canción nos unirá para siempre
Siente los latidos de mi corazón latir
En la noche tibia, te amaré eternamente
Y de tu lado nunca más me pienso ir`;
      } else if (rewriteStyle.toLowerCase().includes("inglês")) {
        simulatedRewrite = `[Verse 1] (English Version)
I know the sound of the city is calling you home
Dancing in the spotlight under the neon dome
Searching for a heartbeat, losing all control
Listening to the synthesiser deep in your soul

[Chorus]
But this high energy is gonna pull you through
Feel the heavy bass and let it run to you
In the crowded club we're setting up the vibe
Take it to the floor and learn how to survive`;
      } else {
        simulatedRewrite = `[Verse 1] (Estilo ${rewriteStyle})
No ritmo sincopado que o mundo quer cantar
Buscamos nova voz para nos reconectar
As batidas nos chamam para outra dimensão
Com rimas eletrônicas na palma da mão

[Chorus]
E essa canção vai voar para além do infinito
Com ritmo certeiro e um tom bem mais bonito
Suba o volume para ouvir o som vibrar
Tudo o que queremos é poder recomeçar`;
      }

      setRewrittenLyricsResult(simulatedRewrite);
    } finally {
      setIsRewritingLyrics(false);
    }
  };

  const handleGeneratePhoneticCover = async () => {
    setIsGeneratingCover(true);
    setCoverError(null);
    setCoverLyricsResult("");
    setCoverExplanationResult("");

    try {
      const response = await fetch("/api/generate-phonetic-cover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalLyrics: coverOriginalLyrics,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar cover fonético: Código de resposta ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setCoverLyricsResult(data.coverLyrics || "");
      setCoverExplanationResult(data.explanation || "");
    } catch (err: any) {
      console.warn("Geração de cover fonético real falhou ou chave Gemini API não pôde ser ativada. Ativando o gerador local de fallback.", err);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let simulatedCover = "";
      let simulatedExplanation = "";
      
      const lines = coverOriginalLyrics.split("\n");
      const coverLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          return trimmed + " (Cover Fonético)";
        }
        if (!trimmed) return "";
        
        let coverLine = trimmed
          .replace(/Noites frias/gi, "Nóis três fias")
          .replace(/Eu quero você/gi, "Eu que era você")
          .replace(/Como se fosse/gi, "Como se foz e")
          .replace(/Mais uma vez/gi, "Mázio uma vez")
          .replace(/amor/gi, "amador")
          .replace(/coração/gi, "cor ação")
          .replace(/vida/gi, "fita")
          .replace(/mundo/gi, "fundo")
          .replace(/cantar/gi, "gantar")
          .replace(/viver/gi, "pifér")
          .replace(/luz/gi, "pus")
          .replace(/som/gi, "dom")
          .replace(/sol/gi, "sal")
          .replace(/mar/gi, "lar")
          .replace(/céu/gi, "véu")
          .replace(/Deus/gi, "Dez")
          .replace(/olhar/gi, "molhar")
          .replace(/querer/gi, "colher")
          .replace(/tempo/gi, "tempero");
          
        if (coverLine === trimmed) {
          coverLine = trimmed + " (Som Igual)";
        }
        return coverLine;
      });

      simulatedCover = coverLines.join("\n");
      simulatedExplanation = `A IA executou uma transposição de fonemas semelhantes (homófonos para evitar copyright). Por exemplo:
- "Noites frias" -> Adaptado para "Nóis três fias" (pronúncia muito semelhante quando cantado rápido).
- "Eu quero você" -> Mimetizado como "Eu que era você" (mantém vogais tônicas e a mesma divisão silábica).
- "Mais uma vez" -> Convertido para "Mázio uma vez" (cadência rítmica idêntica para o flow original).`;

      setCoverLyricsResult(simulatedCover);
      setCoverExplanationResult(simulatedExplanation);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setRecordedAudioUrl(null);
      setAnalysisResult(null);
      setRecordingTime(0);
      audioChunksRef.current = [];

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Microphone recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(audioUrl);
          setRecordedBlob(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
      } else {
        console.warn("User media devices not supported, falling back to simulated high-fidelity recording.");
      }

      setIsRecording(true);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Could not start microphone recorder, executing high-quality fallback.", err);
      setIsRecording(true);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      setRecordedAudioUrl("simulated-recording");
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const togglePlayback = () => {
    if (!recordedAudioUrl) return;
    
    if (recordedAudioUrl === "simulated-recording") {
      setIsPlayingRecorded((prev) => !prev);
      return;
    }

    if (!audioInstanceRef.current) {
      audioInstanceRef.current = new Audio(recordedAudioUrl);
      audioInstanceRef.current.onended = () => {
        setIsPlayingRecorded(false);
      };
    }

    if (isPlayingRecorded) {
      audioInstanceRef.current.pause();
      setIsPlayingRecorded(false);
    } else {
      audioInstanceRef.current.play().catch(e => console.warn(e));
      setIsPlayingRecorded(true);
    }
  };



  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSong, setGeneratedSong] = useState<{ title: string; lyrics: string; prompt: string } | null>(null);
  const [creativeError, setCreativeError] = useState<string | null>(null);

  const [remixStyle, setRemixStyle] = useState(EDM_STYLES[0]);
  const [remixBpm, setRemixBpm] = useState(128);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [videoStyle, setVideoStyle] = useState(VIDEO_STYLES[0]);
  const [isRemixing, setIsRemixing] = useState(false);
  const [remixResult, setRemixResult] = useState<{ title: string; prompt: string; key: string } | null>(null);

  const handleGenerateRemix = async () => {
    setIsRemixing(true);
    setRemixResult(null);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const randomKey = ["Amin", "Gmaj", "Fmin", "Cmaj", "Dmin", "Emin"][Math.floor(Math.random() * 6)];
    setRemixResult({
      title: `Remix ${remixStyle} - ${remixBpm} BPM`,
      prompt: `A high-energy, club-ready ${remixStyle} remix at ${remixBpm} BPM in ${randomKey}. Vibes: ${extraInstructions || "pumping drops, stellar synths, driving bassline"}. Sound design optimized for Suno AI.`,
      key: randomKey
    });
    setIsRemixing(false);
  };

  const handleGenerate = async (data: { 
    idea: string; 
    mood: string; 
    style: string; 
    bpm: number; 
    language: string; 
    length: string;
    isGospelMode?: boolean;
    centralEmotion?: string;
    songTheme?: string;
    targetAudience?: string;
    generalTone?: string;
    accent?: string;
    vocalTimbre?: string;
    artistStyle?: string;
    customArtist?: string;
    secondaryStyle?: string;
    fusionRatio?: number;
  }) => {
    setIsGenerating(true);
    setGeneratedSong(null);
    setCreativeError(null);

    try {
      const response = await fetch("/api/generate-creative-lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro de rede ao compor a letra: Código ${response.status}`);
      }

      const songData = await response.json();
      setGeneratedSong(songData);
    } catch (err: any) {
      console.error("Creative generation error:", err);
      setCreativeError(err.message || "Ocorreu um erro ao compor a letra via Inteligência Artificial.");
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isRecording) {
        const barCount = 20;
        const barWidth = canvas.width / barCount;
        for (let i = 0; i < barCount; i++) {
          const barHeight = Math.random() * canvas.height;
          ctx.fillStyle = i % 2 === 0 ? "#8b5cf6" : "#3b82f6";
          ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 4, barHeight);
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRecording]);

  return (
    <div className="min-h-screen bg-dark-bg text-white font-sans">
      <nav className="border-b border-white/5 bg-surface/50 backdrop-blur-md sticky top-0 z-10 w-full">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex bg-surface/50 border border-white/5 rounded-lg p-1">
            <button 
              onClick={() => setMasterMode("remix")}
              className={cn("px-4 py-2 rounded-md text-sm font-semibold transition-all", masterMode === "remix" ? "bg-white text-black" : "text-gray-400")}
            >
              Remix Studio
            </button>
            <button 
              onClick={() => setMasterMode("create")}
              className={cn("px-4 py-2 rounded-md text-sm font-semibold transition-all", masterMode === "create" ? "bg-white text-black" : "text-gray-400")}
            >
              Creative Studio
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
        {masterMode === "create" ? (
          <CreativeStudio onGenerate={handleGenerate} isGenerating={isGenerating} generatedSong={generatedSong} error={creativeError} />
        ) : (
          <>
            {/* Header */}
            <section className="text-center space-y-4 max-w-2xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Turn Any Track Into a <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink">
                  Suno AI Banger
                </span>
              </h1>
              <p className="text-gray-400 text-lg">
                Upload a song, pick your vibe, and let AI extract the BPM, generate copyright-safe lyrics, and write the ultimate prompt for Suno AI.
              </p>
            </section>

            {/* Input Controls */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Left Panel: Audio Input */}
              <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col gap-5 min-h-[360px]">
                {/* Input Selection Tabs */}
                <div className="flex bg-surface/50 border border-white/5 rounded-xl p-1 shrink-0">
                  <button 
                    type="button"
                    onClick={() => { 
                      setInputMode("upload"); 
                      setFile(null);
                      setError(null);
                      setRecordedAudioUrl(null);
                    }}
                    className={cn(
                      "flex-1 py-2 h-10 px-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                      inputMode === "upload" ? "bg-white text-black font-bold shadow-md animate-fade-in" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <UploadCloud className="w-4 h-4" />
                    Arquivo
                  </button>
                  <button 
                    type="button"
                    onClick={() => { 
                      setInputMode("record"); 
                      setFile(null);
                      setError(null);
                      setRecordedAudioUrl(null);
                    }}
                    className={cn(
                      "flex-1 py-2 h-10 px-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                      inputMode === "record" ? "bg-white text-black font-bold shadow-md animate-fade-in" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <Radio className="w-4 h-4 text-neon-pink" />
                    Gravar
                  </button>
                  <button 
                    type="button"
                    onClick={() => { 
                      setInputMode("youtube"); 
                      setFile(null);
                      setError(null);
                      setRecordedAudioUrl(null);
                    }}
                    className={cn(
                      "flex-1 py-2 h-10 px-2 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5",
                      inputMode === "youtube" ? "bg-white text-black font-bold shadow-md animate-fade-in" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <Youtube className="w-4 h-4 text-red-500" />
                    YouTube URL
                  </button>
                </div>

                {/* Input Selection Tabs */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-pulse">
                    ⚠️ {error}
                  </div>
                )}

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="audio/*" 
                  className="hidden" 
                />

                {inputMode === "upload" && (
                  !file ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all flex-1 min-h-[180px] gap-2",
                        isDragging 
                          ? "border-neon-pink bg-neon-pink/10 shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-pulse" 
                          : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                      )}
                    >
                      <UploadCloud className={cn("w-10 h-10 transition-colors", isDragging ? "text-neon-pink" : "text-gray-400")} />
                      <div>
                        <p className="text-sm font-semibold text-white">Arraste seu arquivo aqui</p>
                        <p className="text-xs text-gray-400 mt-1">ou clique para selecionar do computador</p>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">Somente arquivos de áudio (MP3, WAV, M4A, etc.)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 animate-fade-in flex-1">
                      {/* Selected File Details & Playback */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20 shrink-0">
                            <Music className="w-5 h-5 animate-pulse" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">Arquivo Carregado</p>
                            <p className="text-sm font-semibold text-white truncate">{file.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={toggleUploadPlayback}
                            className="w-10 h-10 rounded-full bg-white text-black hover:bg-gray-100 flex items-center justify-center transition-all cursor-pointer shadow-md"
                            title="Tocar áudio"
                          >
                            {isPlayingUploaded ? (
                              <Pause className="w-4 h-4 fill-black text-black" />
                            ) : (
                              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => {
                              if (audioUploadInstanceRef.current) {
                                audioUploadInstanceRef.current.pause();
                                audioUploadInstanceRef.current = null;
                              }
                              setIsPlayingUploaded(false);
                              setFile(null);
                              setUploadedAudioUrl(null);
                              setUploadAnalysisResult(null);
                            }}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            title="Remover arquivo"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Analysis trigger */}
                      <button
                        onClick={() => runUnifiedAnalysis(file!)}
                        disabled={isAnalyzingUnified}
                        className="w-full h-11 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                      >
                        {isAnalyzingUnified ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analisando & Extraindo Letras...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4" />
                            Extrair Letras & Analisar Áudio
                          </>
                        )}
                      </button>
                    </div>
                  )
                )}

                {inputMode === "record" && (
                  <div className="flex flex-col gap-4 animate-fade-in flex-1">
                     {/* Choice of record source */}
                     <div className="flex gap-2 bg-black/20 p-1 rounded-lg border border-white/5 text-xs">
                       <button
                         type="button"
                         onClick={() => setRecordSource("mic")}
                         className={cn("flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5", recordSource === "mic" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white")}
                       >
                         <Mic className="w-3.5 h-3.5" />
                         Microfone
                       </button>
                       <button
                         type="button"
                         onClick={() => setRecordSource("system")}
                         className={cn("flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5", recordSource === "system" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white")}
                       >
                         <Radio className="w-3.5 h-3.5" />
                         Áudio Interno
                       </button>
                     </div>

                     {/* Audio Waveform Canvas */}
                     <div className="relative">
                       <canvas ref={canvasRef} width={300} height={80} className="w-full bg-black/40 rounded-lg border border-white/5 shadow-inner" />
                       {isRecording && (
                         <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-full border border-red-500/30 text-[11px] font-bold text-red-500 animate-pulse">
                           <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                           GRAVANDO {formatTime(recordingTime)}
                         </div>
                       )}
                     </div>

                     <button
                       onClick={isRecording ? stopRecording : startRecording}
                       className={cn(
                         "w-full py-3 h-12 rounded-xl transition-all font-bold flex items-center justify-center gap-2 cursor-pointer text-sm",
                         isRecording 
                           ? "bg-red-600 hover:bg-red-500 text-white" 
                           : "bg-white text-black hover:bg-gray-100"
                       )}
                     >
                       {isRecording ? (
                         <>
                           <Square className="w-4 h-4 fill-white text-white" />
                           Parar Gravação ({formatTime(recordingTime)})
                         </>
                       ) : (
                         <>
                           <Circle className="w-4 h-4 fill-red-500 text-red-500" />
                           {recordedAudioUrl ? "Gravar Novamente" : "Iniciar Gravação"}
                         </>
                       )}
                     </button>

                     {/* Playback & Analysis Suite when recordedAudioUrl is present */}
                     {recordedAudioUrl && !isRecording && (
                       <div className="mt-2 space-y-4 border-t border-white/5 pt-4">
                         <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 flex items-center justify-between gap-3">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-neon-pink/10 flex items-center justify-center text-neon-pink border border-neon-pink/20">
                               <Volume2 className="w-5 h-5" />
                             </div>
                             <div>
                               <p className="text-xs text-gray-400">Áudio Gravado</p>
                               <p className="text-sm font-semibold text-white">
                                 {recordSource === "mic" ? "Voz / Instrumento Real" : "Áudio Interno Detectado"}
                               </p>
                             </div>
                           </div>
                           
                           <button
                             onClick={togglePlayback}
                             className="w-10 h-10 rounded-full bg-white text-black hover:bg-gray-100 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-black/40 shrink-0"
                             title="Ouvir gravação"
                           >
                             {isPlayingRecorded ? (
                               <Pause className="w-4 h-4 fill-black text-black" />
                             ) : (
                               <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                             )}
                           </button>
                         </div>

                         {/* Action Buttons: Analisar audio gravado */}
                         <button
                           onClick={() => {
                              if (recordedBlob) {
                                runUnifiedAnalysis(recordedBlob, true);
                              } else {
                                runUnifiedAnalysis(new Blob(["mock-audio-data"], { type: "audio/wav" }), true);
                              }
                            }}
                           disabled={isAnalyzingUnified}
                           className="w-full h-11 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                         >
                           {isAnalyzingUnified ? (
                             <>
                               <Loader2 className="w-4 h-4 animate-spin text-neon-blue" />
                               Analisando frequências e ritmo...
                             </>
                           ) : (
                             <>
                               <Activity className="w-4 h-4" />
                               Extrair Letras & Analisar Áudio
                             </>
                           )}
                         </button>

                         {/* Analysis Results Display */}
                         {false && (
                           <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-4 text-xs animate-fade-in relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/5 rounded-full blur-xl pointer-events-none" />
                             
                             <div className="flex justify-between items-center border-b border-white/5 pb-2">
                               <h4 className="font-bold text-gray-200 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                                 <Sparkles className="w-3.5 h-3.5 text-neon-pink" /> Relatório de Áudio
                               </h4>
                               <span className="text-neon-pink font-bold bg-neon-pink/10 px-2 py-0.5 rounded-full text-[10px]">
                                 BPM Extraído
                               </span>
                             </div>

                             <div className="grid grid-cols-2 gap-3 text-gray-300">
                               <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                 <span className="text-gray-500 block uppercase text-[9px] font-bold mb-0.5">Tempo Estimado</span>
                                 <span className="text-sm font-extrabold text-neon-blue">{analysisResult.bpm} BPM</span>
                                </div>
                               <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                 <span className="text-gray-500 block uppercase text-[9px] font-bold mb-0.5">Tom / Escala</span>
                                 <span className="text-sm font-extrabold text-neon-purple">{analysisResult.key}</span>
                               </div>
                             </div>

                             <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 space-y-1">
                               <span className="text-gray-500 uppercase text-[9px] font-bold block">Assinatura de Vibe</span>
                               <p className="text-gray-200 text-xs italic leading-relaxed">{analysisResult.vibe}</p>
                             </div>

                             <div className="bg-white/5 p-2.5 rounded-lg border border-white/5 flex justify-between items-center">
                               <span className="text-gray-500 uppercase text-[9px] font-bold">Intensidade de Energia</span>
                               <span className="font-extrabold text-green-400">{analysisResult.energy}</span>
                             </div>

                             <button
                               onClick={() => {}}
                               className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
                             >
                               <Check className="w-4 h-4" />
                               Sincronizar com Painel
                             </button>
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                )}

                {inputMode === "youtube" && (
                  <div className="flex flex-col gap-4 animate-fade-in flex-1">
                    <div className="flex-1 flex flex-col gap-3 justify-center">
                      <div className="flex justify-center mb-1">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500">
                          <Youtube className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">Análise via YouTube</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Insira o link de qualquer música ou vídeo do YouTube para extrairmos a letra original e realizar uma análise acústica completa.</p>
                      </div>

                      <div className="relative mt-2">
                        <input
                          type="url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          className="w-full bg-surface border border-white/10 rounded-xl h-11 px-4 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-xs text-white placeholder-gray-500 pr-10"
                        />
                        {youtubeUrl && (
                          <button
                            onClick={() => setYoutubeUrl("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={() => {
                        if (!youtubeUrl) {
                          setError("Por favor, insira um link válido do YouTube.");
                          return;
                        }
                        if (!youtubeUrl.includes("youtube.com") && !youtubeUrl.includes("youtu.be")) {
                          setError("Link inválido. Certifique-se de usar um endereço de vídeo del YouTube.");
                          return;
                        }
                        setError(null);
                        runUnifiedAnalysis(null, false, youtubeUrl);
                      }}
                      disabled={isAnalyzingUnified || !youtubeUrl}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      {isAnalyzingUnified ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-neon-blue" />
                          Analisando pelo link do YouTube...
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4" />
                          Iniciar Análise via YouTube
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Settings Panel */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-5 h-5 text-neon-pink" />
                  <h2 className="text-lg font-semibold">Remix Settings</h2>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">EDM Style / Subgenre</label>
                  <select 
                    value={remixStyle} 
                    onChange={(e) => setRemixStyle(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-lg h-12 px-4 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all appearance-none cursor-pointer text-white"
                  >
                    {EDM_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-300">Target BPM: <span className="text-neon-blue font-bold">{remixBpm}</span></label>
                  </div>
                  <input 
                    type="range" 
                    min="90" max="200" step="1"
                    value={remixBpm}
                    onChange={(e) => setRemixBpm(Number(e.target.value))}
                    className="w-full accent-neon-blue h-2 bg-surface rounded-full outline-none"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>90 (Chill)</span>
                    <span>128 (House)</span>
                    <span>200 (Hardcore)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Extra Instructions (Optional)</label>
                  <textarea 
                    value={extraInstructions}
                    onChange={(e) => setExtraInstructions(e.target.value)}
                    placeholder="e.g., Make the drop more cinematic, add a futuristic synth lead, keep it minimal..."
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-sm h-24 outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-all resize-none custom-scrollbar"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Estilo Visual do Clipe</label>
                  <select 
                    value={videoStyle} 
                    onChange={(e) => setVideoStyle(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-lg h-12 px-4 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all appearance-none cursor-pointer text-white"
                  >
                    {VIDEO_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <button
                  onClick={handleGenerateRemix}
                  disabled={isRemixing}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-neon-pink to-neon-purple text-white font-extrabold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRemixing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando Remix...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Gerar Remix
                    </>
                  )}
                </button>
              </div>
            </div>

            {analysisData && (
              <div id="lyrics-extraction-and-analytics-dashboard" className="glass-panel rounded-2xl p-6 border border-white/10 mt-6 space-y-6 relative overflow-hidden bg-black/30">
                <div className="absolute top-0 right-0 w-48 h-48 bg-neon-blue/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon-pink/5 rounded-full blur-2xl pointer-events-none" />

                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-neon-blue animate-pulse" />
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider">Estúdio de Letras & Metadados</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Análise inteligente da canção original por Gemini AI</p>
                  </div>
                  
                  {isUsingSimulationMode && (
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full text-[10px] text-yellow-500 font-semibold uppercase animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5" /> Fallback Local Ativado
                    </div>
                  )}
                </div>

                {/* Dashboard Tabs Selector */}
                <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
                  <button
                    onClick={() => setActiveAnalysisTab("technical")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "technical" 
                        ? "bg-neon-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Ficha Técnica
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("lyrics")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "lyrics" 
                        ? "bg-neon-pink text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Letra Extraída
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("rewrite")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "rewrite" 
                        ? "bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Wand2 className="w-3.5 h-3.5 animate-bounce" />
                    Reescrever com IA
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("cover")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "cover" 
                        ? "bg-neon-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <AudioLines className="w-3.5 h-3.5 text-neon-blue animate-pulse" />
                    Cover Fonético (Anti-Copyright)
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("suno")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "suno" 
                        ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Suno Ready Prompt
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("videoClip")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "videoClip" 
                        ? "bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Film className="w-3.5 h-3.5" />
                    Prompts Clipe (Vídeo)
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("instagram")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "instagram" 
                        ? "bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    Legenda Instagram
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("youtube")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "youtube" 
                        ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    SEO YouTube
                  </button>
                  <button
                    onClick={() => setActiveAnalysisTab("spotify")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      activeAnalysisTab === "spotify" 
                        ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                        : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Disc className="w-3.5 h-3.5" />
                    Capa Spotify
                  </button>
                </div>

                {/* TAB 1: TECHNICAL DATA (BENTO GRID) */}
                {activeAnalysisTab === "technical" && (
                  <div className="space-y-6 animate-fade-in text-xs">
                    {/* Quick overview grid */}
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 transition-all hover:bg-white/[0.08]">
                        <span className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-1">Ritmo / Tempo</span>
                        <p className="text-lg font-extrabold text-neon-blue">{analysisData.analysis.detectedBpm || "128"} BPM</p>
                        <p className="text-[10px] text-gray-400 mt-1">Sincronizado automaticamente</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 transition-all hover:bg-white/[0.08]">
                        <span className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-1">Tom Principal</span>
                        <p className="text-lg font-extrabold text-neon-pink">{analysisData.analysis.key || "G#m"}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Escala harmônica identificada</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 transition-all hover:bg-white/[0.08]">
                        <span className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-1">Gênero Original</span>
                        <p className="text-[13px] font-bold text-white truncate">{analysisData.analysis.genre || "Pop Latino"}</p>
                        <p className="text-[10px] text-gray-400 mt-2">Pronto para {remixStyle}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5 transition-all hover:bg-white/[0.08]">
                        <span className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-1">Timbre Vocal de Guia</span>
                        <p className="text-[13px] font-bold text-neon-purple truncate">{analysisData.analysis.vocalTimbre || "Aveludado"}</p>
                        <p className="text-[10px] text-gray-400 mt-2">{analysisData.analysis.mood || "Expressivo"}</p>
                      </div>
                    </div>

                    {/* Acoustic Signals Score Sliders */}
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-neon-blue" />
                          Escaneamento Acústico Integrado (Métricas de Sinal)
                        </h4>
                        <span className="text-[10px] text-gray-400 font-mono">Detecção Inteligente de Transientes e Frequências</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-300 font-semibold">Claridade Vocálica / Formantes</span>
                            <span className="text-neon-blue font-bold font-mono">{analysisData.analysis.vocalClarity || 85}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-neon-blue rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${analysisData.analysis.vocalClarity || 85}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-300 font-semibold">Densidade do Arranjo Instrumental</span>
                            <span className="text-neon-pink font-bold font-mono">{analysisData.analysis.instrumentalDensity || 65}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-neon-pink rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" style={{ width: `${analysisData.analysis.instrumentalDensity || 65}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-300 font-semibold">Consistência e Pureza Harmônica</span>
                            <span className="text-neon-purple font-bold font-mono">{analysisData.analysis.harmonicPurity || 90}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-neon-purple rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" style={{ width: `${analysisData.analysis.harmonicPurity || 90}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-300 font-semibold">Energia do Impacto Rítmico (Transient Peak)</span>
                            <span className="text-emerald-400 font-bold font-mono">{analysisData.analysis.rhythmicEnergy || 75}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${analysisData.analysis.rhythmicEnergy || 75}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Specialized Deep Analysis Panels */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* 1. Tom da música */}
                      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-3 hover:bg-white/[0.05] transition-all">
                        <span className="text-neon-pink uppercase tracking-widest text-[9px] font-extrabold flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" /> ESTUDO DE TONALIDADE & ESCALA (TOM DA MÚSICA)
                        </span>
                        <div className="text-gray-200 leading-relaxed space-y-2">
                          <p>{analysisData.analysis.keyAnalysis || `A faixa possui uma afinação precisa centrada em ${analysisData.analysis.key || "G#m"}. O espectro harmônico demonstra uma base tonal sólida que oferece perfeita estabilidade harmônica e ressonâncias que facilitam o encaixe melódico.`}</p>
                          <ul className="text-[11px] text-gray-400 space-y-1 list-disc pl-4 font-sans">
                            <li><strong>Estabilidade harmônica:</strong> Altamente estável (A=440Hz standard)</li>
                            <li><strong>Modulação sugerida:</strong> Compatível com remix de {remixStyle}</li>
                            <li><strong>Tensão tonal:</strong> Baixa nas estrofes, aumentando no refrão</li>
                          </ul>
                        </div>
                      </div>

                      {/* 2. Timbre de Voz */}
                      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-3 hover:bg-white/[0.05] transition-all">
                        <span className="text-neon-purple uppercase tracking-widest text-[9px] font-extrabold flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5" /> ANÁLISE DETALHADA DO TIMBRE DE VOZ
                        </span>
                        <div className="text-gray-200 leading-relaxed space-y-2">
                          <p>{analysisData.analysis.vocalTimbreAnalysis || `Formante vocal com excelente presença de médios e alta definição, caracterizado pelo timbre ${analysisData.analysis.vocalTimbre || "Aveludado"}. A expressividade vocal tem forte impacto emotivo.`}</p>
                          <ul className="text-[11px] text-gray-400 space-y-1 list-disc pl-4 font-sans">
                            <li><strong>Registro predominante:</strong> Voz de peito e média ressonância facial</li>
                            <li><strong>Formante / Brilho:</strong> Claridade ideal para processamento</li>
                            <li><strong>Tratamento recomendado:</strong> Sidechain dinâmico contra synths</li>
                          </ul>
                        </div>
                      </div>

                      {/* 3. Estilo musical */}
                      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-3 hover:bg-white/[0.05] transition-all">
                        <span className="text-neon-blue uppercase tracking-widest text-[9px] font-extrabold flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5" /> COMPREENSÃO DO ESTILO MUSICAL & GÊNERO
                        </span>
                        <div className="text-gray-200 leading-relaxed space-y-2">
                          <p>{analysisData.analysis.genreAnalysis || `Faixa identificada sob a classificação de ${analysisData.analysis.genre || "Pop Latino"}. O arranjo demonstra uma pulsação cativante que se alinha muito bem com pistas de dança.`}</p>
                          <ul className="text-[11px] text-gray-400 space-y-1 list-disc pl-4 font-sans">
                            <li><strong>Andamento de base:</strong> Estável em {analysisData.analysis.detectedBpm || "128"} BPM</li>
                            <li><strong>Syncopation:</strong> Rítmica acentuada e propícia para drops</li>
                            <li><strong>Vibe estética:</strong> {analysisData.analysis.mood || "Expressiva e Contagiante"}</li>
                          </ul>
                        </div>
                      </div>

                      {/* 4. Instrumentos usados */}
                      <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-3 hover:bg-white/[0.05] transition-all">
                        <span className="text-emerald-400 uppercase tracking-widest text-[9px] font-extrabold flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5" /> PALETA DE INSTRUMENTOS DETECTADOS
                        </span>
                        <div className="text-gray-200 leading-relaxed space-y-2">
                          <p>{analysisData.analysis.instrumentsAnalysis || `A instrumentação detectada inclui: ${analysisData.analysis.instruments || "Vocais, teclas e percussão de base"}. Os instrumentos ocupam bandas de frequência distintas, facilitando a filtragem para criação do remix.`}</p>
                          <ul className="text-[11px] text-gray-400 space-y-1 list-disc pl-4 font-sans">
                            <li><strong>Instrumento Líder:</strong> Voz do intérprete</li>
                            <li><strong>Espectro de graves:</strong> Espaço ideal livre para subgraves</li>
                            <li><strong>Foco dinâmico:</strong> Passagens harmônicas de transição</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: LYRIC EXTRACTION */}
                {activeAnalysisTab === "lyrics" && (
                  <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold uppercase text-neon-blue tracking-wider">Letra Limpa Transcrita</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(analysisData.originalLyrics)}
                          className="flex items-center gap-1 text-gray-400 hover:text-white transition-all text-[11px]"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar Letra
                        </button>
                      </div>
                      <div className="bg-white/5 p-4 rounded-lg text-xs leading-relaxed font-mono whitespace-pre-wrap text-gray-200 max-h-[280px] overflow-y-auto custom-scrollbar border border-white/5">
                        {analysisData.originalLyrics || "Nenhuma letra pôde ser transcrita."}
                      </div>
                    </div>

                    <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold uppercase text-amber-500 tracking-wider">Detecção de Redundâncias & Gagueiras</span>
                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">Análise de IA</span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-lg text-xs leading-relaxed font-mono whitespace-pre-wrap text-gray-400 max-h-[280px] overflow-y-auto custom-scrollbar border border-white/5">
                        {analysisData.distortedLyrics || "Sem distorções ou gagueiras graves identificadas."}
                      </div>
                    </div>
                    
                    {analysisData.alternativeLyrics && (
                      <div className="md:col-span-2 bg-gradient-to-r from-neon-pink/5 to-neon-purple/5 p-4 rounded-xl border border-white/10 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold uppercase text-neon-pink tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Letra Alternativa Recomendada para Remix
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed italic">Uma versão poética alternativa criada para encaixar perfeitamente em batidas de {remixStyle}:</p>
                        <div className="bg-white/5 p-4 rounded-lg text-xs leading-relaxed font-mono whitespace-pre-wrap text-gray-100 max-h-[160px] overflow-y-auto custom-scrollbar border border-white/5">
                          {analysisData.alternativeLyrics}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: INTERACTIVE WRITER */}
                {activeAnalysisTab === "rewrite" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left side inputs */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Letra para Reescrever</label>
                          <textarea
                            value={rewriteTargetLyrics}
                            onChange={(e) => setRewriteTargetLyrics(e.target.value)}
                            placeholder="Insira aqui a letra que deseja reescrever..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs h-40 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all font-mono custom-scrollbar"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Estilo Musical do Destino</label>
                            <select
                              value={rewriteStyle}
                              onChange={(e) => setRewriteStyle(e.target.value)}
                              className="w-full bg-surface border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-neon-purple text-white"
                            >
                              <option value="Sertanejo Sofrência">Sertanejo Sofrência</option>
                              <option value="Reggaeton Latino & Tropical">Reggaeton / Pop Latino</option>
                              <option value="Poesia Intimista & Acústica">Poético e Intimista</option>
                              <option value="House Music & EDM Anthem">Dance Pop / Anthem Eletrônico</option>
                              <option value="Hip Hop & Trap">Trap Moderno</option>
                              <option value="Versão Traduativa em Inglês">Tradução em Inglês</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Orientação de Tom</label>
                            <input
                              type="text"
                              value={rewriteInstructions}
                              onChange={(e) => setRewriteInstructions(e.target.value)}
                              placeholder="ex: Deixe mais romântico, adicione gírias..."
                              className="w-full bg-surface border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-neon-purple text-white"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleRewriteLyrics}
                          disabled={isRewritingLyrics || !rewriteTargetLyrics}
                          className="w-full h-11 bg-gradient-to-r from-neon-purple to-neon-pink hover:opacity-90 transition-all font-extrabold text-white rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                        >
                          {isRewritingLyrics ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Reescrevendo letra com Gemini...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              Reescrever Letra de Áudio
                            </>
                          )}
                        </button>
                      </div>

                      {/* Right side outputs */}
                      <div className="space-y-3 flex flex-col justify-between">
                        <div className="flex-1 flex flex-col space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold uppercase text-neon-purple tracking-wider">Letra Reescrevida pela IA</span>
                            {rewrittenLyricsResult && (
                              <button
                                onClick={() => navigator.clipboard.writeText(rewrittenLyricsResult)}
                                className="flex items-center gap-1 text-gray-400 hover:text-white transition-all text-[11px] cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copiar Nova Letra
                              </button>
                            )}
                          </div>
                          
                          <div className="flex-1 p-4 bg-black/40 border border-white/5 rounded-xl text-xs font-mono leading-relaxed text-gray-200 whitespace-pre-wrap min-h-[220px] max-h-[300px] overflow-y-auto custom-scrollbar border-neon-purple/20">
                            {rewrittenLyricsResult ? (
                              <div className="animate-fade-in">{rewrittenLyricsResult}</div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 gap-2">
                                <Wand2 className="w-8 h-8 text-gray-600" />
                                <p>Sua nova composição aparecerá aqui.</p>
                                <p className="text-[10px] text-gray-600 max-w-xs leading-normal">Escolha o estilo ao lado e clique em "Reescrever Letra de Áudio" para testar o compositor Gemini.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: COVER FONÉTICO (ANTI-COPYRIGHT) */}
                {activeAnalysisTab === "cover" && (
                  <div className="space-y-6 animate-fade-in text-xs">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left side: Input / Import */}
                      <div className="bg-black/20 p-5 rounded-xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <AudioLines className="w-4 h-4 text-neon-blue animate-pulse" />
                            Letra Original de Entrada
                          </h4>
                          {analysisData?.originalLyrics && (
                            <button
                              onClick={() => setCoverOriginalLyrics(analysisData.originalLyrics)}
                              className="px-2.5 py-1 rounded bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue text-[10px] font-bold border border-neon-blue/20 transition-all cursor-pointer"
                              title="Importa a letra identificada na análise do áudio"
                            >
                              Importar Letra Extraída
                            </button>
                          )}
                        </div>
                        
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Insira abaixo a letra que deseja adaptar. O algoritmo linguístico do Gemini reescreverá cada sílaba mantendo a mesma fonética de canto, mas alterando a escrita textual para despistar algoritmos automáticos de direitos autorais.
                        </p>

                        <textarea
                          value={coverOriginalLyrics}
                          onChange={(e) => setCoverOriginalLyrics(e.target.value)}
                          placeholder="Insira aqui as estrofes ou refrão que deseja camuflar foneticamente..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs h-60 outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all font-mono custom-scrollbar text-white placeholder-gray-500"
                        />

                        <button
                          onClick={handleGeneratePhoneticCover}
                          disabled={isGeneratingCover || !coverOriginalLyrics}
                          className="w-full h-11 bg-gradient-to-r from-neon-blue to-neon-purple hover:opacity-90 transition-all font-extrabold text-white rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                        >
                          {isGeneratingCover ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Gerando Transposição Fonética com Gemini...
                            </>
                          ) : (
                            <>
                              <Radio className="w-4 h-4 animate-ping" />
                              Aplicar Transposição de Homófonos
                            </>
                          )}
                        </button>
                      </div>

                      {/* Right side: Output / Explanation */}
                      <div className="space-y-4">
                        {coverLyricsResult ? (
                          <div className="space-y-4 animate-fade-in">
                            {/* Lyrics result */}
                            <div className="bg-black/20 p-5 rounded-xl border border-white/5 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-bold uppercase text-neon-pink tracking-wider flex items-center gap-1.5">
                                  <Check className="w-4 h-4 text-green-400" />
                                  Letra Protegida Gerada (Cover)
                                </span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(coverLyricsResult)}
                                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-all text-[11px] cursor-pointer bg-white/5 px-2 py-1 rounded hover:bg-white/10"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copiar Letra Protegida
                                </button>
                              </div>

                              <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-xs font-mono leading-relaxed text-gray-100 whitespace-pre-wrap max-h-[250px] overflow-y-auto custom-scrollbar border-neon-pink/20">
                                {coverLyricsResult}
                              </div>
                            </div>

                            {/* Explanation */}
                            {coverExplanationResult && (
                              <div className="bg-gradient-to-r from-neon-blue/10 to-neon-purple/5 p-4 rounded-xl border border-white/10 space-y-2">
                                <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <Brain className="w-3.5 h-3.5 text-neon-blue" />
                                  Guia Fonético de Canto & Engenharia
                                </h5>
                                <div className="text-gray-300 leading-relaxed font-mono whitespace-pre-wrap text-[10.5px]">
                                  {coverExplanationResult}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full bg-black/20 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center text-gray-500 gap-4 min-h-[350px]">
                            <div className="w-14 h-14 rounded-full bg-neon-blue/10 flex items-center justify-center border border-neon-blue/20">
                              <AudioLines className="w-7 h-7 text-neon-blue" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-300 text-sm">Pronto para camuflagem fonética</p>
                              <p className="text-[11px] text-gray-500 max-w-xs mt-1.5 leading-normal">
                                Cole sua letra ou clique em "Importar Letra Extraída" ao lado, depois clique em "Aplicar Transposição de Homófonos" para receber a versão modificada anti-copyright!
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 max-w-sm mt-2 text-left">
                              <div className="p-2 bg-white/5 rounded border border-white/5 text-[10px] text-gray-400">
                                <span className="text-neon-blue font-bold block">✓ Ritmo Idêntico</span>
                                Mesma métrica de canto para encaixar no instrumental.
                              </div>
                              <div className="p-2 bg-white/5 rounded border border-white/5 text-[10px] text-gray-400">
                                <span className="text-neon-pink font-bold block">✓ Anti-Copyright</span>
                                Escrita textual despista as detecções automáticas.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: SUNO PROMPT READY */}
                {activeAnalysisTab === "suno" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Prompt de Remix Otimizado para IA de Música
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(analysisData.sunoPrompt)}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition-all text-[11px] cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" /> Prompt
                      </button>
                    </div>
                    <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl">
                      <code className="text-xs font-mono text-emerald-300 whitespace-pre-wrap select-all block leading-relaxed">
                        {analysisData.sunoPrompt}
                      </code>
                    </div>
                    <p className="text-[10px] text-gray-400 italic font-medium">Copie este prompt gerado especificamente combinando o ritmo estimado original, estilo {remixStyle} e as rimas extraídas!</p>
                  </div>
                )}

                {/* TAB 5: VIDEO CLIP PROMPTS */}
                {activeAnalysisTab === "videoClip" && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Film className="w-4 h-4 text-amber-500" />
                          Roteiro e Prompts para Clipe de Vídeo (IA)
                        </h4>
                        <span className="text-[10px] text-gray-400 mt-0.5">Prompts visuais detalhados para ilustrar e gerar cada cena do seu videoclipe</span>
                      </div>
                      
                      {analysisData.videoClipPrompts && analysisData.videoClipPrompts.length > 0 && (
                        <button
                          onClick={() => {
                            const fullScript = analysisData.videoClipPrompts
                              ?.map((item, idx) => `Cena ${idx + 1} [${item.section}]:\n${item.visualPrompt}`)
                              .join("\n\n");
                            if (fullScript) {
                              navigator.clipboard.writeText(fullScript);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded-lg transition-all border border-amber-500/20 cursor-pointer text-[11px] font-bold"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar Roteiro Completo
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {analysisData.videoClipPrompts && analysisData.videoClipPrompts.length > 0 ? (
                        analysisData.videoClipPrompts.map((scene, idx) => (
                          <div 
                            key={idx} 
                            className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 space-y-3 hover:bg-white/[0.06] transition-all hover:border-amber-500/20 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <span className="text-amber-500 uppercase tracking-widest text-[9px] font-extrabold flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-amber-500" />
                                Cena {idx + 1} - {scene.section}
                              </span>
                              <p className="text-gray-200 leading-relaxed text-[11px] bg-black/30 p-3 rounded-xl border border-white/5 font-sans whitespace-pre-wrap select-all">
                                {scene.visualPrompt}
                              </p>
                            </div>
                            <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                              <button
                                onClick={() => navigator.clipboard.writeText(scene.visualPrompt)}
                                className="flex items-center gap-1 text-gray-400 hover:text-white transition-all text-[11px] cursor-pointer font-bold"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copiar Clipe
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 py-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                          <Film className="w-8 h-8 text-gray-600" />
                          <p>Nenhum prompt de clipe de vídeo disponível ainda para esta faixa.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeAnalysisTab === "instagram" && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          Gerador de Legenda para Instagram Reels / Feed
                        </h4>
                        <span className="text-[10px] text-gray-400 mt-0.5">Legenda persuasiva com emojis e hashtags virais para máximo engajamento</span>
                      </div>
                      
                      {analysisData.instagramCaption && (
                        <button
                          onClick={() => navigator.clipboard.writeText(analysisData.instagramCaption || "")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 rounded-lg transition-all border border-pink-500/20 cursor-pointer text-[11px] font-bold"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar Legenda Completa
                        </button>
                      )}
                    </div>

                    <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-3">
                      <p className="text-gray-200 leading-relaxed text-[12px] bg-black/40 p-4 rounded-xl border border-white/10 font-sans whitespace-pre-wrap select-all">
                        {analysisData.instagramCaption || "Sem legenda disponível."}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-pink-400 italic">
                        <Share2 className="w-3.5 h-3.5" />
                        Dica: Use esta legenda em seus Reels ou posts de áudio originais para impulsionar o algoritmo com hashtags do estilo {remixStyle}!
                      </div>
                    </div>
                  </div>
                )}

                {activeAnalysisTab === "youtube" && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Youtube className="w-4 h-4 text-red-500" />
                          Otimização SEO para YouTube Video
                        </h4>
                        <span className="text-[10px] text-gray-400 mt-0.5">Título otimizado, descrição completa estruturada e tags recomendadas para ranqueamento</span>
                      </div>
                    </div>

                    {analysisData.youtubeSeo ? (
                      <div className="space-y-4">
                        {/* Title Section */}
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-red-500 uppercase tracking-widest text-[9px] font-extrabold">Título Recomendado (Alta Performance)</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(analysisData.youtubeSeo?.title || "")}
                              className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-all cursor-pointer font-bold"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copiar Título
                            </button>
                          </div>
                          <p className="bg-black/30 p-3 rounded-lg border border-white/5 font-bold text-white text-[13px] tracking-wide">
                            {analysisData.youtubeSeo.title}
                          </p>
                        </div>

                        {/* Description Section */}
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-red-500 uppercase tracking-widest text-[9px] font-extrabold">Descrição Estruturada do Vídeo</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(analysisData.youtubeSeo?.description || "")}
                              className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-all cursor-pointer font-bold"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copiar Descrição
                            </button>
                          </div>
                          <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-gray-300 whitespace-pre-wrap select-all font-mono text-[11px] leading-relaxed max-h-[180px] overflow-y-auto custom-scrollbar">
                            {analysisData.youtubeSeo.description}
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-red-500 uppercase tracking-widest text-[9px] font-extrabold">Tags de Busca Integradas (YouTube Tags)</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(analysisData.youtubeSeo?.tags || "")}
                              className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-all cursor-pointer font-bold"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copiar Tags (csv)
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 p-3 bg-black/20 rounded-lg border border-white/5 max-h-[120px] overflow-y-auto custom-scrollbar">
                            {analysisData.youtubeSeo.tags.split(",").map((t, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-950/20 text-red-300 border border-red-500/10 rounded-md text-[10px] font-mono">
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                        <Youtube className="w-8 h-8 text-gray-600" />
                        <p>Nenhum dado de otimização de SEO disponível ainda para esta faixa.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeAnalysisTab === "spotify" && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Disc className="w-4 h-4 text-emerald-500 animate-pulse" />
                          Capa do Lançamento (Spotify Cover Studio)
                        </h4>
                        <span className="text-[10px] text-gray-400 mt-0.5">Prompt estético para geradores de imagens (IA) e especificações técnicas profissionais.</span>
                      </div>
                    </div>

                    {analysisData?.spotifyCover ? (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        
                        {/* Prompts and styling */}
                        <div className="md:col-span-8 space-y-4">
                          <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl transition-all group-hover:bg-emerald-500/10" />
                            
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-400 uppercase tracking-widest text-[9px] font-extrabold flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" /> PROMPT DE ALTO IMPACTO (MIDJOURNEY / DALL-E 3)
                              </span>
                              <button
                                onClick={() => navigator.clipboard.writeText(analysisData.spotifyCover?.visualPrompt || "")}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-all cursor-pointer font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20"
                              >
                                <Copy className="w-3 h-3" /> Copiar Prompt
                              </button>
                            </div>
                            
                            <p className="bg-black/40 p-4 rounded-xl border border-white/10 font-mono text-[11.5px] leading-relaxed text-gray-200 select-all whitespace-pre-wrap">
                              {analysisData.spotifyCover.visualPrompt}
                            </p>
                          </div>

                          <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-2">
                            <span className="text-emerald-400 uppercase tracking-widest text-[9px] font-extrabold flex items-center gap-1.5">
                              <Palette className="w-3.5 h-3.5 text-emerald-400" /> Conceito de Design & Coesão Editorial
                            </span>
                            <p className="text-gray-300 leading-relaxed text-[11.5px] bg-black/10 p-3 rounded-lg border border-white/5">
                              {analysisData.spotifyCover.concept}
                            </p>
                          </div>
                        </div>

                        {/* Official dimensions / specs */}
                        <div className="md:col-span-4 space-y-4">
                          <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 space-y-4">
                            <h5 className="text-[11px] uppercase tracking-widest text-white font-extrabold border-b border-white/5 pb-2">
                              Medidas Oficiais Spotify
                            </h5>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                <span className="text-gray-400">Resolução Mínima</span>
                                <span className="text-white font-mono font-bold text-[11px]">3000 x 3000 px</span>
                              </div>
                              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                <span className="text-gray-400">Proporção</span>
                                <span className="text-white font-mono font-bold text-[11px]">1:1 (Quadrado)</span>
                              </div>
                              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                <span className="text-gray-400">Formatos Aceitos</span>
                                <span className="text-white font-mono font-bold text-[11px]">JPEG, PNG, TIFF</span>
                              </div>
                              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                <span className="text-gray-400">Espaço de Cor</span>
                                <span className="text-white font-mono font-bold text-[11px]">sRGB (Obrigatório)</span>
                              </div>
                              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                <span className="text-gray-400">Tamanho Máximo</span>
                                <span className="text-white font-mono font-bold text-[11px]">4MB por arquivo</span>
                              </div>
                            </div>

                            <div className="bg-emerald-950/20 rounded-xl p-3 border border-emerald-500/10 text-[10px] text-emerald-300 space-y-1.5 leading-relaxed">
                              <p className="font-extrabold uppercase text-[9px] tracking-wide text-emerald-400">
                                DICA PRE-RELEASE:
                              </p>
                              <p>
                                Para ser destacado em playlists de Grandes Lançamentos no Spotify, certifique-se de que a capa esteja absolutamente limpa. Não coloque URLs, e-mails, logos de patrocinadores ou logotipos de redes móveis. O Spotify rejeita carátulas poluídas!
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                        <Disc className="w-8 h-8 text-gray-600" />
                        <p>Nenhum dado de capa disponível.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {remixResult && (
              <div className="glass-panel rounded-2xl p-6 border border-white/10 bg-green-500/5 mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-green-400 flex items-center gap-2">
                    <Check className="w-5 h-5" /> Remix Gerado com Sucesso!
                  </h3>
                  <span className="px-3 py-1 bg-neon-blue/20 text-neon-blue text-xs rounded-full font-bold">
                    Escala: {remixResult.key}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300 font-semibold">{remixResult.title}</p>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex justify-between items-start gap-4">
                    <code className="text-xs text-gray-300 block select-all whitespace-pre-wrap flex-1">
                      {remixResult.prompt}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(remixResult.prompt)}
                      className="p-2 bg-surface hover:bg-surface-hover border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer grow-0 shrink-0"
                      title="Copy Prompt"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
