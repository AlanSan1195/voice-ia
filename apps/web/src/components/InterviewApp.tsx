import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AnimatePresence } from "motion/react";
import { AccessScreen } from "./AccessScreen";
import {
  type EnglishLevel,
  type Feedback,
  type ProgressDimension,
  type ProgressFilterLevel,
  type Profile,
  type Provider,
  type Session,
  type Stage,
  type StartResponse,
  type TtsProvider,
  type Turn,
  type TurnEvaluation,
} from "./InterviewApp.types";
import { InterviewHeader } from "./InterviewHeader";
import { InterviewStage } from "./InterviewStage";
import { PrepareStage } from "./PrepareStage";
import { ProgressOverview } from "./ProgressOverview";
import { ResultsStage } from "./ResultsStage";
import { SessionHistory } from "./SessionHistory";

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

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
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

  function exportCurrentSession() {
    const blob = new Blob([JSON.stringify(currentSession, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vera-interview.json";
    link.click();
    URL.revokeObjectURL(url);
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
      <AccessScreen
        accessCode={accessCode}
        accessBusy={accessBusy}
        error={error}
        onAccessCodeChange={setAccessCode}
        onSubmit={() => void login()}
      />
    );

  return (
    <main className="app-shell">
      <InterviewHeader />
      <AnimatePresence mode="wait">
        {stage === "prepare" && (
          <PrepareStage
            jobDescription={jobDescription}
            englishLevel={englishLevel}
            cvFileName={fileName}
            dragActive={dragActive}
            busy={busy}
            error={error}
            onJobDescriptionChange={setJobDescription}
            onEnglishLevelChange={setEnglishLevel}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onFileChange={(file) => void handleFile(file)}
            onStart={() => void startInterview()}
          />
        )}
        {stage === "interview" && profile && (
          <InterviewStage
            profile={profile}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            voiceEnabled={voiceEnabled}
            ttsProvider={ttsProvider}
            question={question}
            questionWords={questionWords}
            spokenWordCount={spokenWordCount}
            voiceSpeaking={voiceSpeaking}
            completedTurns={turns.length}
            turnEvaluation={turnEvaluation}
            answer={answer}
            listening={listening}
            busy={busy}
            englishLevel={englishLevel}
            error={error}
            onToggleVoice={() => {
              setVoiceEnabled((value) => !value);
              if (voiceEnabled) {
                window.speechSynthesis?.cancel();
                ttsAudio.current?.pause();
                setTtsProvider("off");
                setVoiceSpeaking(false);
                setSpokenWordCount(questionWords.length);
              }
            }}
            onAnswerChange={(value) => {
              setAnswer(value);
              if (turnEvaluation) setTurnEvaluation(null);
            }}
            onToggleRecording={() => void toggleRecording()}
            onEvaluate={() => void evaluateAnswer()}
            onEditAnswer={() => setTurnEvaluation(null)}
            onContinue={() => void continueToNext()}
          />
        )}
        {stage === "results" && profile && (
          <ResultsStage
            profile={profile}
            feedback={feedback}
            englishLevel={englishLevel}
            turns={turns}
            activeSessionId={activeSessionId}
            onReset={reset}
            onDeleteCurrentSession={deleteCurrentSession}
            onExportSession={exportCurrentSession}
          />
        )}
      </AnimatePresence>
      {stage === "prepare" && (
        <section style={{ marginTop: 28 }}>
          {history.length > 0 && (
            <ProgressOverview
              progress={progress}
              progressRole={progressRole}
              progressLevel={progressLevel}
              progressRoles={progressRoles}
              onProgressRoleChange={setProgressRole}
              onProgressLevelChange={setProgressLevel}
            />
          )}
          <SessionHistory
            history={history}
            onClearHistory={clearHistory}
            onOpenSession={openSession}
          />
        </section>
      )}
    </main>
  );
}
