import { RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import type {
  EnglishLevel,
  Feedback,
  Profile,
  Turn,
} from "./InterviewApp.types";

type ResultsStageProps = {
  profile: Profile;
  feedback: Feedback | null;
  englishLevel: EnglishLevel;
  turns: Turn[];
  activeSessionId: string;
  onReset: () => void;
  onDeleteCurrentSession: () => void;
  onExportSession: () => void;
};

export function ResultsStage({
  profile,
  feedback,
  englishLevel,
  turns,
  activeSessionId,
  onReset,
  onDeleteCurrentSession,
  onExportSession,
}: ResultsStageProps) {
  if (!feedback)
    return (
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
          <button className="primary-btn" onClick={onReset}>
            <RotateCcw size={16} /> New interview
          </button>
        </div>
      </motion.section>
    );

  return (
    <motion.section
      key="results"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="panel">
        <div className="interview-head">
          <div>
            <div className="eyebrow">Session complete · {profile.role}</div>
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
            <div className="turn-review" key={`${turn.question}-${index}`}>
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
                    <strong>Stronger English:</strong> {review.correctedAnswer}
                  </p>
                </>
              )}
            </div>
          );
        })}
        <div className="answer-actions" style={{ marginTop: 28 }}>
          <button className="secondary-btn" onClick={onReset}>
            <RotateCcw size={16} /> New interview
          </button>
          {activeSessionId !== "active" && (
            <button className="secondary-btn" onClick={onDeleteCurrentSession}>
              Delete session
            </button>
          )}
          <button className="primary-btn" onClick={onExportSession}>
            Export session
          </button>
        </div>
      </div>
    </motion.section>
  );
}
