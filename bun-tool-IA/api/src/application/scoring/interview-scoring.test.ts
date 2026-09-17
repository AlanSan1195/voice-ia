import { describe, expect, test } from "bun:test";
import {
  buildInterviewFeedback,
  calculateTurnEvaluation,
  turnAssessmentSchema,
  type FeedbackNarrative,
  type TurnAssessment,
} from "./interview-scoring";

const assessment: TurnAssessment = {
  englishScore: 8,
  professionalEnglishScore: 6,
  technicalScore: 7,
  relevanceScore: 9,
  structureScore: 8,
  clarityScore: 7,
  observedEnglishLevel: "B1",
  feedback: "Respuesta clara y relevante.",
  strengths: ["Explica una decisión concreta."],
  priorityImprovement: "Añade el resultado obtenido.",
  correctedAnswer: "I improved the service.",
  nextLevelAnswer: "I improved the service and reduced latency by 20%.",
};
const narrative: FeedbackNarrative = {
  summary: "Buen progreso.",
  strengths: [{ label: "Claridad", description: "Ideas comprensibles." }],
  gaps: [{ label: "Evidencia", description: "Faltan resultados medibles." }],
  recommendations: [
    {
      label: "STAR",
      description: "Practica respuestas con contexto y resultado.",
    },
  ],
};

describe("interview scoring", () => {
  test("calculates deterministic level and job-readiness scores", () => {
    const result = calculateTurnEvaluation(assessment);
    expect(result.levelScore).toBe(7.9);
    expect(result.jobReadinessScore).toBe(7.4);
    expect(result.technicalScore).toBe(7);
  });

  test("rejects missing or out-of-range model dimensions", () => {
    expect(() =>
      turnAssessmentSchema.parse({ ...assessment, technicalScore: 11 }),
    ).toThrow();
    const { clarityScore: _clarity, ...missing } = assessment;
    expect(() => turnAssessmentSchema.parse(missing)).toThrow();
  });

  test("accepts extra strengths and keeps the two most relevant", () => {
    const parsed = turnAssessmentSchema.parse({
      ...assessment,
      strengths: [
        "Explica una decisión concreta.",
        "Describe el manejo de errores.",
        "Menciona cómo mantuvo la interfaz sincronizada.",
      ],
    });

    expect(calculateTurnEvaluation(parsed).strengths).toEqual([
      "Explica una decisión concreta.",
      "Describe el manejo de errores.",
    ]);
  });

  test("uses saved turn evaluations for final averages", () => {
    const first = calculateTurnEvaluation(assessment);
    const second = calculateTurnEvaluation({
      ...assessment,
      englishScore: 6,
      professionalEnglishScore: 5,
      technicalScore: 9,
      observedEnglishLevel: "B2",
    });
    const feedback = buildInterviewFeedback(
      [
        { question: "Q1", answer: "A1", evaluation: first },
        { question: "Q2", answer: "A2", evaluation: second },
      ],
      narrative,
    );
    expect(feedback.levelScore).toBe(7.9);
    expect(feedback.jobReadinessScore).toBe(7.7);
    expect(feedback.dimensionAverages.technical).toBe(8);
    expect(feedback.turnReviews[0]?.levelScore).toBe(first.levelScore);
  });
});
