import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { AnimatePresence } from "motion/react";
import { TOTAL_QUESTIONS } from "@voice-ia/contracts";
import { AccessScreen } from "./AccessScreen";
import {
  clearHistory,
  deleteSession,
  loadHistory,
  saveSession,
  summarizeProgress,
} from "./InterviewApp.history";
import {
  initialInterviewState,
  interviewReducer,
} from "./InterviewApp.reducer";
import {
  type Feedback,
  type ProgressFilterLevel,
  type Session,
  type StartResponse,
  type TurnEvaluation,
} from "./InterviewApp.types";
import { InterviewHeader } from "./InterviewHeader";
import { InterviewStage } from "./InterviewStage";
import { PrepareStage } from "./PrepareStage";
import { ProgressOverview } from "./ProgressOverview";
import { ResultsStage } from "./ResultsStage";
import { SessionHistory } from "./SessionHistory";
import { useAnswerRecorder } from "./useAnswerRecorder";
import { useQuestionSpeech } from "./useQuestionSpeech";
import { ui } from "./uiClasses";

const API = import.meta.env.PUBLIC_API_URL || "http://localhost:3001";

function errorMessage(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) return fallback;
  if ("error" in payload) {
    const error = payload.error;
    if (typeof error === "object" && error !== null && "message" in error) {
      return typeof error.message === "string" ? error.message : fallback;
    }
  }
  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }
  return fallback;
}

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
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errorMessage(payload, "No se pudo conectar con la API."));
  }
  return payload as T;
}

export default function InterviewApp() {
  const [state, dispatch] = useReducer(interviewReducer, initialInterviewState);
  const [history, setHistory] = useState<Session[]>([]);
  const [progressRole, setProgressRole] = useState("all");
  const [progressLevel, setProgressLevel] =
    useState<ProgressFilterLevel>("all");
  const [dragActive, setDragActive] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const cvRequest = useRef<AbortController | null>(null);
  const cvToken = useRef(0);

  const {
    stage,
    jobDescription,
    englishLevel,
    cvText,
    fileName,
    profile,
    turns,
    question,
    questionIndex,
    totalQuestions,
    answer,
    turnEvaluation,
    feedback,
    activeSessionId,
    activeCreatedAt,
    operation,
    error,
  } = state;

  const {
    voiceEnabled,
    ttsProvider,
    spokenWordCount,
    voiceSpeaking,
    toggleVoice,
    stopSpeech,
  } = useQuestionSpeech({
    text: question,
    active: stage === "interview",
    apiBase: API,
  });

  const { listening, transcribing, toggleRecording, cancelRecording } =
    useAnswerRecorder({
      apiBase: API,
      onTranscript: (text) => dispatch({ type: "transcript-appended", text }),
      onError: (message) => dispatch({ type: "operation-failed", message }),
    });

  const busy = operation !== "idle" || transcribing;
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
    [activeCreatedAt, activeSessionId, englishLevel, feedback, profile, turns],
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
  }, [history, progressLevel, progressRole]);

  useEffect(() => {
    setHistory(loadHistory());
    void fetch(`${API}/api/access`, { credentials: "include" })
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false));
    return () => cvRequest.current?.abort();
  }, []);

  async function handleFile(file?: File) {
    if (!file) return;
    const token = ++cvToken.current;
    cvRequest.current?.abort();
    const controller = new AbortController();
    cvRequest.current = controller;
    dispatch({ type: "cv-loading" });
    try {
      if (file.type !== "application/pdf" && !file.name.match(/\.(txt|md)$/i)) {
        throw new Error("Sube un PDF, TXT o Markdown.");
      }
      if (file.type === "application/pdf") {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(`${API}/api/documents/extract`, {
          method: "POST",
          body: form,
          credentials: "include",
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(errorMessage(payload, "No se pudo leer el PDF."));
        }
        if (token === cvToken.current) {
          const text =
            typeof payload === "object" &&
            payload !== null &&
            "text" in payload &&
            typeof payload.text === "string"
              ? payload.text
              : "";
          dispatch({ type: "cv-loaded", text, fileName: file.name });
        }
      } else {
        const text = await file.text();
        if (token === cvToken.current) {
          dispatch({ type: "cv-loaded", text, fileName: file.name });
        }
      }
    } catch (cause) {
      if (
        token === cvToken.current &&
        !(cause instanceof DOMException && cause.name === "AbortError")
      ) {
        dispatch({
          type: "cv-failed",
          message:
            cause instanceof Error
              ? cause.message
              : "No se pudo leer el archivo.",
        });
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  async function startInterview() {
    if (!sourceReady) {
      dispatch({
        type: "operation-failed",
        message:
          "Añade una descripción del puesto o un CV para preparar la entrevista.",
      });
      return;
    }
    dispatch({ type: "start-requested" });
    try {
      const result = await api<StartResponse>("/api/interviews/start", {
        method: "POST",
        body: JSON.stringify({
          jobDescription,
          cvText,
          englishLevel,
          questionCount: TOTAL_QUESTIONS,
        }),
      });
      dispatch({
        type: "interview-started",
        profile: result.profile,
        question: result.question.text,
        totalQuestions: result.totalQuestions || TOTAL_QUESTIONS,
      });
    } catch (cause) {
      dispatch({
        type: "operation-failed",
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudo iniciar la entrevista.",
      });
    }
  }

  async function evaluateAnswer() {
    const clean = answer.trim();
    if (!clean || !profile || busy || turnEvaluation) return;
    dispatch({ type: "turn-evaluation-requested" });
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
      dispatch({ type: "turn-evaluated", evaluation: result });
    } catch (cause) {
      dispatch({
        type: "operation-failed",
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudo procesar la respuesta.",
      });
    }
  }

  async function continueToNext() {
    if (!profile || !turnEvaluation || !answer.trim() || busy) return;
    const nextTurns = [
      ...turns,
      { question, answer: answer.trim(), evaluation: turnEvaluation },
    ];
    dispatch({ type: "advance-requested" });
    try {
      if (nextTurns.length >= totalQuestions) {
        const result = await api<Feedback>("/api/interviews/feedback", {
          method: "POST",
          body: JSON.stringify({
            context: { jobDescription, cvText, profile, englishLevel },
            turns: nextTurns,
          }),
        });
        const session: Session = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          profile,
          turns: nextTurns,
          englishLevel,
          feedback: result,
        };
        saveSession(session);
        setHistory(loadHistory());
        dispatch({
          type: "interview-finished",
          turns: nextTurns,
          feedback: result,
          sessionId: session.id,
          createdAt: session.createdAt,
        });
      } else {
        const result = await api<{
          question: { index: number; text: string };
        }>("/api/interviews/next", {
          method: "POST",
          body: JSON.stringify({
            context: { jobDescription, cvText, profile, englishLevel },
            turns: nextTurns,
            questionCount: totalQuestions,
          }),
        });
        dispatch({
          type: "next-question-loaded",
          turns: nextTurns,
          question: result.question.text,
        });
      }
    } catch (cause) {
      dispatch({
        type: "operation-failed",
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudo continuar la entrevista.",
      });
    }
  }

  function reset() {
    cancelRecording();
    stopSpeech();
    dispatch({ type: "reset" });
  }

  function openSession(session: Session) {
    dispatch({ type: "session-opened", session });
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  function deleteCurrentSession() {
    if (activeSessionId === "active") return;
    const next = deleteSession(activeSessionId);
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
    dispatch({ type: "operation-failed", message: "" });
    try {
      const result = await api<{ authenticated: boolean }>("/api/access", {
        method: "POST",
        body: JSON.stringify({ code: accessCode }),
      });
      setAuthenticated(result.authenticated);
      setAccessCode("");
    } catch (cause) {
      dispatch({
        type: "operation-failed",
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudo validar el código.",
      });
    } finally {
      setAccessBusy(false);
    }
  }

  if (authenticated === null)
    return (
      <main className={ui.shell}>
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
    <main className={ui.shell}>
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
            onJobDescriptionChange={(value) =>
              dispatch({ type: "job-description-changed", value })
            }
            onEnglishLevelChange={(value) =>
              dispatch({ type: "english-level-changed", value })
            }
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
            onToggleVoice={toggleVoice}
            onAnswerChange={(value) =>
              dispatch({ type: "answer-changed", value })
            }
            onToggleRecording={() => void toggleRecording()}
            onEvaluate={() => void evaluateAnswer()}
            onEditAnswer={() => dispatch({ type: "turn-evaluation-cleared" })}
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
        <section className="mt-7">
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
            onClearHistory={handleClearHistory}
            onOpenSession={openSession}
          />
        </section>
      )}
    </main>
  );
}
