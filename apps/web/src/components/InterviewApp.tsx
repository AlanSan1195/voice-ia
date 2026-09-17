import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  FileText,
  History,
  Mic,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";

type Stage = "prepare" | "interview" | "results";
type Provider = "groq" | "cerebras";
type EnglishLevel = "A1" | "A2" | "B1" | "B2";
type TtsProvider = "loading" | "streaming" | "system" | "off";
type TurnEvaluation = {
  levelScore: number;
  jobReadinessScore: number;
  englishScore: number;
  technicalScore: number;
  relevanceScore: number;
  structureScore: number;
  observedEnglishLevel: EnglishLevel;
  feedback: string;
  strengths: string[];
  priorityImprovement: string;
  correctedAnswer: string;
  nextLevelAnswer: string;
};
type Turn = {
  question: string;
  answer: string;
  transcript?: string;
  evaluation?: TurnEvaluation;
};
type Profile = { role: string; summary: string; focusAreas: string[] };
type Feedback = {
  overallScore: number;
  levelScore: number;
  jobReadinessScore: number;
  englishLevel: EnglishLevel;
  dimensionAverages: {
    english: number;
    technical: number;
    relevance: number;
    structure: number;
  };
  summary: string;
  strengths: { label: string; description: string }[];
  gaps: { label: string; description: string }[];
  recommendations: { label: string; description: string }[];
  turnReviews: {
    turnIndex: number;
    levelScore: number;
    jobReadinessScore: number;
    feedback: string;
    correctedAnswer: string;
  }[];
};
type Session = {
  id: string;
  createdAt: string;
  profile: Profile;
  turns: Turn[];
  englishLevel?: EnglishLevel;
  feedback?: Feedback;
};
type StartResponse = {
  profile: Profile;
  question: { index: number; text: string };
  totalQuestions: number;
  provider: Provider;
};

const API = import.meta.env.PUBLIC_API_URL || "http://localhost:3001";
const HISTORY_KEY = "vera-interview-history-v2";
const LEGACY_HISTORY_KEY = "vera-interview-history-v1";
async function api<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 60_000,
): Promise<T> {
  const controller = new AbortController();
  const parentSignal = options.signal;
  const onAbort = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", onAbort, { once: true });
  const timer = window.setTimeout(
    () => controller.abort(new Error("Request timeout")),
    timeoutMs,
  );
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } finally {
    window.clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onAbort);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        "No se pudo conectar con la API.",
    );
  return payload as T;
}

function normalizeScore(value: unknown, fallback = 5) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(10, value > 10 ? value / 10 : value));
}
function migrateEvaluation(
  value: any,
  level: EnglishLevel,
): TurnEvaluation | undefined {
  if (!value) return undefined;
  if (typeof value.levelScore === "number") return value as TurnEvaluation;
  const score = normalizeScore(value.score);
  return {
    levelScore: score,
    jobReadinessScore: score,
    englishScore: score,
    technicalScore: score,
    relevanceScore: score,
    structureScore: score,
    observedEnglishLevel: level,
    feedback: value.feedback || "Evaluación anterior.",
    strengths: value.strengths?.length
      ? value.strengths
      : ["Respuesta completada"],
    priorityImprovement:
      value.improvement || "Continúa practicando claridad y precisión.",
    correctedAnswer: value.correctedAnswer || "No corrected answer available.",
    nextLevelAnswer: value.correctedAnswer || "No next-level answer available.",
  };
}
function migrateSession(value: any): Session {
  const level: EnglishLevel = ["A1", "A2", "B1", "B2"].includes(
    value.englishLevel,
  )
    ? value.englishLevel
    : "B1";
  const turns: Turn[] = (value.turns || []).map((turn: any) => ({
    ...turn,
    evaluation: migrateEvaluation(turn.evaluation, level),
  }));
  if (!value.feedback || typeof value.feedback.levelScore === "number")
    return { ...value, englishLevel: level, turns } as Session;
  const levelScore = normalizeScore(value.feedback.overallScore);
  const feedback: Feedback = {
    ...value.feedback,
    levelScore,
    jobReadinessScore: levelScore,
    englishLevel: level,
    dimensionAverages: {
      english: normalizeScore(value.feedback.clarity),
      technical: normalizeScore(value.feedback.technicalFit),
      relevance: levelScore,
      structure: normalizeScore(value.feedback.structure),
    },
    turnReviews: (value.feedback.turnReviews || []).map((review: any) => ({
      turnIndex: review.turnIndex,
      levelScore: normalizeScore(review.score),
      jobReadinessScore: normalizeScore(review.score),
      feedback: review.feedback || "Evaluación anterior.",
      correctedAnswer:
        review.correctedAnswer || "No corrected answer available.",
    })),
  };
  return { ...value, englishLevel: level, turns, feedback } as Session;
}
function loadHistory(): Session[] {
  const parse = (raw: string | null) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((item) => {
        try {
          return [migrateSession(item)];
        } catch {
          return [];
        }
      });
    } catch {
      return [];
    }
  };
  const current = localStorage.getItem(HISTORY_KEY);
  const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
  const sessions = current ? parse(current) : parse(legacy);
  if (!current && legacy && sessions.length) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    } catch {
      /* storage is optional */
    }
  }
  return sessions;
}
function saveSession(session: Session) {
  const next = [
    session,
    ...loadHistory().filter((item) => item.id !== session.id),
  ].slice(0, 20);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* feedback remains visible when storage is full */
  }
}

type ProgressDimension = keyof Feedback["dimensionAverages"];
type ProgressFilterLevel = EnglishLevel | "all";

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function formatScore(value: number) {
  return value ? value.toFixed(1) : "—";
}

function summarizeProgress(sessions: Session[]) {
  const completed = sessions.filter(
    (session): session is Session & { feedback: Feedback } =>
      Boolean(session.feedback),
  );
  const dimensions: Record<ProgressDimension, number> = {
    english: average(
      completed.map((session) => session.feedback.dimensionAverages.english),
    ),
    technical: average(
      completed.map((session) => session.feedback.dimensionAverages.technical),
    ),
    relevance: average(
      completed.map((session) => session.feedback.dimensionAverages.relevance),
    ),
    structure: average(
      completed.map((session) => session.feedback.dimensionAverages.structure),
    ),
  };
  return {
    completed,
    averageLevel: average(
      completed.map((session) => session.feedback.levelScore),
    ),
    averageJobReadiness: average(
      completed.map((session) => session.feedback.jobReadinessScore),
    ),
    dimensions,
  };
}

const dimensionLabels: Record<ProgressDimension, string> = {
  english: "English",
  technical: "Technical",
  relevance: "Relevance",
  structure: "Structure",
};

type SpeechCallbacks = {
  onProgress: (wordCount: number) => void;
  onSpeaking: (speaking: boolean) => void;
};

function wordsBefore(text: string, characterIndex: number) {
  return text.slice(0, characterIndex).trim().split(/\s+/).filter(Boolean)
    .length;
}

function speakWithBrowser(text: string, callbacks: SpeechCallbacks) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const play = () => {
    const voices = window.speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith("en"));
    const preferred = [
      "Ava",
      "Samantha",
      "Karen",
      "Google US English",
      "Microsoft Aria",
      "Daniel",
    ];
    const voice = voices.sort((left, right) => {
      const score = (name: string) =>
        preferred.reduce(
          (total, preferredName, index) =>
            total +
            (name.toLowerCase().includes(preferredName.toLowerCase())
              ? preferred.length - index
              : 0),
          0,
        );
      return score(right.name) - score(left.name);
    })[0];
    const utterance = new SpeechSynthesisUtterance(
      text.replace(/:\s+/g, "… ").replace(/,\s+(and|but)\s+/i, ", … $1 "),
    );
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      callbacks.onSpeaking(true);
      callbacks.onProgress(1);
    };
    utterance.onboundary = (event) =>
      callbacks.onProgress(wordsBefore(utterance.text, event.charIndex) + 1);
    utterance.onend = () => {
      callbacks.onProgress(text.trim().split(/\s+/).length);
      callbacks.onSpeaking(false);
    };
    utterance.onerror = () => callbacks.onSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  if (window.speechSynthesis.getVoices().length) play();
  else
    window.speechSynthesis.addEventListener("voiceschanged", play, {
      once: true,
    });
}

async function speakQuestion(
  text: string,
  enabled: boolean,
  audioRef: { current: HTMLAudioElement | null },
  onProvider: (provider: TtsProvider) => void,
  callbacks: SpeechCallbacks,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!enabled || typeof window === "undefined") {
    callbacks.onProgress(words.length);
    callbacks.onSpeaking(false);
    return;
  }
  onProvider("loading");
  window.speechSynthesis.cancel();
  audioRef.current?.pause();
  callbacks.onProgress(0);
  callbacks.onSpeaking(false);
  let fallbackStarted = false;
  try {
    const response = await fetch(`${API}/api/audio/speak`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("TTS unavailable");
    const objectUrl = URL.createObjectURL(await response.blob());
    const audio = new Audio(objectUrl);
    audio.preload = "auto";
    audioRef.current = audio;
    const fallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      audio.pause();
      onProvider("system");
      speakWithBrowser(text, callbacks);
    };
    audio.onplaying = () => {
      onProvider("streaming");
      callbacks.onSpeaking(true);
      callbacks.onProgress(1);
    };
    audio.ontimeupdate = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0)
        callbacks.onProgress(
          Math.min(
            words.length,
            Math.max(
              1,
              Math.ceil((audio.currentTime / audio.duration) * words.length),
            ),
          ),
        );
    };
    audio.onended = () => {
      callbacks.onProgress(words.length);
      callbacks.onSpeaking(false);
      URL.revokeObjectURL(objectUrl);
    };
    audio.onerror = fallback;
    await audio.play().catch(fallback);
  } catch {
    onProvider("system");
    speakWithBrowser(text, callbacks);
  }
}

export default function InterviewApp() {
  const [stage, setStage] = useState<Stage>("prepare");
  const [jobDescription, setJobDescription] = useState("");
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>("B1");
  const [cvText, setCvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [answer, setAnswer] = useState("");
  const [turnEvaluation, setTurnEvaluation] = useState<TurnEvaluation | null>(
    null,
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [progressRole, setProgressRole] = useState("all");
  const [progressLevel, setProgressLevel] =
    useState<ProgressFilterLevel>("all");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("loading");
  const [spokenWordCount, setSpokenWordCount] = useState(0);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("active");
  const [activeCreatedAt, setActiveCreatedAt] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const cvRequest = useRef<AbortController | null>(null);
  const cvToken = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const ttsAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    void fetch(`${API}/api/access`, { credentials: "include" })
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false));
  }, []);
  useEffect(() => {
    if (stage === "interview" && question)
      void speakQuestion(question, voiceEnabled, ttsAudio, setTtsProvider, {
        onProgress: setSpokenWordCount,
        onSpeaking: setVoiceSpeaking,
      });
  }, [question, stage, voiceEnabled]);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
      ttsAudio.current?.pause();
    },
    [],
  );

  const sourceReady =
    jobDescription.trim().length >= 20 || cvText.trim().length >= 80;
  const questionWords = question.trim().split(/\s+/).filter(Boolean);
  const currentSession = useMemo<Session | null>(
    () =>
      profile
        ? {
            id: activeSessionId,
            createdAt: activeCreatedAt || new Date().toISOString(),
            profile,
            turns,
            englishLevel,
            feedback: feedback || undefined,
          }
        : null,
    [activeSessionId, activeCreatedAt, profile, turns, englishLevel, feedback],
  );
  const progressRoles = useMemo(
    () =>
      Array.from(
        new Set(
          history
            .filter((session) => session.feedback)
            .map((session) => session.profile.role),
        ),
      ).sort(),
    [history],
  );
  const progress = useMemo(() => {
    const filtered = history.filter(
      (session) =>
        session.feedback &&
        (progressRole === "all" || session.profile.role === progressRole) &&
        (progressLevel === "all" || session.englishLevel === progressLevel),
    );
    return summarizeProgress(filtered);
  }, [history, progressRole, progressLevel]);

  async function handleFile(file?: File) {
    if (!file) return;
    const token = ++cvToken.current;
    cvRequest.current?.abort();
    const controller = new AbortController();
    cvRequest.current = controller;
    setError("");
    setBusy(true);
    try {
      if (file.type !== "application/pdf" && !file.name.match(/\.(txt|md)$/i))
        throw new Error("Sube un PDF, TXT o Markdown.");
      if (file.type === "application/pdf") {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`${API}/api/documents/extract`, {
          method: "POST",
          body: form,
          credentials: "include",
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload?.error?.message || "No se pudo leer el PDF.");
        if (token === cvToken.current) {
          setCvText(payload.text);
          setFileName(file.name);
        }
      } else {
        const text = await file.text();
        if (token === cvToken.current) {
          setCvText(text);
          setFileName(file.name);
        }
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setFileName("");
        setCvText("");
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo leer el archivo.",
        );
      }
    } finally {
      if (token === cvToken.current) setBusy(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  async function startInterview() {
    if (!sourceReady) {
      setError(
        "Añade una descripción del puesto o un CV para preparar la entrevista.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<StartResponse>("/api/interviews/start", {
        method: "POST",
        body: JSON.stringify({
          jobDescription,
          cvText,
          englishLevel,
          questionCount: 3,
        }),
      });
      setProfile(result.profile);
      setQuestion(result.question.text);
      setQuestionIndex(0);
      setTotalQuestions(3);
      setTurns([]);
      setFeedback(null);
      setAnswer("");
      setTurnEvaluation(null);
      setStage("interview");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo iniciar la entrevista.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function evaluateAnswer() {
    const clean = answer.trim();
    if (!clean || !profile || busy || turnEvaluation) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<TurnEvaluation>(
        "/api/interviews/evaluate-turn",
        {
          method: "POST",
          body: JSON.stringify({
            context: { jobDescription, cvText, profile, englishLevel },
            question,
            answer: clean,
            turnIndex: turns.length,
          }),
        },
      );
      setTurnEvaluation(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo procesar la respuesta.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function continueToNext() {
    if (!profile || !turnEvaluation || !answer.trim() || busy) return;
    const nextTurns = [
      ...turns,
      { question, answer: answer.trim(), evaluation: turnEvaluation },
    ];
    setBusy(true);
    setError("");
    try {
      if (nextTurns.length >= totalQuestions) {
        const result = await api<Feedback>("/api/interviews/feedback", {
          method: "POST",
          body: JSON.stringify({
            context: { jobDescription, cvText, profile, englishLevel },
            turns: nextTurns,
          }),
        });
        const session = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          profile,
          turns: nextTurns,
          englishLevel,
          feedback: result,
        };
        saveSession(session);
        setActiveSessionId(session.id);
        setActiveCreatedAt(session.createdAt);
        setHistory(loadHistory());
        setTurns(nextTurns);
        setFeedback(result);
        setStage("results");
      } else {
        const result = await api<{
          question: { index: number; text: string };
          provider: Provider;
        }>("/api/interviews/next", {
          method: "POST",
          body: JSON.stringify({
            context: { jobDescription, cvText, profile, englishLevel },
            turns: nextTurns,
            questionCount: totalQuestions,
          }),
        });
        setTurns(nextTurns);
        setQuestion(result.question.text);
        setQuestionIndex(nextTurns.length);
        setAnswer("");
        setTurnEvaluation(null);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo continuar la entrevista.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (listening) {
      recorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Este navegador no permite grabar audio. Escribe tu respuesta manualmente.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
          (candidate) => MediaRecorder.isTypeSupported(candidate),
        ) || "";
      const media = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      audioChunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size) audioChunks.current.push(event.data);
      };
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        setBusy(true);
        try {
          const form = new FormData();
          const mime = audioChunks.current[0]?.type || "audio/webm";
          form.append(
            "audio",
            new Blob(audioChunks.current, { type: mime }),
            `answer.${mime.includes("mp4") ? "m4a" : "webm"}`,
          );
          const response = await fetch(`${API}/api/audio/transcribe`, {
            method: "POST",
            body: form,
            credentials: "include",
          });
          const payload = await response.json();
          if (!response.ok)
            throw new Error(
              payload?.error?.message || "No se pudo transcribir el audio.",
            );
          setAnswer((current) =>
            current ? `${current} ${payload.text}` : payload.text,
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Transcripción fallida. Puedes escribir la respuesta.",
          );
        } finally {
          setBusy(false);
        }
      };
      recorder.current = media;
      media.start();
      setListening(true);
      window.setTimeout(() => {
        if (recorder.current === media && media.state === "recording")
          media.stop();
      }, 120_000);
    } catch {
      setError(
        "No se concedió acceso al micrófono. Puedes escribir la respuesta manualmente.",
      );
    }
  }

  function reset() {
    window.speechSynthesis?.cancel();
    setStage("prepare");
    setProfile(null);
    setTurns([]);
    setQuestion("");
    setAnswer("");
    setTurnEvaluation(null);
    setFeedback(null);
    setActiveSessionId("active");
    setActiveCreatedAt("");
    setError("");
  }
  function openSession(session: Session) {
    setActiveSessionId(session.id);
    setActiveCreatedAt(session.createdAt);
    setProfile(session.profile);
    setTurns(session.turns);
    setEnglishLevel(session.englishLevel || "B1");
    setFeedback(session.feedback || null);
    setStage("results");
  }
  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(LEGACY_HISTORY_KEY);
    setHistory([]);
  }
  function deleteCurrentSession() {
    if (activeSessionId === "active") return;
    const next = loadHistory().filter(
      (session) => session.id !== activeSessionId,
    );
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* optional local archive */
    }
    setHistory(next);
    reset();
  }

  async function login() {
    setAccessBusy(true);
    setError("");
    try {
      const result = await api<{ authenticated: boolean }>("/api/access", {
        method: "POST",
        body: JSON.stringify({ code: accessCode }),
      });
      setAuthenticated(result.authenticated);
      setAccessCode("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo validar el código.",
      );
    } finally {
      setAccessBusy(false);
    }
  }
  if (authenticated === null)
    return (
      <main className="app-shell">
        <p aria-live="polite">Cargando Vera…</p>
      </main>
    );
  if (!authenticated)
    return (
      <main className="app-shell">
        <section
          className="panel"
          style={{ maxWidth: 520, margin: "15vh auto" }}
        >
          <div className="eyebrow">Vera · interview lab</div>
          <h1>Acceso privado</h1>
          <p className="hero-copy">
            Introduce el código de acceso para comenzar. Tu historial se
            conserva únicamente en este navegador.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void login();
            }}
          >
            <label className="field">
              Código de acceso
              <input
                autoFocus
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
              />
            </label>
            <button
              className="primary-btn wide"
              disabled={accessBusy || !accessCode.trim()}
            >
              {accessBusy ? "Validando…" : "Entrar"}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        </section>
      </main>
    );
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={17} />
          </span>{" "}
          vera<span className="subtle">/ interview lab</span>
        </div>
        <div className="mono subtle">ENGLISH MODE · 01</div>
      </header>
      <AnimatePresence mode="wait">
        {stage === "prepare" && (
          <motion.section
            key="prepare"
            className="hero"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
          >
            <div>
              <div className="signal">
                <span className="signal-dot" />
                AI interviewer ready
              </div>
              <div className="eyebrow">Technical interview rehearsal</div>
              <h1>
                Practice with <em>purpose.</em>
              </h1>
              <p className="hero-copy">
                Convierte tu próximo puesto o tu experiencia en una entrevista
                técnica en inglés, diseñada para ayudarte a pensar, responder y
                mejorar.
              </p>
            </div>
            <div className="panel">
              <p className="panel-label">01 / prepara tu sesión</p>
              <div className="field">
                <label>¿Qué puesto estás buscando?</label>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Pega aquí el nombre del puesto, responsabilidades, tecnologías y requisitos..."
                />
              </div>
              <div className="field">
                <label>Tu nivel de inglés</label>
                <div
                  className="level-options"
                  role="radiogroup"
                  aria-label="Nivel de inglés"
                >
                  {(["A1", "A2", "B1", "B2"] as EnglishLevel[]).map((level) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={englishLevel === level}
                      tabIndex={englishLevel === level ? 0 : -1}
                      className={`level-option ${englishLevel === level ? "active" : ""}`}
                      onClick={() => setEnglishLevel(level)}
                      key={level}
                    >
                      <strong>{level}</strong>
                      <span>
                        {
                          {
                            A1: "Beginner",
                            A2: "Elementary",
                            B1: "Intermediate",
                            B2: "Upper-intermediate",
                          }[level]
                        }
                      </span>
                    </button>
                  ))}
                </div>
                <small className="level-hint">
                  La entrevista adaptará su vocabulario y dificultad a este
                  nivel.
                </small>
              </div>
              <div className="field">
                <label>
                  CV <span className="muted">· opcional</span>
                </label>
                <label
                  className={`file-drop ${dragActive ? "drag-active" : ""}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  <FileText size={22} color="var(--accent)" />
                  <span>
                    <strong>{fileName || "Arrastra tu CV aquí"}</strong>
                    <small>
                      o haz clic para seleccionar un PDF, TXT o Markdown
                    </small>
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                    onChange={(event) =>
                      void handleFile(event.target.files?.[0])
                    }
                  />
                </label>
              </div>
              <button
                className="primary-btn wide"
                disabled={busy}
                onClick={() => void startInterview()}
              >
                {busy ? "Preparando tu entrevista…" : "Preparar entrevista"}
                <Sparkles size={16} />
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </motion.section>
        )}
        {stage === "interview" && profile && (
          <motion.section
            key="interview"
            className="interview-layout"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
          >
            <div className="panel interview-main">
              <div>
                <div className="interview-head">
                  <div>
                    <div className="eyebrow">{profile.role}</div>
                    <h2>
                      Question {questionIndex + 1}
                      <span className="subtle"> / {totalQuestions}</span>
                    </h2>
                  </div>
                  <button
                    className="secondary-btn"
                    onClick={() => {
                      setVoiceEnabled((value) => !value);
                      if (voiceEnabled) {
                        window.speechSynthesis?.cancel();
                        ttsAudio.current?.pause();
                        setTtsProvider("off");
                        setVoiceSpeaking(false);
                        setSpokenWordCount(questionWords.length);
                      }
                    }}
                  >
                    {voiceEnabled ? (
                      <Volume2 size={16} />
                    ) : (
                      <VolumeX size={16} />
                    )}{" "}
                    {voiceEnabled
                      ? `Voice · ${ttsProvider === "streaming" ? "Streaming" : ttsProvider === "system" ? "System" : "Loading"}`
                      : "Voice off"}
                  </button>
                </div>
                <div className="progress">
                  <span
                    style={{
                      width: `${((turns.length + (turnEvaluation ? 1 : 0)) / totalQuestions) * 100}%`,
                    }}
                  />
                </div>
                <div
                  className={`question-card ${voiceSpeaking ? "speaking" : ""}`}
                >
                  <blockquote aria-label={question}>
                    “
                    {questionWords.map((word, index) => (
                      <span
                        className={
                          index < spokenWordCount ? "spoken" : "pending"
                        }
                        key={`${word}-${index}`}
                      >
                        {word}
                        {index < questionWords.length - 1 ? " " : ""}
                      </span>
                    ))}
                    ”
                  </blockquote>
                  <cite>
                    {ttsProvider === "loading" && voiceEnabled
                      ? "Preparing Vera’s voice…"
                      : voiceSpeaking
                        ? "Vera is speaking · follow the highlighted words"
                        : "Read it aloud, then answer as if you were already in the room."}
                  </cite>
                </div>
              </div>
              <div className="answer-area">
                <label className="panel-label">
                  Your answer · English transcript
                </label>
                <textarea
                  value={answer}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                    if (turnEvaluation) setTurnEvaluation(null);
                  }}
                  placeholder="Your transcribed answer will appear here. You can edit it before submitting..."
                  disabled={busy || Boolean(turnEvaluation)}
                />
                <div className="answer-actions">
                  <button
                    className={`mic-btn ${listening ? "listening" : ""}`}
                    aria-label={
                      listening ? "Stop recording" : "Start recording"
                    }
                    onClick={() => void toggleRecording()}
                    disabled={busy || Boolean(turnEvaluation)}
                  >
                    {listening ? <Pause size={22} /> : <Mic size={22} />}
                  </button>
                  <div className="muted">
                    <Waves
                      size={14}
                      style={{ verticalAlign: "middle", marginRight: 6 }}
                    />
                    {listening
                      ? "Listening… tap to stop"
                      : busy
                        ? "Processing your answer…"
                        : turnEvaluation
                          ? "Answer evaluated"
                          : "Tap the microphone or write"}
                  </div>
                  {!turnEvaluation ? (
                    <button
                      className="primary-btn"
                      onClick={() => void evaluateAnswer()}
                      disabled={busy || !answer.trim()}
                    >
                      Evaluate answer
                    </button>
                  ) : (
                    <>
                      <button
                        className="secondary-btn"
                        onClick={() => setTurnEvaluation(null)}
                        disabled={busy}
                      >
                        Edit answer
                      </button>
                      <button
                        className="primary-btn"
                        onClick={() => void continueToNext()}
                        disabled={busy}
                      >
                        {questionIndex + 1 >= totalQuestions
                          ? "See final feedback"
                          : "Next question"}
                      </button>
                    </>
                  )}
                </div>
                {turnEvaluation && (
                  <div className="turn-score">
                    <div className="score-duo">
                      <div className="score-card primary">
                        <span>Progreso en {englishLevel}</span>
                        <strong>
                          {turnEvaluation.levelScore}
                          <small>/10</small>
                        </strong>
                      </div>
                      <div className="score-card">
                        <span>Preparación laboral</span>
                        <strong>
                          {turnEvaluation.jobReadinessScore}
                          <small>/10</small>
                        </strong>
                      </div>
                    </div>
                    <div className="observed-level">
                      Nivel demostrado en esta respuesta:{" "}
                      <strong>{turnEvaluation.observedEnglishLevel}</strong>
                    </div>
                    <p className="score-feedback">{turnEvaluation.feedback}</p>
                    <div className="dimension-scores">
                      <div>
                        <strong>{turnEvaluation.englishScore}</strong>
                        <span>English</span>
                      </div>
                      <div>
                        <strong>{turnEvaluation.technicalScore}</strong>
                        <span>Técnico</span>
                      </div>
                      <div>
                        <strong>{turnEvaluation.relevanceScore}</strong>
                        <span>Relevancia</span>
                      </div>
                      <div>
                        <strong>{turnEvaluation.structureScore}</strong>
                        <span>Estructura</span>
                      </div>
                    </div>
                    <div className="turn-score-grid">
                      <div>
                        <b>Lo que funcionó</b>
                        <ul>
                          {turnEvaluation.strengths.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <b>Mejora prioritaria</b>
                        <p>{turnEvaluation.priorityImprovement}</p>
                      </div>
                    </div>
                    <p className="corrected">
                      <strong>Tu respuesta corregida:</strong>{" "}
                      {turnEvaluation.correctedAnswer}
                    </p>
                    <p className="next-level-answer">
                      <strong>Respuesta para tu siguiente nivel:</strong>{" "}
                      {turnEvaluation.nextLevelAnswer}
                    </p>
                  </div>
                )}
                {error && <p className="error">{error}</p>}
              </div>
            </div>
            <aside className="side-panel">
              <div className="side-section">
                <h3>Focus areas</h3>
                <div className="focus-list">
                  {profile.focusAreas.map((area) => (
                    <span className="chip" key={area}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div className="side-section">
                <h3>Session notes</h3>
                <p
                  className="muted"
                  style={{ lineHeight: 1.6, fontSize: ".83rem", margin: 0 }}
                >
                  {profile.summary}
                </p>
              </div>
              <div className="side-section">
                <h3>Progress</h3>
                <div className="metric">
                  <strong>
                    {Math.round(
                      ((turns.length + (turnEvaluation ? 1 : 0)) /
                        totalQuestions) *
                        100,
                    )}
                    %
                  </strong>
                  <span>completed</span>
                </div>
              </div>
            </aside>
          </motion.section>
        )}
        {stage === "results" && feedback && profile && (
          <motion.section
            key="results"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="panel">
              <div className="interview-head">
                <div>
                  <div className="eyebrow">
                    Session complete · {profile.role}
                  </div>
                  <h2>
                    Make the next answer{" "}
                    <span style={{ color: "var(--accent)" }}>stronger.</span>
                  </h2>
                  <p className="hero-copy" style={{ margin: 0 }}>
                    {feedback.summary}
                  </p>
                </div>
                <div
                  className="score-ring"
                  style={{
                    ["--score" as string]: `${feedback.levelScore * 10}%`,
                  }}
                >
                  <strong>
                    {feedback.levelScore}
                    <small>/10</small>
                  </strong>
                </div>
              </div>
              <div className="result-score-duo">
                <div className="score-card primary">
                  <span>Progreso en {englishLevel}</span>
                  <strong>
                    {feedback.levelScore}
                    <small>/10</small>
                  </strong>
                </div>
                <div className="score-card">
                  <span>Preparación laboral</span>
                  <strong>
                    {feedback.jobReadinessScore}
                    <small>/10</small>
                  </strong>
                </div>
              </div>
              <div className="metrics result-metrics">
                <div className="metric">
                  <strong>{feedback.englishLevel}</strong>
                  <span>Observed English</span>
                </div>
                <div className="metric">
                  <strong>{feedback.dimensionAverages.english}/10</strong>
                  <span>English progress</span>
                </div>
                <div className="metric">
                  <strong>{feedback.dimensionAverages.technical}/10</strong>
                  <span>Technical</span>
                </div>
                <div className="metric">
                  <strong>{feedback.dimensionAverages.relevance}/10</strong>
                  <span>Relevance</span>
                </div>
                <div className="metric">
                  <strong>{feedback.dimensionAverages.structure}/10</strong>
                  <span>Structure</span>
                </div>
              </div>
              <div className="feedback-grid">
                <div className="feedback-card">
                  <h3>Strengths</h3>
                  {feedback.strengths.map((item) => (
                    <p key={item.label}>
                      <strong>{item.label}.</strong> {item.description}
                    </p>
                  ))}
                </div>
                <div className="feedback-card">
                  <h3>Gaps</h3>
                  {feedback.gaps.map((item) => (
                    <p key={item.label}>
                      <strong>{item.label}.</strong> {item.description}
                    </p>
                  ))}
                </div>
                <div className="feedback-card">
                  <h3>Next practice</h3>
                  {feedback.recommendations.map((item) => (
                    <p key={item.label}>
                      <strong>{item.label}.</strong> {item.description}
                    </p>
                  ))}
                </div>
              </div>
              <h3 className="panel-label" style={{ marginTop: 32 }}>
                Turn-by-turn review
              </h3>
              {turns.map((turn, index) => {
                const review = feedback.turnReviews.find(
                  (item) => item.turnIndex === index,
                );
                const levelScore =
                  turn.evaluation?.levelScore ?? review?.levelScore ?? 0;
                const jobScore =
                  turn.evaluation?.jobReadinessScore ??
                  review?.jobReadinessScore ??
                  0;
                return (
                  <div
                    className="turn-review"
                    key={`${turn.question}-${index}`}
                  >
                    <h3>
                      {index + 1}. {turn.question}{" "}
                      <span className="chip">Nivel {levelScore}/10</span>{" "}
                      <span className="chip">Trabajo {jobScore}/10</span>
                    </h3>
                    <p>
                      <strong>Your answer:</strong> {turn.answer}
                    </p>
                    {review && (
                      <>
                        <p>{review.feedback}</p>
                        <p className="corrected">
                          <strong>Stronger English:</strong>{" "}
                          {review.correctedAnswer}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
              <div className="answer-actions" style={{ marginTop: 28 }}>
                <button className="secondary-btn" onClick={reset}>
                  <RotateCcw size={16} /> New interview
                </button>
                {activeSessionId !== "active" && (
                  <button
                    className="secondary-btn"
                    onClick={deleteCurrentSession}
                  >
                    Delete session
                  </button>
                )}
                <button
                  className="primary-btn"
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify(currentSession, null, 2)],
                      { type: "application/json" },
                    );
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "vera-interview.json";
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export session
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      {stage === "prepare" && (
        <section style={{ marginTop: 28 }}>
          {history.length > 0 && (
            <div className="panel progress-panel">
              <div className="interview-head">
                <div>
                  <div className="eyebrow">Progress overview</div>
                  <h2 style={{ fontSize: "1.4rem", margin: "10px 0 0" }}>
                    See how your practice is moving
                  </h2>
                  <p className="muted progress-intro">
                    A local view of completed interviews. Nothing is uploaded or
                    synced.
                  </p>
                </div>
                <div className="progress-filters" aria-label="Progress filters">
                  <label>
                    Role
                    <select
                      value={progressRole}
                      onChange={(event) => setProgressRole(event.target.value)}
                    >
                      <option value="all">All roles</option>
                      {progressRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Level
                    <select
                      value={progressLevel}
                      onChange={(event) =>
                        setProgressLevel(
                          event.target.value as ProgressFilterLevel,
                        )
                      }
                    >
                      <option value="all">All levels</option>
                      {(["A1", "A2", "B1", "B2"] as EnglishLevel[]).map(
                        (level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </div>
              {progress.completed.length === 0 ? (
                <p className="empty">
                  No completed interviews match these filters yet.
                </p>
              ) : (
                <>
                  <div
                    className="progress-summary"
                    aria-label="Progress summary"
                  >
                    <div className="progress-stat">
                      <span>Completed</span>
                      <strong>{progress.completed.length}</strong>
                      <small>interviews</small>
                    </div>
                    <div className="progress-stat">
                      <span>English progress</span>
                      <strong>
                        {formatScore(progress.averageLevel)}
                        <small>/10</small>
                      </strong>
                      <small>average level score</small>
                    </div>
                    <div className="progress-stat">
                      <span>Job readiness</span>
                      <strong>
                        {formatScore(progress.averageJobReadiness)}
                        <small>/10</small>
                      </strong>
                      <small>average score</small>
                    </div>
                  </div>
                  <div className="progress-grid">
                    <div className="progress-dimensions">
                      <h3>Dimensions</h3>
                      {(
                        Object.keys(dimensionLabels) as ProgressDimension[]
                      ).map((dimension) => {
                        const score = progress.dimensions[dimension];
                        return (
                          <div className="dimension-row" key={dimension}>
                            <div>
                              <span>{dimensionLabels[dimension]}</span>
                              <strong>
                                {formatScore(score)}
                                <small>/10</small>
                              </strong>
                            </div>
                            <div
                              className="dimension-track"
                              aria-label={`${dimensionLabels[dimension]} ${formatScore(score)} out of 10`}
                            >
                              <span style={{ width: `${score * 10}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="progress-recent">
                      <h3>Recent practice</h3>
                      {progress.completed.slice(0, 5).map((session) => (
                        <div className="progress-session" key={session.id}>
                          <div>
                            <strong>{session.profile.role}</strong>
                            <small>
                              {new Date(session.createdAt).toLocaleDateString()}{" "}
                              · {session.englishLevel || "B1"}
                            </small>
                          </div>
                          <span className="chip">
                            {session.feedback.levelScore}/10
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="panel">
            <div className="interview-head">
              <div>
                <div className="eyebrow">
                  <History
                    size={13}
                    style={{ verticalAlign: "middle", marginRight: 5 }}
                  />{" "}
                  Recent sessions
                </div>
                <h2 style={{ fontSize: "1.4rem", margin: "10px 0 0" }}>
                  Your practice archive
                </h2>
              </div>
              {history.length > 0 && (
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={clearHistory}
                >
                  Delete local history
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="empty">
                Your completed interviews will live here, locally and privately.
              </p>
            ) : (
              history.slice(0, 4).map((session) => (
                <button
                  className="history-item"
                  key={session.id}
                  onClick={() => openSession(session)}
                >
                  <span>
                    <strong>{session.profile.role}</strong>
                    <small>
                      {new Date(session.createdAt).toLocaleDateString()} ·{" "}
                      {session.turns.length} answers ·{" "}
                      {session.englishLevel || "B1"}
                    </small>
                  </span>
                  <span className="chip">
                    {session.feedback
                      ? `${session.feedback.levelScore}/10`
                      : "—"}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}
      {stage === "results" && profile && !feedback && (
        <motion.section
          key="incomplete"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="panel">
            <div className="eyebrow">Session incomplete</div>
            <h2>This interview has no final feedback yet.</h2>
            <p className="hero-copy">
              You can start a new interview. Incomplete sessions remain
              recoverable in your local archive.
            </p>
            <button className="primary-btn" onClick={reset}>
              <RotateCcw size={16} /> New interview
            </button>
          </div>
        </motion.section>
      )}
    </main>
  );
}
