import type { EnglishLevel, TurnEvaluation } from "./InterviewApp.types";

type TurnEvaluationCardProps = {
  evaluation: TurnEvaluation;
  englishLevel: EnglishLevel;
};

export function TurnEvaluationCard({
  evaluation,
  englishLevel,
}: TurnEvaluationCardProps) {
  return (
    <div className="mt-5 rounded-[18px] border border-[rgb(199_255_105_/_28%)] bg-gradient-to-br from-[rgb(199_255_105_/_9%)] to-white/[0.03] p-[22px]">
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <div className="rounded-[17px] border border-[rgb(198_242_107_/_38%)] bg-[rgb(198_242_107_/_9%)] p-4">
          <span className="block text-[0.72rem] text-muted">
            Progreso en {englishLevel}
          </span>
          <strong className="mt-2 block text-3xl leading-none text-accent">
            {evaluation.levelScore}
            <small className="ml-[3px] text-xs text-muted">/10</small>
          </strong>
        </div>
        <div className="rounded-[17px] border border-line bg-white/[0.04] p-4">
          <span className="block text-[0.72rem] text-muted">
            Preparación laboral
          </span>
          <strong className="mt-2 block text-3xl leading-none text-ink">
            {evaluation.jobReadinessScore}
            <small className="ml-[3px] text-xs text-muted">/10</small>
          </strong>
        </div>
      </div>
      <div className="mt-3 text-[0.75rem] text-muted">
        Nivel demostrado en esta respuesta:{" "}
        <strong className="text-accent-2">
          {evaluation.observedEnglishLevel}
        </strong>
      </div>
      <p className="my-[18px] leading-[1.6] text-ink">{evaluation.feedback}</p>
      <div className="mt-[18px] grid grid-cols-4 gap-2 max-[560px]:grid-cols-2">
        <div className="rounded-[13px] bg-white/[0.045] p-[11px]">
          <strong className="block text-base text-ink">
            {evaluation.englishScore}
          </strong>
          <span className="mt-0.5 block text-[0.65rem] text-muted">
            English
          </span>
        </div>
        <div className="rounded-[13px] bg-white/[0.045] p-[11px]">
          <strong className="block text-base text-ink">
            {evaluation.technicalScore}
          </strong>
          <span className="mt-0.5 block text-[0.65rem] text-muted">
            Técnico
          </span>
        </div>
        <div className="rounded-[13px] bg-white/[0.045] p-[11px]">
          <strong className="block text-base text-ink">
            {evaluation.relevanceScore}
          </strong>
          <span className="mt-0.5 block text-[0.65rem] text-muted">
            Relevancia
          </span>
        </div>
        <div className="rounded-[13px] bg-white/[0.045] p-[11px]">
          <strong className="block text-base text-ink">
            {evaluation.structureScore}
          </strong>
          <span className="mt-0.5 block text-[0.65rem] text-muted">
            Estructura
          </span>
        </div>
      </div>
      <div className="mt-[18px] grid grid-cols-2 gap-[18px] text-[0.9rem] text-muted max-[560px]:grid-cols-1">
        <div>
          <b>Lo que funcionó</b>
          <ul className="mt-2 list-disc pl-[18px]">
            {evaluation.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <b>Mejora prioritaria</b>
          <p className="mt-2">{evaluation.priorityImprovement}</p>
        </div>
      </div>
      <p className="mt-[18px] border-t border-line pt-4 text-ink">
        <strong>Tu respuesta corregida:</strong> {evaluation.correctedAnswer}
      </p>
      <p className="mt-3 rounded-[14px] bg-[rgb(140_199_255_/_8%)] p-4 leading-[1.6] text-ink">
        <strong>Respuesta para tu siguiente nivel:</strong>{" "}
        {evaluation.nextLevelAnswer}
      </p>
    </div>
  );
}
