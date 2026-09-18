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
    <div className="turn-score">
      <div className="score-duo">
        <div className="score-card primary">
          <span>Progreso en {englishLevel}</span>
          <strong>
            {evaluation.levelScore}
            <small>/10</small>
          </strong>
        </div>
        <div className="score-card">
          <span>Preparación laboral</span>
          <strong>
            {evaluation.jobReadinessScore}
            <small>/10</small>
          </strong>
        </div>
      </div>
      <div className="observed-level">
        Nivel demostrado en esta respuesta:{" "}
        <strong>{evaluation.observedEnglishLevel}</strong>
      </div>
      <p className="score-feedback">{evaluation.feedback}</p>
      <div className="dimension-scores">
        <div>
          <strong>{evaluation.englishScore}</strong>
          <span>English</span>
        </div>
        <div>
          <strong>{evaluation.technicalScore}</strong>
          <span>Técnico</span>
        </div>
        <div>
          <strong>{evaluation.relevanceScore}</strong>
          <span>Relevancia</span>
        </div>
        <div>
          <strong>{evaluation.structureScore}</strong>
          <span>Estructura</span>
        </div>
      </div>
      <div className="turn-score-grid">
        <div>
          <b>Lo que funcionó</b>
          <ul>
            {evaluation.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <b>Mejora prioritaria</b>
          <p>{evaluation.priorityImprovement}</p>
        </div>
      </div>
      <p className="corrected">
        <strong>Tu respuesta corregida:</strong> {evaluation.correctedAnswer}
      </p>
      <p className="next-level-answer">
        <strong>Respuesta para tu siguiente nivel:</strong>{" "}
        {evaluation.nextLevelAnswer}
      </p>
    </div>
  );
}
