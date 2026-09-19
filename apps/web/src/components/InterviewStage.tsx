import { Mic, Pause, Volume2, VolumeX, Waves } from "lucide-react";
import { motion } from "motion/react";
import type {
  EnglishLevel,
  Profile,
  TtsProvider,
  TurnEvaluation,
} from "./InterviewApp.types";
import { TurnEvaluationCard } from "./TurnEvaluationCard";
import { ui } from "./uiClasses";

type InterviewStageProps = {
  profile: Profile;
  questionIndex: number;
  totalQuestions: number;
  voiceEnabled: boolean;
  ttsProvider: TtsProvider;
  questionWords: string[];
  question: string;
  spokenWordCount: number;
  voiceSpeaking: boolean;
  completedTurns: number;
  turnEvaluation: TurnEvaluation | null;
  answer: string;
  listening: boolean;
  busy: boolean;
  englishLevel: EnglishLevel;
  error: string;
  onToggleVoice: () => void;
  onAnswerChange: (value: string) => void;
  onToggleRecording: () => void;
  onEvaluate: () => void;
  onEditAnswer: () => void;
  onContinue: () => void;
};

export function InterviewStage({
  profile,
  questionIndex,
  totalQuestions,
  voiceEnabled,
  ttsProvider,
  questionWords,
  question,
  spokenWordCount,
  voiceSpeaking,
  completedTurns,
  turnEvaluation,
  answer,
  listening,
  busy,
  englishLevel,
  error,
  onToggleVoice,
  onAnswerChange,
  onToggleRecording,
  onEvaluate,
  onEditAnswer,
  onContinue,
}: InterviewStageProps) {
  return (
    <motion.section
      key="interview"
      className="grid grid-cols-[minmax(0,1fr)_330px] gap-5 max-[850px]:grid-cols-1 max-[850px]:gap-7"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
    >
      <div
        className={`${ui.panel} flex min-h-[600px] flex-col justify-between`}
      >
        <div>
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className={ui.eyebrow}>{profile.role}</div>
              <h2 className="my-2 text-[clamp(1.5rem,3vw,2.7rem)] font-bold leading-[1.06] tracking-[-0.05em]">
                Question {questionIndex + 1}
                <span className={ui.subtle}> / {totalQuestions}</span>
              </h2>
            </div>
            <button className={ui.secondary} onClick={onToggleVoice}>
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}{" "}
              {voiceEnabled
                ? `Voice · ${ttsProvider === "streaming" ? "Streaming" : ttsProvider === "system" ? "System" : "Loading"}`
                : "Voice off"}
            </button>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
            <span
              style={{
                width: `${((completedTurns + (turnEvaluation ? 1 : 0)) / totalQuestions) * 100}%`,
              }}
            />
          </div>
          <div className="max-w-[800px] py-9">
            <blockquote
              className="m-0 text-[clamp(1.9rem,4vw,3.9rem)] leading-[1.03] tracking-[-0.065em]"
              aria-label={question}
            >
              “
              {questionWords.map((word, index) => (
                <span
                  className={`transition duration-200 ${index < spokenWordCount ? "text-ink opacity-100" : "text-white/[0.18]"} ${voiceSpeaking && index === spokenWordCount - 1 ? "text-accent text-shadow-[0_0_24px_rgb(198_242_107_/_25%)]" : ""}`}
                  key={`${word}-${index}`}
                >
                  {word}
                  {index < questionWords.length - 1 ? " " : ""}
                </span>
              ))}
              ”
            </blockquote>
            <cite className="mt-6 block text-[0.8rem] not-italic text-muted">
              {ttsProvider === "loading" && voiceEnabled
                ? "Preparing Vera’s voice…"
                : voiceSpeaking
                  ? "Vera is speaking · follow the highlighted words"
                  : "Read it aloud, then answer as if you were already in the room."}
            </cite>
          </div>
        </div>
        <div className="border-t border-line pt-6">
          <label className={ui.panelLabel}>
            Your answer · English transcript
          </label>
          <textarea
            className={`${ui.textarea} min-h-[110px]`}
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder="Your transcribed answer will appear here. You can edit it before submitting..."
            disabled={busy || Boolean(turnEvaluation)}
          />
          <div className="mt-3 flex items-center justify-between gap-3 max-[560px]:flex-col-reverse max-[560px]:items-end">
            <button
              className={`grid size-[62px] place-items-center rounded-full border-0 text-[#0b0e12] shadow-[0_0_0_10px_rgb(198_242_107_/_6%),0_12px_32px_rgb(198_242_107_/_20%)] ${listening ? "bg-[#e56f62] text-white shadow-[0_0_0_10px_rgb(229_111_98_/_8%),0_12px_32px_rgb(229_111_98_/_20%)]" : "bg-accent"}`}
              aria-label={listening ? "Stop recording" : "Start recording"}
              onClick={onToggleRecording}
              disabled={busy || Boolean(turnEvaluation)}
            >
              {listening ? <Pause size={22} /> : <Mic size={22} />}
            </button>
            <div className={ui.muted}>
              <Waves size={14} className="mr-1.5 inline align-middle" />
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
                className={ui.primary}
                onClick={onEvaluate}
                disabled={busy || !answer.trim()}
              >
                Evaluate answer
              </button>
            ) : (
              <>
                <button
                  className={ui.secondary}
                  onClick={onEditAnswer}
                  disabled={busy}
                >
                  Edit answer
                </button>
                <button
                  className={ui.primary}
                  onClick={onContinue}
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
            <TurnEvaluationCard
              evaluation={turnEvaluation}
              englishLevel={englishLevel}
            />
          )}
          {error && <p className={ui.error}>{error}</p>}
        </div>
      </div>
      <aside className="flex flex-col gap-5 max-[850px]:grid max-[850px]:grid-cols-2 max-[560px]:flex max-[560px]:flex-col">
        <div className={ui.sideSection}>
          <h3 className="mb-[14px] text-[0.8rem] font-bold uppercase tracking-[0.13em] text-muted">
            Focus areas
          </h3>
          <div className="flex flex-wrap gap-[7px]">
            {profile.focusAreas.map((area) => (
              <span className={ui.chip} key={area}>
                {area}
              </span>
            ))}
          </div>
        </div>
        <div className={ui.sideSection}>
          <h3 className="mb-[14px] text-[0.8rem] font-bold uppercase tracking-[0.13em] text-muted">
            Session notes
          </h3>
          <p className="m-0 text-[0.83rem] leading-[1.6] text-muted">
            {profile.summary}
          </p>
        </div>
        <div className={ui.sideSection}>
          <h3 className="mb-[14px] text-[0.8rem] font-bold uppercase tracking-[0.13em] text-muted">
            Progress
          </h3>
          <div className={ui.metric}>
            <strong className={ui.metricValue}>
              {Math.round(
                ((completedTurns + (turnEvaluation ? 1 : 0)) / totalQuestions) *
                  100,
              )}
              %
            </strong>
            <span className={ui.metricLabel}>completed</span>
          </div>
        </div>
      </aside>
    </motion.section>
  );
}
