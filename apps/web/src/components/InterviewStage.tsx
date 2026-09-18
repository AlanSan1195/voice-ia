import { Mic, Pause, Volume2, VolumeX, Waves } from "lucide-react";
import { motion } from "motion/react";
import type {
  EnglishLevel,
  Profile,
  TtsProvider,
  TurnEvaluation,
} from "./InterviewApp.types";
import { TurnEvaluationCard } from "./TurnEvaluationCard";

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
            <button className="secondary-btn" onClick={onToggleVoice}>
              {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}{" "}
              {voiceEnabled
                ? `Voice · ${ttsProvider === "streaming" ? "Streaming" : ttsProvider === "system" ? "System" : "Loading"}`
                : "Voice off"}
            </button>
          </div>
          <div className="progress">
            <span
              style={{
                width: `${((completedTurns + (turnEvaluation ? 1 : 0)) / totalQuestions) * 100}%`,
              }}
            />
          </div>
          <div className={`question-card ${voiceSpeaking ? "speaking" : ""}`}>
            <blockquote aria-label={question}>
              “
              {questionWords.map((word, index) => (
                <span
                  className={index < spokenWordCount ? "spoken" : "pending"}
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
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder="Your transcribed answer will appear here. You can edit it before submitting..."
            disabled={busy || Boolean(turnEvaluation)}
          />
          <div className="answer-actions">
            <button
              className={`mic-btn ${listening ? "listening" : ""}`}
              aria-label={listening ? "Stop recording" : "Start recording"}
              onClick={onToggleRecording}
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
                onClick={onEvaluate}
                disabled={busy || !answer.trim()}
              >
                Evaluate answer
              </button>
            ) : (
              <>
                <button
                  className="secondary-btn"
                  onClick={onEditAnswer}
                  disabled={busy}
                >
                  Edit answer
                </button>
                <button
                  className="primary-btn"
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
                ((completedTurns + (turnEvaluation ? 1 : 0)) / totalQuestions) *
                  100,
              )}
              %
            </strong>
            <span>completed</span>
          </div>
        </div>
      </aside>
    </motion.section>
  );
}
