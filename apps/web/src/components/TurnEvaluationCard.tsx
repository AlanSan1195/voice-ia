import {
  ArrowRight,
  ChevronDown,
  Lightbulb,
  PenLine,
  Quote,
} from "lucide-react";
import { useState } from "react";
import type {
  EnglishLevel,
  InterviewCoaching,
  TurnEvaluation,
} from "./InterviewApp.types";

type TurnEvaluationCardProps = {
  evaluation: TurnEvaluation;
  englishLevel: EnglishLevel;
};

const skillLabels: Record<InterviewCoaching["interview"]["skill"], string> = {
  technical: "Contenido técnico",
  relevance: "Relevancia para la pregunta",
  structure: "Estructura de la respuesta",
};

function CoachingBlock({ coaching }: { coaching: InterviewCoaching }) {
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const { interview, language } = coaching;

  return (
    <section
      className="mt-5 border-t border-line pt-5"
      aria-labelledby="coaching-title"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[rgb(198_242_107_/_12%)] text-accent">
          <Lightbulb size={17} aria-hidden="true" />
        </div>
        <div>
          <h3 id="coaching-title" className="m-0 text-base font-bold text-ink">
            Una mejora concreta para tu próxima respuesta
          </h3>
          <p className="mt-1 text-[0.8rem] leading-[1.5] text-muted">
            Mira el cambio, entiende el motivo y practícalo solo si te resulta
            útil.
          </p>
        </div>
      </div>

      <section className="mt-4 rounded-[15px] bg-[rgb(140_199_255_/_8%)] p-4">
        <h4 className="m-0 flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-accent-2">
          <ArrowRight size={14} aria-hidden="true" />
          Qué cambiaría
        </h4>
        <p className="mt-2 text-[0.9rem] leading-[1.55] text-ink">
          {interview.action}
        </p>
      </section>

      {language && (
        <section
          className="mt-4 rounded-[15px] border border-line bg-white/[0.035] p-4"
          aria-labelledby="language-coaching-title"
        >
          <h4
            id="language-coaching-title"
            className="m-0 flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-muted"
          >
            <PenLine size={14} aria-hidden="true" />
            Corrección en contexto
          </h4>
          <div className="mt-3 grid gap-3 min-[650px]:grid-cols-2">
            <div>
              <span className="text-[0.68rem] uppercase tracking-[0.1em] text-subtle">
                Tu frase
              </span>
              <p className="m-0 mt-1 leading-[1.55] text-ink">
                <del className="rounded bg-[rgb(229_111_98_/_16%)] px-1 text-[#ffb2a8] decoration-[#e56f62] decoration-2">
                  {language.original}
                </del>
              </p>
            </div>
            <div>
              <span className="text-[0.68rem] uppercase tracking-[0.1em] text-subtle">
                Alternativa clara
              </span>
              <p className="m-0 mt-1 leading-[1.55] text-ink">
                <ins className="rounded bg-[rgb(198_242_107_/_13%)] px-1 text-accent decoration-accent decoration-2">
                  {language.replacement}
                </ins>
              </p>
            </div>
          </div>
          <p className="mt-3 border-t border-line pt-3 text-[0.86rem] leading-[1.55] text-muted">
            <strong className="text-ink">Por qué:</strong> {language.why}
          </p>
        </section>
      )}

      <section
        className="mt-4 rounded-[15px] border border-line bg-white/[0.035] p-4"
        aria-labelledby="interview-coaching-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4
              id="interview-coaching-title"
              className="m-0 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-muted"
            >
              Habilidad para practicar
            </h4>
            <p className="m-0 mt-2 text-[0.9rem] font-semibold text-ink">
              {skillLabels[interview.skill]}
            </p>
          </div>
          <Quote
            size={18}
            className="shrink-0 text-accent-2"
            aria-hidden="true"
          />
        </div>
        {interview.evidence && (
          <blockquote className="mt-3 border-l-2 border-accent-2 pl-3 text-[0.86rem] leading-[1.55] text-muted">
            “{interview.evidence}”
          </blockquote>
        )}
        <p className="mt-3 text-[0.86rem] leading-[1.55] text-muted">
          <strong className="text-ink">Técnica:</strong> {interview.technique}
        </p>
      </section>

      <section className="mt-4 rounded-[15px] bg-[rgb(140_199_255_/_8%)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="m-0 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-accent-2">
              Prueba opcional · 30 segundos
            </h4>
            <p className="m-0 mt-2 text-[0.88rem] leading-[1.55] text-ink">
              {interview.miniChallenge}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-2 text-[0.72rem] font-bold text-ink transition hover:bg-white/[0.14] focus:outline-none focus:ring-2 focus:ring-[rgb(198_242_107_/_60%)] motion-reduce:transition-none"
            onClick={() => setPracticeOpen((open) => !open)}
            aria-expanded={practiceOpen}
            aria-controls="optional-practice"
          >
            {practiceOpen ? "Ocultar" : "Practicar"}
            <ChevronDown
              size={14}
              className={`transition-transform motion-reduce:transition-none ${practiceOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
        {practiceOpen && (
          <div id="optional-practice" className="mt-3">
            <label
              htmlFor="practice-answer"
              className="text-[0.72rem] font-semibold text-muted"
            >
              Tu intento (no se califica ni se guarda)
            </label>
            <textarea
              id="practice-answer"
              className="mt-2 min-h-[88px] w-full resize-y rounded-[13px] border border-line bg-[rgb(5_7_11_/_38%)] p-3 text-[0.86rem] leading-[1.5] text-ink outline-none placeholder:text-subtle focus:border-[rgb(198_242_107_/_65%)] focus:shadow-[0_0_0_3px_rgb(198_242_107_/_8%)]"
              value={practiceAnswer}
              onChange={(event) => setPracticeAnswer(event.target.value)}
              placeholder="Escribe o ensaya aquí tu versión…"
            />
          </div>
        )}
      </section>
    </section>
  );
}

export function TurnEvaluationCard({
  evaluation,
  englishLevel,
}: TurnEvaluationCardProps) {
  return (
    <div
      className="mt-5 rounded-[18px] border border-[rgb(199_255_105_/_28%)] bg-gradient-to-br from-[rgb(199_255_105_/_9%)] to-white/[0.03] p-[22px]"
      role="region"
      aria-labelledby="turn-feedback-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-accent">
            Respuesta evaluada
          </div>
          <h3
            id="turn-feedback-title"
            className="mt-2 text-[1.2rem] font-bold tracking-[-0.02em] text-ink"
          >
            Convierte este feedback en tu siguiente mejora
          </h3>
        </div>
        <div className="rounded-full bg-[rgb(198_242_107_/_10%)] px-3 py-1.5 text-[0.72rem] font-semibold text-accent">
          {evaluation.observedEnglishLevel}
        </div>
      </div>

      <p className="mt-4 leading-[1.6] text-ink">{evaluation.feedback}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        <section className="rounded-[15px] bg-white/[0.045] p-4">
          <h4 className="m-0 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-muted">
            Lo que funcionó
          </h4>
          <ul className="mt-2 space-y-2 pl-4 text-[0.88rem] leading-[1.5] text-ink marker:text-accent">
            {evaluation.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-[15px] bg-white/[0.045] p-4">
          <h4 className="m-0 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-muted">
            Mejora prioritaria
          </h4>
          <p className="m-0 mt-2 text-[0.88rem] leading-[1.5] text-ink">
            {evaluation.priorityImprovement}
          </p>
        </section>
      </div>

      {evaluation.coaching ? (
        <CoachingBlock coaching={evaluation.coaching} />
      ) : (
        <p className="mt-4 border-t border-line pt-4 text-[0.82rem] leading-[1.5] text-muted">
          Puedes continuar con la siguiente pregunta; no hay una práctica
          adicional disponible para este turno.
        </p>
      )}

      <section className="mt-5 border-t border-line pt-5" aria-label="Métricas">
        <div className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted">
          Métricas de esta respuesta
        </div>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <div className="rounded-[15px] border border-[rgb(198_242_107_/_38%)] bg-[rgb(198_242_107_/_9%)] p-4">
            <span className="block text-[0.72rem] text-muted">
              Progreso en {englishLevel}
            </span>
            <strong className="mt-2 block text-3xl leading-none text-accent">
              {evaluation.levelScore}
              <small className="ml-[3px] text-xs text-muted">/10</small>
            </strong>
          </div>
          <div className="rounded-[15px] border border-line bg-white/[0.04] p-4">
            <span className="block text-[0.72rem] text-muted">
              Preparación laboral
            </span>
            <strong className="mt-2 block text-3xl leading-none text-ink">
              {evaluation.jobReadinessScore}
              <small className="ml-[3px] text-xs text-muted">/10</small>
            </strong>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 max-[560px]:grid-cols-2">
          {[
            [evaluation.englishScore, "English"],
            [evaluation.technicalScore, "Técnico"],
            [evaluation.relevanceScore, "Relevancia"],
            [evaluation.structureScore, "Estructura"],
          ].map(([score, label]) => (
            <div
              className="rounded-[13px] bg-white/[0.045] p-[11px]"
              key={label}
            >
              <strong className="block text-base text-ink">{score}</strong>
              <span className="mt-0.5 block text-[0.65rem] text-muted">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 border-t border-line pt-4">
        <p className="m-0 text-[0.9rem] leading-[1.6] text-ink">
          <strong>Tu respuesta corregida:</strong> {evaluation.correctedAnswer}
        </p>
        <p className="mt-3 rounded-[14px] bg-[rgb(140_199_255_/_8%)] p-4 leading-[1.6] text-ink">
          <strong>Respuesta para tu siguiente nivel:</strong>{" "}
          {evaluation.nextLevelAnswer}
        </p>
      </section>
    </div>
  );
}
