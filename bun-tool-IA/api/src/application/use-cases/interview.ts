import { z } from "zod";
import type { AiGateway } from "../ports/ai";
import { TOTAL_QUESTIONS, type InterviewContext, type InterviewProfile, type InterviewTurn, type QuestionResult } from "../../domain/interview";
import { buildInterviewFeedback, calculateTurnEvaluation, feedbackNarrativeSchema, turnAssessmentSchema } from "../scoring/interview-scoring";

export const contextSchema = z.object({
  jobDescription: z.string().max(18000).default(""),
  cvText: z.string().max(18000).default(""),
  profile: z.object({ role: z.string(), summary: z.string(), focusAreas: z.array(z.string()) }),
  englishLevel: z.enum(["A1", "A2", "B1", "B2"]).default("B1"),
});
const turnEvaluationSchema = z.object({
  levelScore: z.number().min(1).max(10), jobReadinessScore: z.number().min(1).max(10), englishScore: z.number().min(1).max(10), technicalScore: z.number().min(1).max(10), relevanceScore: z.number().min(1).max(10), structureScore: z.number().min(1).max(10), observedEnglishLevel: z.enum(["A1", "A2", "B1", "B2"]), feedback: z.string().min(1), strengths: z.array(z.string().min(1)).min(1), priorityImprovement: z.string().min(1), correctedAnswer: z.string().min(1), nextLevelAnswer: z.string().min(1),
});
const turnSchema = z.object({ question: z.string().min(1), answer: z.string().min(1), evaluation: turnEvaluationSchema.optional() });
export const turnsSchema = z.array(turnSchema).max(3);
const evaluatedTurnsSchema = z.array(turnSchema.extend({ evaluation: turnEvaluationSchema })).min(1).max(3);
export const sourceSchema = z.object({ jobDescription: z.string().max(18000).default(""), cvText: z.string().max(18000).default(""), englishLevel: z.enum(["A1", "A2", "B1", "B2"]).default("B1"), questionCount: z.number().int().min(3).max(3).default(3) });

function assertSource(jobDescription: string, cvText: string) {
  if (jobDescription.trim().length < 20 && cvText.trim().length < 80) throw new Error("Añade una descripción del puesto o un CV con más contexto.");
}
export function createInterviewUseCases(ai: AiGateway) {
  return {
    async start(input: z.input<typeof sourceSchema>) {
      const parsed = sourceSchema.parse(input); assertSource(parsed.jobDescription, parsed.cvText);
      const result = await ai.generate({ kind: "start", context: { jobDescription: parsed.jobDescription.trim(), cvText: parsed.cvText.trim(), englishLevel: parsed.englishLevel }, questionCount: parsed.questionCount });
      const value = result.value as { profile: InterviewProfile; question: QuestionResult };
      return { ...result, value: { ...value, question: { ...value.question, index: 0 } } };
    },
    async next(input: { context: InterviewContext; turns: InterviewTurn[]; questionCount?: number }) {
      const context = contextSchema.parse(input.context); const turns = turnsSchema.parse(input.turns);
      if (!turns.length) throw new Error("Se necesita al menos una respuesta para continuar.");
      const result = await ai.generate({ kind: "next", context, turns, questionCount: input.questionCount ?? 3 });
      const value = result.value as { question: QuestionResult };
      return { ...result, value: { ...value, question: { ...value.question, index: turns.length } } };
    },
    async feedback(input: { context: InterviewContext; turns: InterviewTurn[] }) {
      const context = contextSchema.parse(input.context); const turns = evaluatedTurnsSchema.parse(input.turns);
      const result = await ai.generate({ kind: "feedback", context, turns });
      const narrative = feedbackNarrativeSchema.parse(result.value);
      return { ...result, value: buildInterviewFeedback(turns, narrative) };
    },
    async evaluateTurn(input: { context: InterviewContext; question: string; answer: string; turnIndex: number }) {
      const context = contextSchema.parse(input.context);
      const question = z.string().min(1).parse(input.question);
      const answer = z.string().min(1).parse(input.answer);
      const receivedIndex = z.number().int().min(0).max(TOTAL_QUESTIONS).parse(input.turnIndex);
      const turnIndex = Math.min(receivedIndex, TOTAL_QUESTIONS - 1);
      const result = await ai.generate({ kind: "turnEvaluation", context, question, answer, turnIndex });
      const assessment = turnAssessmentSchema.parse(result.value);
      return { ...result, value: calculateTurnEvaluation(assessment) };
    },
  };
}
