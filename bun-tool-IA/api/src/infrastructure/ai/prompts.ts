import type { AiPayload } from "../../application/ports/ai";
import { TOTAL_QUESTIONS } from "../../domain/interview";

export function promptFor(payload: AiPayload): string {
  const questionRules =
    "Write one direct question only, in natural spoken English. Keep it under 18 words when possible. Ask for one specific thing; never combine multiple questions, scenarios, or requests with 'and', 'or', or a question mark followed by another question. Avoid long introductions and compound prompts.";
  const level =
    payload.kind === "start"
      ? payload.context.englishLevel
      : payload.context.englishLevel;
  const levelRules: Record<string, string> = {
    A1: "Use very simple English, familiar words, short sentences, and explain only one basic technical idea.",
    A2: "Use simple English and common workplace vocabulary. Avoid idioms and assume the candidate may need extra processing time.",
    B1: "Use clear intermediate workplace English, one technical concept at a time, with limited idioms.",
    B2: "Use natural professional English and relevant technical nuance, but keep the question concise and avoid unnecessary idioms.",
  };
  const base = [
    "You are Vera, a rigorous but encouraging technical interviewer.",
    "The interview is in English. Return only valid JSON, no markdown.",
    "Questions must be current, role-specific, technically relevant, and useful for real hiring conversations.",
    `The candidate self-reported CEFR level is ${level}. ${levelRules[level] || levelRules.B1}`,
    questionRules,
  ];
  if (payload.kind === "start")
    return [
      ...base,
      `Generate exactly one opening question for a ${payload.questionCount || TOTAL_QUESTIONS}-question interview. It should be easy to understand and answer in about 60–90 seconds.`,
      "Return: {profile:{role,summary,focusAreas:string[]},question:{index:0,text}}.",
      `Job description:\n${payload.context.jobDescription || "(not provided)"}`,
      `Candidate CV:\n${payload.context.cvText || "(not provided)"}`,
    ].join("\n\n");
  if (payload.kind === "next")
    return [
      ...base,
      `This is question ${payload.turns.length + 1} of ${payload.questionCount}. Return exactly {question:{index,text}}. Use a zero-based index: 0, 1, or 2.`,
      "Do not repeat previous questions. Choose the single most useful follow-up based on the candidate's latest answer. Probe only one dimension: technical depth, trade-offs, ownership, or communication.",
      `Profile:\n${JSON.stringify(payload.context.profile)}`,
      `Previous turns:\n${payload.turns.map((turn, i) => `${i + 1}. Q: ${turn.question}\nA: ${turn.answer}`).join("\n")}`,
    ].join("\n\n");
  if (payload.kind === "turnEvaluation")
    return [
      ...base,
      "Evaluate only the candidate's latest answer. Be honest, evidence-based, specific, and encouraging. Do not inflate scores and do not penalize the same weakness in more than one dimension.",
      "Use this scale for every dimension: 1-2 unusable, 3-4 major gaps, 5-6 partial but workable, 7-8 solid, 9 excellent, 10 exceptional.",
      "englishScore is relative to the selected CEFR level. A1: reward understandable basic meaning despite grammar errors. A2: expect simple connected workplace sentences. B1: expect a clear explanation with reasons or an example. B2: expect precise professional English with relevant detail.",
      "professionalEnglishScore is absolute against a B2 professional interview benchmark. technicalScore and relevanceScore are absolute for the target role and must never be softened because of English level. structureScore measures organization. clarityScore measures whether the intended meaning is understandable.",
      "observedEnglishLevel is the level demonstrated in this answer and must not change the selected level. correctedAnswer must preserve the candidate's ideas and correct only their English. nextLevelAnswer must be an achievable improved answer approximately one CEFR step above, not an artificial native-level rewrite.",
      "Return exactly: {englishScore,professionalEnglishScore,technicalScore,relevanceScore,structureScore,clarityScore,observedEnglishLevel,feedback,strengths:string[],priorityImprovement,correctedAnswer,nextLevelAnswer}. strengths must contain 1 or 2 concise items. All six scores must be numbers from 1 to 10. Feedback and coaching text must be in Spanish; correctedAnswer and nextLevelAnswer must be in English.",
      `Question ${payload.turnIndex + 1}:\n${payload.question}`,
      `Candidate answer:\n${payload.answer}`,
      `Profile:\n${JSON.stringify(payload.context.profile)}`,
      `Target role:\n${payload.context.jobDescription}`,
    ].join("\n\n");
  return [
    ...base,
    "Create only the final coaching narrative in Spanish. Do not calculate, alter, or return scores; the application computes them deterministically from the saved turn evaluations.",
    "Base every claim on the three answers and their saved evaluations. Prioritize the most useful next action for English and the target role.",
    "Return exactly: {summary,strengths:[{label,description}],gaps:[{label,description}],recommendations:[{label,description}]}.",
    `Profile:\n${JSON.stringify(payload.context.profile)}`,
    `Job:\n${payload.context.jobDescription}`,
    `CV:\n${payload.context.cvText}`,
    `Turns and fixed evaluations:\n${payload.turns.map((turn, i) => `${i + 1}. Q: ${turn.question}\nA: ${turn.answer}\nEvaluation: ${JSON.stringify(turn.evaluation)}`).join("\n")}`,
  ].join("\n\n");
}
