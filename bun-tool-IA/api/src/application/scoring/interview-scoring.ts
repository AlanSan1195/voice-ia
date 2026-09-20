import { z } from "zod";
import type {
  EnglishLevel,
  FeedbackItem,
  InterviewCoaching,
  InterviewFeedback,
  InterviewNextPractice,
  InterviewTurn,
  InterviewTurnEvaluation,
} from "../../domain/interview";

const score = z.number().min(1).max(10);
const feedbackItemSchema = z
  .object({ label: z.string().min(1), description: z.string().min(1) })
  .strict();

export const coachingLanguageSchema = z
  .object({
    original: z.string().trim().min(1).max(240),
    replacement: z.string().trim().min(1).max(240),
    why: z.string().trim().min(1).max(280),
  })
  .strict();
export const coachingInterviewSchema = z
  .object({
    skill: z.enum(["technical", "relevance", "structure"]),
    evidence: z.string().trim().min(1).max(360).optional(),
    technique: z.string().trim().min(1).max(280),
    action: z.string().trim().min(1).max(280),
    miniChallenge: z.string().trim().min(1).max(280),
  })
  .strict();
export const coachingSchema = z
  .object({
    language: coachingLanguageSchema.optional(),
    interview: coachingInterviewSchema,
  })
  .strict();

// Coaching is an enrichment. A malformed optional block must not discard the
// scores and feedback that are required to continue the interview.
export const coachingFieldSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  const parsed = coachingSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}, coachingSchema.optional());

export const turnAssessmentSchema = z
  .object({
    englishScore: score,
    professionalEnglishScore: score,
    technicalScore: score,
    relevanceScore: score,
    structureScore: score,
    clarityScore: score,
    observedEnglishLevel: z.enum(["A1", "A2", "B1", "B2"]),
    feedback: z.string().min(1),
    strengths: z.array(z.string().min(1)).min(1),
    priorityImprovement: z.string().min(1),
    correctedAnswer: z.string().min(1),
    nextLevelAnswer: z.string().min(1),
    coaching: coachingFieldSchema,
  })
  .strict();

export const feedbackNarrativeSchema = z
  .object({
    summary: z.string().min(1),
    strengths: z.array(feedbackItemSchema).min(1),
    gaps: z.array(feedbackItemSchema).min(1),
    recommendations: z.array(feedbackItemSchema).min(1),
  })
  .strict();

export type TurnAssessment = z.infer<typeof turnAssessmentSchema>;
export type FeedbackNarrative = z.infer<typeof feedbackNarrativeSchema>;

function appearsExactlyOnce(answer: string, quote: string) {
  const first = answer.indexOf(quote);
  return first !== -1 && first === answer.lastIndexOf(quote);
}

export function sanitizeCoaching(
  coaching: InterviewCoaching | undefined,
  answer: string,
): InterviewCoaching | undefined {
  if (!coaching) return undefined;
  const language =
    coaching.language && appearsExactlyOnce(answer, coaching.language.original)
      ? coaching.language
      : undefined;
  const evidence =
    coaching.interview.evidence &&
    appearsExactlyOnce(answer, coaching.interview.evidence)
      ? coaching.interview.evidence
      : undefined;
  const { evidence: _rawEvidence, ...interview } = coaching.interview;
  return {
    ...(language ? { language } : {}),
    interview: {
      ...interview,
      ...(evidence ? { evidence } : {}),
    },
  };
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const average = (values: number[]) =>
  round1(values.reduce((sum, value) => sum + value, 0) / values.length);

export function calculateTurnEvaluation(
  assessment: TurnAssessment,
  answer?: string,
): InterviewTurnEvaluation {
  const coaching = answer
    ? sanitizeCoaching(assessment.coaching, answer)
    : assessment.coaching;
  return {
    levelScore: round1(
      assessment.englishScore * 0.3 +
        assessment.technicalScore * 0.25 +
        assessment.relevanceScore * 0.2 +
        assessment.structureScore * 0.15 +
        assessment.clarityScore * 0.1,
    ),
    jobReadinessScore: round1(
      assessment.technicalScore * 0.35 +
        assessment.relevanceScore * 0.25 +
        assessment.professionalEnglishScore * 0.2 +
        assessment.structureScore * 0.1 +
        assessment.clarityScore * 0.1,
    ),
    englishScore: assessment.englishScore,
    technicalScore: assessment.technicalScore,
    relevanceScore: assessment.relevanceScore,
    structureScore: assessment.structureScore,
    observedEnglishLevel: assessment.observedEnglishLevel,
    feedback: assessment.feedback,
    strengths: assessment.strengths.slice(0, 2),
    priorityImprovement: assessment.priorityImprovement,
    correctedAnswer: assessment.correctedAnswer,
    nextLevelAnswer: assessment.nextLevelAnswer,
    ...(coaching ? { coaching } : {}),
  };
}

function observedLevel(evaluations: InterviewTurnEvaluation[]): EnglishLevel {
  const order: EnglishLevel[] = ["A1", "A2", "B1", "B2"];
  const sorted = evaluations
    .map((item) => order.indexOf(item.observedEnglishLevel))
    .sort((a, b) => a - b);
  const medianIndex = sorted[Math.floor(sorted.length / 2)] ?? 2;
  return order[medianIndex] ?? "B1";
}

const practiceContent: Record<
  InterviewNextPractice["skill"],
  { label: string; action: string; miniChallenge: string }
> = {
  english: {
    label: "inglés preciso",
    action:
      "Reformula una frase de cada respuesta con un verbo preciso y una idea por oración.",
    miniChallenge:
      "Elige una respuesta y repítela en 30 segundos usando dos verbos precisos.",
  },
  technical: {
    label: "contenido técnico",
    action:
      "Explica la decisión técnica y añade una consecuencia concreta que puedas respaldar.",
    miniChallenge:
      "Resume una decisión técnica en 30 segundos: problema, decisión y efecto conocido.",
  },
  relevance: {
    label: "relevancia para la pregunta",
    action:
      "Responde primero a lo que pregunta la persona entrevistadora y elimina detalles que no ayuden.",
    miniChallenge:
      "Responde una pregunta en 30 segundos empezando por la idea principal y un solo ejemplo.",
  },
  structure: {
    label: "estructura de la respuesta",
    action:
      "Ordena la respuesta con contexto breve, acción y un resultado que realmente conozcas.",
    miniChallenge:
      "Ensaya una respuesta en 30 segundos con contexto, acción y resultado comprobable.",
  },
};

const practiceDimensions: Array<{
  skill: InterviewNextPractice["skill"];
  score: (evaluation: InterviewTurnEvaluation) => number;
}> = [
  { skill: "english", score: (evaluation) => evaluation.englishScore },
  { skill: "technical", score: (evaluation) => evaluation.technicalScore },
  { skill: "relevance", score: (evaluation) => evaluation.relevanceScore },
  { skill: "structure", score: (evaluation) => evaluation.structureScore },
];

function buildNextPractice(
  turns: InterviewTurn[],
): InterviewNextPractice | undefined {
  const evaluations = turns
    .map((turn) => turn.evaluation)
    .filter((item): item is InterviewTurnEvaluation => Boolean(item))
    .slice(0, 3);
  if (!evaluations.length) return undefined;

  const coachingIndices = new Map<InterviewNextPractice["skill"], number[]>();
  evaluations.forEach((evaluation, index) => {
    const skills: InterviewNextPractice["skill"][] = [];
    if (evaluation.coaching?.language) skills.push("english");
    if (evaluation.coaching?.interview.skill)
      skills.push(evaluation.coaching.interview.skill);
    skills.forEach((skill) => {
      const indices = coachingIndices.get(skill) ?? [];
      if (!indices.includes(index)) indices.push(index);
      coachingIndices.set(skill, indices);
    });
  });

  const repeatedCoaching = [...coachingIndices.entries()]
    .filter(([, indices]) => indices.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (repeatedCoaching) {
    const [skill, turnIndices] = repeatedCoaching;
    const content = practiceContent[skill];
    return {
      skill,
      observation: `El foco de coaching se repitió en los turnos ${turnIndices.map((index) => index + 1).join(" y ")}: ${content.label}.`,
      turnIndices,
      action: content.action,
      miniChallenge: content.miniChallenge,
    };
  }

  const dimensions = practiceDimensions.map(({ skill, score }) => {
    const scores = evaluations.map(score);
    return {
      skill,
      scores,
      average: average(scores),
    };
  });
  const weakest = dimensions.reduce((current, candidate) =>
    candidate.average < current.average ? candidate : current,
  );
  const weakestIndex = weakest.scores.reduce(
    (currentIndex, score, index, scores) =>
      score < (scores[currentIndex] ?? Number.POSITIVE_INFINITY)
        ? index
        : currentIndex,
    0,
  );
  const repeatedWeakness = weakest.scores
    .map((score, index) => (score <= 6 ? index : -1))
    .filter((index) => index >= 0);
  const turnIndices =
    repeatedWeakness.length >= 2 ? repeatedWeakness : [weakestIndex];
  const content = practiceContent[weakest.skill];
  return {
    skill: weakest.skill,
    observation:
      turnIndices.length >= 2
        ? `La dimensión con menor promedio fue ${content.label} (${weakest.average}/10) en los turnos ${turnIndices.map((index) => index + 1).join(" y ")}.`
        : `La dimensión con menor promedio fue ${content.label} (${weakest.average}/10); el turno ${weakestIndex + 1} fue el más bajo en esta dimensión.`,
    turnIndices,
    action: content.action,
    miniChallenge: content.miniChallenge,
  };
}

export function buildInterviewFeedback(
  turns: InterviewTurn[],
  narrative: FeedbackNarrative,
): InterviewFeedback {
  const evaluations = turns
    .map((turn) => turn.evaluation)
    .filter((item): item is InterviewTurnEvaluation => Boolean(item));
  if (!evaluations.length || evaluations.length !== turns.length)
    throw new Error(
      "Todas las respuestas deben estar evaluadas antes de generar el resultado final.",
    );
  const levelScore = average(evaluations.map((item) => item.levelScore));
  return {
    overallScore: Math.round(levelScore * 10),
    levelScore,
    jobReadinessScore: average(
      evaluations.map((item) => item.jobReadinessScore),
    ),
    englishLevel: observedLevel(evaluations),
    dimensionAverages: {
      english: average(evaluations.map((item) => item.englishScore)),
      technical: average(evaluations.map((item) => item.technicalScore)),
      relevance: average(evaluations.map((item) => item.relevanceScore)),
      structure: average(evaluations.map((item) => item.structureScore)),
    },
    summary: narrative.summary,
    strengths: narrative.strengths as FeedbackItem[],
    gaps: narrative.gaps as FeedbackItem[],
    recommendations: narrative.recommendations as FeedbackItem[],
    nextPractice: buildNextPractice(turns),
    turnReviews: evaluations.map((item, turnIndex) => ({
      turnIndex,
      levelScore: item.levelScore,
      jobReadinessScore: item.jobReadinessScore,
      feedback: item.feedback,
      correctedAnswer: item.correctedAnswer,
    })),
  };
}
