import { RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import type {
  EnglishLevel,
  Feedback,
  NextPractice,
  Profile,
  Turn,
} from "./InterviewApp.types";
import { ui } from "./uiClasses";

const practiceSkillLabels: Record<NextPractice["skill"], string> = {
  english: "Inglés preciso",
  technical: "Contenido técnico",
  relevance: "Relevancia para la pregunta",
  structure: "Estructura de la respuesta",
};

function NextPracticeCard({
  practice,
  turns,
}: {
  practice: NextPractice;
  turns: Turn[];
}) {
  const references = practice.turnIndices.filter((index) => turns[index]);
  const isPattern = references.length >= 2;

  return (
    <section
      className="mt-6 rounded-[18px] border border-[rgb(198_242_107_/_38%)] bg-[rgb(198_242_107_/_9%)] p-5"
      aria-labelledby="next-practice-title"
    >
      <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-accent">
        {isPattern ? "Patrón observado" : "Prioridad de práctica"}
      </div>
      <h3
        id="next-practice-title"
        className="mt-2 text-[1.15rem] font-bold tracking-[-0.02em] text-ink"
      >
        {practiceSkillLabels[practice.skill]}
      </h3>
      <p className="mt-2 max-w-[720px] text-[0.92rem] leading-[1.6] text-ink">
        {practice.observation}
      </p>
      {references.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.78rem] text-muted">
          <span>Basado en:</span>
          {references.map((index) => (
            <a
              className="rounded-full border border-line bg-white/[0.06] px-2.5 py-1 font-semibold text-accent-2 underline decoration-transparent underline-offset-2 transition hover:decoration-current focus:outline-none focus:ring-2 focus:ring-[rgb(198_242_107_/_60%)] motion-reduce:transition-none"
              href={`#turn-review-${index}`}
              key={index}
            >
              Turno {index + 1}
            </a>
          ))}
        </div>
      )}
      <div className="mt-4 grid gap-3 min-[650px]:grid-cols-2">
        <p className="m-0 rounded-[14px] bg-white/[0.06] p-3 text-[0.86rem] leading-[1.55] text-ink">
          <strong>Qué hacer:</strong> {practice.action}
        </p>
        <p className="m-0 rounded-[14px] bg-white/[0.06] p-3 text-[0.86rem] leading-[1.55] text-ink">
          <strong>Reto de 30 segundos:</strong> {practice.miniChallenge}
        </p>
      </div>
    </section>
  );
}

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
        <div className={ui.panel}>
          <div className={ui.eyebrow}>Session incomplete</div>
          <h2 className="mt-3 text-[clamp(1.5rem,3vw,2.7rem)] font-bold tracking-[-0.05em]">
            This interview has no final feedback yet.
          </h2>
          <p className="my-5 max-w-[500px] text-[1.05rem] leading-[1.7] text-muted">
            You can start a new interview. Incomplete sessions remain
            recoverable in your local archive.
          </p>
          <button className={ui.primary} onClick={onReset}>
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
      <div className={ui.panel}>
        <div className="flex items-start justify-between gap-5 max-[560px]:flex-col">
          <div>
            <div className={ui.eyebrow}>Session complete · {profile.role}</div>
            <h2 className="my-2 text-[clamp(1.5rem,3vw,2.7rem)] font-bold leading-[1.06] tracking-[-0.05em]">
              Make the next answer{" "}
              <span className="text-accent">stronger.</span>
            </h2>
            <p className="m-0 max-w-[500px] text-[1.05rem] leading-[1.7] text-muted">
              {feedback.summary}
            </p>
          </div>
          <div
            className="relative mb-[22px] grid size-[116px] place-items-center rounded-full bg-[conic-gradient(var(--color-accent)_var(--score),rgb(255_255_255_/_8%)_0)] after:absolute after:inset-[9px] after:rounded-full after:bg-panel-hi"
            style={{
              ["--score" as string]: `${feedback.levelScore * 10}%`,
            }}
          >
            <strong className="z-10 text-[1.8rem]">
              {feedback.levelScore}
              <small className="block text-center text-[0.65rem] text-muted">
                /10
              </small>
            </strong>
          </div>
        </div>
        {feedback.nextPractice && (
          <NextPracticeCard practice={feedback.nextPractice} turns={turns} />
        )}
        <div className="mt-6 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <div className="rounded-[17px] border border-[rgb(198_242_107_/_38%)] bg-[rgb(198_242_107_/_9%)] p-4">
            <span className="block text-[0.72rem] text-muted">
              Progreso en {englishLevel}
            </span>
            <strong className="mt-2 block text-[2rem] leading-none text-accent">
              {feedback.levelScore}
              <small className="ml-[3px] text-[0.75rem] text-muted">/10</small>
            </strong>
          </div>
          <div className="rounded-[17px] border border-line bg-white/[0.04] p-4">
            <span className="block text-[0.72rem] text-muted">
              Preparación laboral
            </span>
            <strong className="mt-2 block text-[2rem] leading-none text-ink">
              {feedback.jobReadinessScore}
              <small className="ml-[3px] text-[0.75rem] text-muted">/10</small>
            </strong>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-2.5 max-[560px]:grid-cols-2">
          <div className={ui.metric}>
            <strong className={ui.metricValue}>{feedback.englishLevel}</strong>
            <span className={ui.metricLabel}>Observed English</span>
          </div>
          <div className={ui.metric}>
            <strong className={ui.metricValue}>
              {feedback.dimensionAverages.english}/10
            </strong>
            <span className={ui.metricLabel}>English progress</span>
          </div>
          <div className={ui.metric}>
            <strong className={ui.metricValue}>
              {feedback.dimensionAverages.technical}/10
            </strong>
            <span className={ui.metricLabel}>Technical</span>
          </div>
          <div className={ui.metric}>
            <strong className={ui.metricValue}>
              {feedback.dimensionAverages.relevance}/10
            </strong>
            <span className={ui.metricLabel}>Relevance</span>
          </div>
          <div className={ui.metric}>
            <strong className={ui.metricValue}>
              {feedback.dimensionAverages.structure}/10
            </strong>
            <span className={ui.metricLabel}>Structure</span>
          </div>
        </div>
        <div className="my-6 grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
          <div className="rounded-[18px] bg-white/[0.045] p-[18px]">
            <h3 className="mb-3 text-[0.75rem] uppercase tracking-[0.12em] text-muted">
              Strengths
            </h3>
            {feedback.strengths.map((item) => (
              <p className="text-[0.85rem] leading-[1.55]" key={item.label}>
                <strong>{item.label}.</strong> {item.description}
              </p>
            ))}
          </div>
          <div className="rounded-[18px] bg-white/[0.045] p-[18px]">
            <h3 className="mb-3 text-[0.75rem] uppercase tracking-[0.12em] text-muted">
              Gaps
            </h3>
            {feedback.gaps.map((item) => (
              <p className="text-[0.85rem] leading-[1.55]" key={item.label}>
                <strong>{item.label}.</strong> {item.description}
              </p>
            ))}
          </div>
          <div className="rounded-[18px] bg-white/[0.045] p-[18px]">
            <h3 className="mb-3 text-[0.75rem] uppercase tracking-[0.12em] text-muted">
              Next practice
            </h3>
            {feedback.recommendations.map((item) => (
              <p className="text-[0.85rem] leading-[1.55]" key={item.label}>
                <strong>{item.label}.</strong> {item.description}
              </p>
            ))}
          </div>
        </div>
        <h3 className={`${ui.panelLabel} mt-8`}>Turn-by-turn review</h3>
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
              className="border-t border-line py-[18px]"
              id={`turn-review-${index}`}
              key={`${turn.question}-${index}`}
            >
              <h3 className="mb-2 text-base font-bold">
                {index + 1}. {turn.question}{" "}
                <span className={ui.chip}>Nivel {levelScore}/10</span>{" "}
                <span className={ui.chip}>Trabajo {jobScore}/10</span>
              </h3>
              <p className="my-[5px] text-[0.88rem] leading-[1.55] text-muted">
                <strong>Your answer:</strong> {turn.answer}
              </p>
              {review && (
                <>
                  <p className="my-[5px] text-[0.88rem] leading-[1.55] text-muted">
                    {review.feedback}
                  </p>
                  <p className="my-[5px] text-[0.88rem] leading-[1.55] text-ink">
                    <strong>Stronger English:</strong> {review.correctedAnswer}
                  </p>
                </>
              )}
            </div>
          );
        })}
        <div className="mt-7 flex items-center justify-between gap-3 max-[560px]:flex-col-reverse max-[560px]:items-stretch">
          <button className={ui.secondary} onClick={onReset}>
            <RotateCcw size={16} /> New interview
          </button>
          {activeSessionId !== "active" && (
            <button className={ui.secondary} onClick={onDeleteCurrentSession}>
              Delete session
            </button>
          )}
          <button className={ui.primary} onClick={onExportSession}>
            Export session
          </button>
        </div>
      </div>
    </motion.section>
  );
}
