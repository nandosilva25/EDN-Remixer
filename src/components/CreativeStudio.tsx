import React, { useState } from "react";
import { Sparkles, Loader2, PenTool, BookOpen, Heart, Users, Target, Music, HelpCircle } from "lucide-react";
import { cn } from "../lib/utils";

const LENGTHS = ["Curta", "Média", "Longa"];
const LANGUAGES = ["Português", "Inglês", "Espanhol"];

const PORTUGUESE_ACCENTS = [
  "Sem sotaque específico",
  "Nordestino",
  "Sertanejo / Caipira",
  "Carioca (Rio de Janeiro)",
  "Paulista (São Paulo)",
  "Gaúcho (Sul do Brasil)",
  "Mineiro (Minas Gerais)",
  "Português de Portugal"
];

const ARTIST_STYLES = [
  "Nenhum (Estilo Próprio)",
  "Coldplay (Arena Pop/Rock Atmosférico)",
  "Billie Eilish (Dark Pop / Intimista)",
  "Alok (Slap House Comercial)",
  "Daft Punk (French Touch / Synthpop)",
  "Jorge & Mateus (Sertanejo Universitário)",
  "Caetano Veloso / Gilberto Gil (MPB Clássico)",
  "Taylor Swift (Folk Pop Narrativo)",
  "The Weeknd (Dark R&B / Synthwave)",
  "Travis Scott (Trap Psicodélico)",
  "Hillsong Worship (Worship Moderno/Atmosférico)",
  "Fernandinho / Harpa Cristã (Gospel Pentecostal tradicional)",
  "Gabriela Rocha (Worship de Grande Impacto Vocal)",
  "Adolfinho / Wesley Safadão (Forró Estilizado)"
];

const VOCAL_TIMBRES = [
  "Padrão do estilo",
  "Voz Feminina (Suave & Sussurrada)",
  "Voz Feminina (Poderosa & Soul)",
  "Voz Masculina (Suave & Intimista)",
  "Voz Masculina (Enérgica & Drive)",
  "Dueto (Voz Masculina e Feminina)",
  "Coro Coletivo / Congregacional",
  "Vocais Eteriais / Angelical (Choir)",
  "Sem vocais (Instrumental puro)"
];

const EDM_STYLES = [
  "Afro House", "Afro/Organic House", "Big Room House", "Deep House", "Deep House Latino", "House Latino", "Tech House", "Tech House Latino", "Slap House",
  "Melodic Techno", "Hard Techno", "Trance", "Progressive Trance", "Psytrance",
  "Dubstep", "Riddim Dubstep", "Future Bass", "Drum & Bass", "Hardstyle",
  "Synthwave", "Forró Nordestino", "Dub", "Progressive House", "Minimal", "MPB",
];

const JAZZ_STYLES = [
  "Jazz Noir Tradicional",
  "Jazz Corporativo Anos 90",
  "Lofi Chuvoso Melancólico"
];

const BLUES_STYLES = [
  "Delta Blues Tradicional",
  "Chicago Blues Elétrico",
  "Soul Blues Melódico"
];

const AFRO_CINEMATIC_STYLES = [
  "Cinematic Organic Afro House"
];

const ALL_GENERAL_STYLES = [...EDM_STYLES, ...JAZZ_STYLES, ...BLUES_STYLES, ...AFRO_CINEMATIC_STYLES];

const GOSPEL_STYLES = [
  "Worship / Adoração",
  "Gospel Pentecostal",
  "Gospel Pop / Rock",
  "Gospel Sertanejo / Universitário",
  "Gospel MPB / Acústico",
  "Gospel Black Music / Soul",
  "Gospel Reggae"
];

// Gospel Suggestions
const GOSPEL_EMOTION_SUGGESTIONS = [
  "fé em meio à dor",
  "superação",
  "gratidão",
  "esperança",
  "confiança inabalável"
];

const GOSPEL_THEME_SUGGESTIONS = [
  "batalha espiritual",
  "renovação",
  "vitória",
  "milagre e promessa",
  "intimidade profunda"
];

const GOSPEL_AUDIENCE_SUGGESTIONS = [
  "cristãos em momento difícil",
  "jovens buscando direção",
  "pessoas feridas e cansadas",
  "igreja unida em adoração"
];

// General Suggestions (as requested by user)
const GENERAL_EMOTION_SUGGESTIONS = [
  "superação",
  "melancolia",
  "euforia",
  "paz",
  "raiva",
  "saudade"
];

const GENERAL_THEME_SUGGESTIONS = [
  "desafios",
  "amor perdido",
  "conquista",
  "solidão",
  "recomeço",
  "liberdade"
];

const GENERAL_AUDIENCE_SUGGESTIONS = [
  "jovens sonhadores",
  "quem acabou de terminar",
  "baladeiros da noite",
  "pessoas buscando paz",
  "público apaixonado"
];

const GENERAL_TONE_SUGGESTIONS = [
  "melancólico e intimista",
  "radiante e festivo",
  "misterioso e sensual",
  "explosivo e rebelde",
  "sereno e contemplativo"
];

interface CreativeStudioProps {
  onGenerate: (data: { 
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
  }) => Promise<void>;
  isGenerating: boolean;
  generatedSong?: { title: string; lyrics: string; prompt: string } | null;
  error?: string | null;
}

export function CreativeStudio({ onGenerate, isGenerating, generatedSong, error }: CreativeStudioProps) {
  const [activeTab, setActiveTab] = useState<"general" | "gospel">("general");
  
  // General State
  const [generalEmotion, setGeneralEmotion] = useState("");
  const [generalTheme, setGeneralTheme] = useState("");
  const [generalAudience, setGeneralAudience] = useState("");
  const [generalTone, setGeneralTone] = useState("");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [accent, setAccent] = useState(PORTUGUESE_ACCENTS[0]);
  
  // Gospel State
  const [gospelEmotion, setGospelEmotion] = useState("");
  const [gospelTheme, setGospelTheme] = useState("");
  const [gospelAudience, setGospelAudience] = useState("");

  // Common State
  const [vocalTimbre, setVocalTimbre] = useState(VOCAL_TIMBRES[0]);
  const [artistStyle, setArtistStyle] = useState(ARTIST_STYLES[0]);
  const [customArtist, setCustomArtist] = useState("");
  const [style, setStyle] = useState(EDM_STYLES[0]);
  const [bpm, setBpm] = useState(128);
  const [length, setLength] = useState(LENGTHS[1]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fusion State
  const [isFusionEnabled, setIsFusionEnabled] = useState(false);
  const [secondaryStyle, setSecondaryStyle] = useState("");
  const [fusionRatio, setFusionRatio] = useState(50);

  const handleTabChange = (tab: "general" | "gospel") => {
    setActiveTab(tab);
    setValidationError(null);
    setIsFusionEnabled(false);
    setSecondaryStyle("");
    if (tab === "gospel") {
      setStyle(GOSPEL_STYLES[0]);
      setBpm(110);
    } else {
      setStyle(EDM_STYLES[0]);
      setBpm(128);
    }
  };

  const handleCreate = () => {
    if (activeTab === "general") {
      if (!generalEmotion.trim() && !generalTheme.trim() && !generalAudience.trim() && !generalTone.trim()) {
        setValidationError("Por favor, preencha pelo menos um dos campos para a composição!");
        return;
      }
      setValidationError(null);
      
      const synthesisedIdea = `Composição Geral - Gênero: ${style}${isFusionEnabled && secondaryStyle ? ` fundido com ${secondaryStyle} (${fusionRatio}%)` : ""}, Emoção: ${generalEmotion || "Nostalgia"}, Tema: ${generalTheme || "Caminhos"}, Público: ${generalAudience || "Amplo"}, Tom: ${generalTone || "Poético"}`;
      
      onGenerate({ 
        idea: synthesisedIdea, 
        mood: generalTone || "Inspirador", 
        style, 
        bpm, 
        language, 
        length,
        isGospelMode: false,
        centralEmotion: generalEmotion || "superação",
        songTheme: generalTheme || "desafios",
        targetAudience: generalAudience || "jovens sonhadores",
        generalTone: generalTone || "vibrante",
        accent: language === "Português" ? accent : undefined,
        vocalTimbre,
        artistStyle,
        customArtist: customArtist.trim() || undefined,
        secondaryStyle: isFusionEnabled && secondaryStyle ? secondaryStyle : undefined,
        fusionRatio: isFusionEnabled ? fusionRatio : undefined
      });
    } else {
      if (!gospelEmotion.trim() && !gospelTheme.trim() && !gospelAudience.trim()) {
        setValidationError("Por favor, defina pelo menos um dos campos da composição Gospel!");
        return;
      }
      setValidationError(null);
      
      const synthesisedIdea = `Gospel Especialista - Gênero: ${style}${isFusionEnabled && secondaryStyle ? ` fundido com ${secondaryStyle} (${fusionRatio}%)` : ""}, Emoção: ${gospelEmotion || "Fé"}, Tema: ${gospelTheme || "Renovação"}, Público: ${gospelAudience || "Geral"}`;
      
      onGenerate({
        idea: synthesisedIdea,
        mood: "Gospel Emocional",
        style,
        bpm,
        language: "Português",
        length,
        isGospelMode: true,
        centralEmotion: gospelEmotion || "fé em meio à dor",
        songTheme: gospelTheme || "renovação",
        targetAudience: gospelAudience || "cristãos que estão passando por um momento difícil",
        accent: accent,
        vocalTimbre,
        artistStyle,
        customArtist: customArtist.trim() || undefined,
        secondaryStyle: isFusionEnabled && secondaryStyle ? secondaryStyle : undefined,
        fusionRatio: isFusionEnabled ? fusionRatio : undefined
      });
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-8 border border-white/10 flex flex-col gap-6" id="creative-studio-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-neon-blue/20 rounded-xl">
            <PenTool className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Creative Studio</h2>
            <p className="text-xs text-gray-400">Gere composições musicais de nível profissional com IA</p>
          </div>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
        <button
          id="btn-general-tab"
          onClick={() => handleTabChange("general")}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "general"
              ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <PenTool className="w-4 h-4" />
          Composição Geral
        </button>
        <button
          id="btn-gospel-tab"
          onClick={() => handleTabChange("gospel")}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "gospel"
              ? "bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <BookOpen className="w-4 h-4 text-neon-pink" />
          Especialista Gospel 🇧🇷
        </button>
      </div>

      {(validationError || error) && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-pulse" id="creative-studio-error">
          ⚠️ {validationError || error}
        </div>
      )}

      {generatedSong && (
        <div className="p-5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm space-y-4" id="creative-studio-result">
          <p className="font-extrabold text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-purple" />
            {generatedSong.title}
          </p>
          <div className="bg-black/20 p-4 rounded-lg border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
            <p className="text-gray-400 font-semibold mb-2 border-b border-white/10 pb-1 text-xs">Letra Composta:</p>
            <pre className="text-xs whitespace-pre-wrap font-sans text-gray-200 leading-relaxed">{generatedSong.lyrics}</pre>
          </div>
          <div>
            <p className="text-gray-400 font-semibold mb-1 text-xs">Prompt de Production Sonorizada (Suno / Lyria):</p>
            <p className="text-xs text-gray-300 italic bg-black/10 p-2.5 rounded border border-white/5">{generatedSong.prompt}</p>
          </div>
        </div>
      )}

      {/* Mode Renderings */}
      {activeTab === "general" ? (
        <div className="space-y-5 animate-fade-in" id="general-mode-form">
          <div className="bg-neon-blue/5 p-4 rounded-xl border border-neon-blue/20 space-y-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-neon-blue uppercase">Compositor de Elite Geral</span>
            <p className="text-xs text-gray-300 leading-relaxed">
              Compositor treinado com foco em retenção máxima e conexão emocional. Sua letra será estruturada com rimas envolventes, ganchos magnéticos, e transições épicas adaptadas para o seu gênero.
            </p>
          </div>

          {/* Campo 1: Emoção Central */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5" id="label-general-emotion">
              <Heart className="w-4 h-4 text-neon-pink" />
              Emoção Central
            </label>
            <input
              type="text"
              id="input-general-emotion"
              value={generalEmotion}
              onChange={(e) => {
                setGeneralEmotion(e.target.value);
                if (e.target.value.trim()) setValidationError(null);
              }}
              placeholder="ex: superação, melancolia, euforia, paz, raiva"
              className="w-full bg-surface border border-white/10 rounded-lg h-11 px-4 text-sm outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-white placeholder-gray-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GENERAL_EMOTION_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGeneralEmotion(suggestion)}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-neon-blue/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 2: Tema da Música */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5" id="label-general-theme">
              <Music className="w-4 h-4 text-neon-blue" />
              Tema da Música
            </label>
            <input
              type="text"
              id="input-general-theme"
              value={generalTheme}
              onChange={(e) => {
                setGeneralTheme(e.target.value);
                if (e.target.value.trim()) setValidationError(null);
              }}
              placeholder="ex: desafios, amor perdido, conquista, solidão"
              className="w-full bg-surface border border-white/10 rounded-lg h-11 px-4 text-sm outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-white placeholder-gray-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GENERAL_THEME_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGeneralTheme(suggestion)}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-neon-blue/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 3: Público */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5" id="label-general-audience">
              <Users className="w-4 h-4 text-neon-purple" />
              Público-Alvo
            </label>
            <input
              type="text"
              id="input-general-audience"
              value={generalAudience}
              onChange={(e) => {
                setGeneralAudience(e.target.value);
                if (e.target.value.trim()) setValidationError(null);
              }}
              placeholder="ex: jovens sonhadores, pessoas superando desafios"
              className="w-full bg-surface border border-white/10 rounded-lg h-11 px-4 text-sm outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-white placeholder-gray-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GENERAL_AUDIENCE_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGeneralAudience(suggestion)}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-neon-blue/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 4: Tom Geral */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5" id="label-general-tone">
              <Target className="w-4 h-4 text-neon-pink" />
              Tom Geral / Clima
            </label>
            <input
              type="text"
              id="input-general-tone"
              value={generalTone}
              onChange={(e) => {
                setGeneralTone(e.target.value);
                if (e.target.value.trim()) setValidationError(null);
              }}
              placeholder="ex: melancólico e intimista, radiante e festivo, explosivo e rebelde"
              className="w-full bg-surface border border-white/10 rounded-lg h-11 px-4 text-sm outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-white placeholder-gray-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GENERAL_TONE_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGeneralTone(suggestion)}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-neon-blue/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 animate-fade-in" id="gospel-mode-form">
          {/* Gospel Composer Fields */}
          <div className="bg-neon-purple/5 p-4 rounded-xl border border-neon-purple/20 space-y-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-neon-pink uppercase">Compositor Gospel Especialista</span>
            <p className="text-xs text-gray-300 leading-relaxed">
              Compositor treinado com foco em conexão profunda, retenção do ouvinte e impacto emocional. A letra será estruturada perfeitamente com ganchos, métrica impecável e pontes de transformação.
            </p>
          </div>

          {/* Campo 1: Emoção Central */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5" id="label-gospel-emotion">
              <Heart className="w-4 h-4 text-neon-pink" />
              Emoção Central
            </label>
            <input
              type="text"
              id="input-gospel-emotion"
              value={gospelEmotion}
              onChange={(e) => {
                setGospelEmotion(e.target.value);
                if (e.target.value.trim()) setValidationError(null);
              }}
              placeholder="ex: fé em meio à dor, superação, profunda gratidão"
              className="w-full bg-surface border border-white/10 rounded-lg h-11 px-4 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white placeholder-gray-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GOSPEL_EMOTION_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGospelEmotion(suggestion)}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-neon-purple/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 2: Tema da Música */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5" id="label-gospel-theme">
              <Music className="w-4 h-4 text-neon-blue" />
              Tema da Música
            </label>
            <input
              type="text"
              id="input-gospel-theme"
              value={gospelTheme}
              onChange={(e) => {
                setGospelTheme(e.target.value);
                if (e.target.value.trim()) setValidationError(null);
              }}
              placeholder="ex: batalha espiritual, renovação, cura, promessa"
              className="w-full bg-surface border border-white/10 rounded-lg h-11 px-4 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white placeholder-gray-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GOSPEL_THEME_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGospelTheme(suggestion)}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-neon-purple/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Campo 3: Público */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5" id="label-gospel-audience">
              <Users className="w-4 h-4 text-neon-purple" />
              Público-Alvo
            </label>
            <input
              type="text"
              id="input-gospel-audience"
              value={gospelAudience}
              onChange={(e) => {
                setGospelAudience(e.target.value);
                if (e.target.value.trim()) setValidationError(null);
              }}
              placeholder="ex: cristãos que estão passando por um momento difícil"
              className="w-full bg-surface border border-white/10 rounded-lg h-11 px-4 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white placeholder-gray-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {GOSPEL_AUDIENCE_SUGGESTIONS.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setGospelAudience(suggestion)}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 hover:text-white hover:border-neon-purple/40 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Production & Layout parameters */}
      <div className="border-t border-white/5 pt-5 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300" id="label-style">Estilo Musical</label>
          <select 
            id="select-style"
            value={style} 
            onChange={(e) => {
              const newStyle = e.target.value;
              setStyle(newStyle);
              
              // Set dynamic BPM for Jazz & Blues styles
              if (newStyle === "Jazz Noir Tradicional") {
                setBpm(68);
              } else if (newStyle === "Jazz Corporativo Anos 90") {
                setBpm(72);
              } else if (newStyle === "Lofi Chuvoso Melancólico") {
                setBpm(65);
              } else if (newStyle === "Delta Blues Tradicional") {
                setBpm(70);
              } else if (newStyle === "Chicago Blues Elétrico") {
                setBpm(92);
              } else if (newStyle === "Soul Blues Melódico") {
                setBpm(75);
              } else if (newStyle === "Cinematic Organic Afro House") {
                setBpm(124);
              } else if (activeTab === "general" && bpm < 90) {
                setBpm(128); // standard default
              }

              if (secondaryStyle === newStyle) {
                const available = activeTab === "general" ? ALL_GENERAL_STYLES : GOSPEL_STYLES;
                const nextAvailable = available.find(s => s !== newStyle) || "";
                setSecondaryStyle(nextAvailable);
              }
            }}
            className="w-full bg-surface border border-white/10 rounded-lg h-10 px-3 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white transition-all appearance-none cursor-pointer"
          >
            {activeTab === "general" ? (
              <>
                <optgroup label="Eletrônica & Outros" className="bg-surface text-gray-400">
                  {EDM_STYLES.map(s => <option key={s} value={s} className="text-white">{s}</option>)}
                </optgroup>
                <optgroup label="Jazz & Lofi" className="bg-surface text-neon-blue font-bold">
                  {JAZZ_STYLES.map(s => <option key={s} value={s} className="text-white font-medium">{s}</option>)}
                </optgroup>
                <optgroup label="Blues (Novos)" className="bg-surface text-neon-blue font-bold">
                  {BLUES_STYLES.map(s => <option key={s} value={s} className="text-white font-medium">{s}</option>)}
                </optgroup>
                <optgroup label="Cinematic & Afro House" className="bg-surface text-neon-blue font-bold">
                  {AFRO_CINEMATIC_STYLES.map(s => <option key={s} value={s} className="text-white font-medium">{s}</option>)}
                </optgroup>
              </>
            ) : (
              GOSPEL_STYLES.map(s => <option key={s} value={s}>{s}</option>)
            )}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex justify-between items-center" id="label-bpm">
            <span>BPM</span>
            <span className="text-xs font-bold text-neon-blue">{bpm}</span>
          </label>
          <input 
            type="range" 
            id="input-bpm"
            min={activeTab === "gospel" || JAZZ_STYLES.includes(style) || BLUES_STYLES.includes(style) ? "60" : "90"} 
            max={activeTab === "gospel" ? "160" : "200"} 
            step="1"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-neon-blue h-2 bg-surface rounded-full outline-none mt-2"
          />
        </div>

        {/* FUSÃO DE ESTILOS */}
        <div className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 space-y-3" id="style-fusion-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neon-blue animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Ativar Fusão de Estilos Musicais</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" id="label-fusion-toggle">
              <input 
                type="checkbox" 
                id="checkbox-fusion-toggle"
                checked={isFusionEnabled} 
                onChange={(e) => {
                  setIsFusionEnabled(e.target.checked);
                  if (e.target.checked && !secondaryStyle) {
                    const defaultSecondary = activeTab === "general" 
                      ? (ALL_GENERAL_STYLES[1] === style ? ALL_GENERAL_STYLES[0] : ALL_GENERAL_STYLES[1])
                      : (GOSPEL_STYLES[1] === style ? GOSPEL_STYLES[0] : GOSPEL_STYLES[1]);
                    setSecondaryStyle(defaultSecondary);
                  }
                }}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neon-blue"></div>
            </label>
          </div>

          {isFusionEnabled && (
            <div className="space-y-4 pt-3 border-t border-white/5 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-4" id="style-fusion-details">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400" id="label-secondary-style">Estilo Musical Secundário</label>
                <select 
                  id="select-secondary-style"
                  value={secondaryStyle} 
                  onChange={(e) => setSecondaryStyle(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-lg h-9 px-3 text-xs outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue text-white transition-all appearance-none cursor-pointer"
                >
                  {activeTab === "general" 
                    ? ALL_GENERAL_STYLES.filter(s => s !== style).map(s => <option key={s} value={s}>{s}</option>)
                    : GOSPEL_STYLES.filter(s => s !== style).map(s => <option key={s} value={s}>{s}</option>)
                  }
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-gray-400" id="label-fusion-ratio">Proporção da Fusão</label>
                  <span className="text-[10px] font-bold text-neon-pink" id="span-fusion-ratio-value">
                    {fusionRatio}% {style} / {100 - fusionRatio}% {secondaryStyle || "Secundário"}
                  </span>
                </div>
                <input 
                  type="range" 
                  id="input-fusion-ratio"
                  min="10" 
                  max="90" 
                  step="5"
                  value={fusionRatio}
                  onChange={(e) => setFusionRatio(Number(e.target.value))}
                  className="w-full accent-neon-pink h-2 bg-surface rounded-full outline-none mt-2"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center justify-between gap-1.5" id="label-vocal-timbre">
            <span>Timbre Vocal 🎙️</span>
            <div className="group relative inline-block">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors cursor-help" id="help-vocal-timbre" />
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-3 bg-[#0a0910] border border-white/10 rounded-lg text-[11px] leading-relaxed text-gray-300 shadow-2xl z-50 pointer-events-none text-left font-normal normal-case">
                <span className="font-bold text-neon-blue block mb-1">Impacto no Prompt:</span>
                Insere tags de voz em inglês (como <span className="font-mono text-white">soft female</span> ou <span className="font-mono text-white">church choir</span>) no prompt técnico enviado ao Suno AI para definir o estilo vocal.
                <div className="absolute top-full right-1.5 border-4 border-transparent border-t-[#0a0910]"></div>
              </div>
            </div>
          </label>
          <select 
            id="select-vocal-timbre"
            value={vocalTimbre} 
            onChange={(e) => setVocalTimbre(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-lg h-10 px-3 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white transition-all appearance-none cursor-pointer"
          >
            {VOCAL_TIMBRES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center justify-between gap-1.5" id="label-artist-style">
            <span>Influência de Artista 🌟</span>
            <div className="group relative inline-block">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors cursor-help" id="help-artist-style" />
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-3 bg-[#0a0910] border border-white/10 rounded-lg text-[11px] leading-relaxed text-gray-300 shadow-2xl z-50 pointer-events-none text-left font-normal normal-case">
                <span className="font-bold text-neon-pink block mb-1">Impacto no Prompt:</span>
                Modifica a cadência poética, o vocabulário e acrescenta assinaturas estéticas e instrumentais do artista selecionado nas tags de engenharia sonora do Suno AI.
                <div className="absolute top-full right-1.5 border-4 border-transparent border-t-[#0a0910]"></div>
              </div>
            </div>
          </label>
          <select 
            id="select-artist-style"
            value={artistStyle} 
            onChange={(e) => setArtistStyle(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-lg h-10 px-3 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white transition-all appearance-none cursor-pointer"
          >
            {ARTIST_STYLES.map(art => <option key={art} value={art}>{art}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center justify-between gap-1.5" id="label-custom-artist">
            <span>Artista de Inspiração (Personalizado) ✍️</span>
            <div className="group relative inline-block">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors cursor-help" id="help-custom-artist" />
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-3 bg-[#0a0910] border border-white/10 rounded-lg text-[11px] leading-relaxed text-gray-300 shadow-2xl z-50 pointer-events-none text-left font-normal normal-case">
                <span className="font-bold text-neon-blue block mb-1">Impacto na Composição:</span>
                Digite qualquer nome de artista (ex: Roberto Carlos, Metallica, Anitta). A IA adaptará o lirismo, o ritmo e o vocabulário para mimetizar o estilo desse artista de forma única.
                <div className="absolute top-full right-1.5 border-4 border-transparent border-t-[#0a0910]"></div>
              </div>
            </div>
          </label>
          <input 
            type="text"
            id="input-custom-artist"
            value={customArtist}
            onChange={(e) => setCustomArtist(e.target.value)}
            placeholder="Ex: Legião Urbana, Marília Mendonça, Queen..."
            className="w-full bg-surface border border-white/10 rounded-lg h-10 px-3 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white transition-all placeholder:text-gray-500"
          />
        </div>

        {activeTab === "general" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300" id="label-language">Idioma</label>
            <select 
              id="select-language"
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg h-10 px-3 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white transition-all appearance-none cursor-pointer"
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}

        {((activeTab === "general" && language === "Português") || activeTab === "gospel") && (
          <div className="space-y-2 animate-fade-in" id="sotaque-container">
            <label className="text-sm font-medium text-gray-300 flex items-center justify-between gap-1.5" id="label-accent">
              <span>Sotaque / Expressão 🇧🇷</span>
              <div className="group relative inline-block">
                <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-white transition-colors cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-3 bg-[#0a0910] border border-white/10 rounded-lg text-[11px] leading-relaxed text-gray-300 shadow-2xl z-50 pointer-events-none text-left font-normal normal-case">
                  <span className="font-bold text-neon-purple block mb-1">Impacto na Letra:</span>
                  Instrui o compositor Gemini a infundir gírias regionais, cadências poéticas e expressões típicas da região selecionada na estrutura dos versos criados.
                  <div className="absolute top-full right-1.5 border-4 border-transparent border-t-[#0a0910]"></div>
                </div>
              </div>
            </label>
            <select 
              id="select-accent"
              value={accent} 
              onChange={(e) => setAccent(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg h-10 px-3 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white transition-all appearance-none cursor-pointer"
            >
              {PORTUGUESE_ACCENTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
            </select>
          </div>
        )}

        <div className={cn(
          "space-y-2", 
          !(activeTab === "general" && language === "Português") ? "col-span-2" : ""
        )}>
          <label className="text-sm font-medium text-gray-300" id="label-length">Tamanho da Letra</label>
          <select 
            id="select-length"
            value={length} 
            onChange={(e) => setLength(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-lg h-10 px-3 text-sm outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple text-white transition-all appearance-none cursor-pointer"
          >
            {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <button 
        id="btn-compose-song"
        onClick={handleCreate}
        disabled={isGenerating}
        className="w-full h-14 rounded-xl bg-gradient-to-r from-neon-blue to-neon-purple text-white font-extrabold hover:opacity-90 hover:scale-[1.01] active:scale-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-neon-blue/10"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" id="compose-loader" />
            Compondo Nova Obra...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 text-neon-pink" id="compose-sparkles" />
            Compor Obra de Arte
          </>
        )}
      </button>
    </div>
  );
}
