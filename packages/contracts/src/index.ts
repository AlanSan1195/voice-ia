import { z } from "zod";

export const TOTAL_QUESTIONS = 3 as const;
export const englishLevelSchema = z.enum(["A1", "A2", "B1", "B2"]);
export type EnglishLevel = z.infer<typeof englishLevelSchema>;

export const profileSchema = z.object({
  role: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(1_000),
  focusAreas: z.array(z.string().trim().min(1).max(120)).max(10),
});
export type InterviewProfile = z.infer<typeof profileSchema>;

export const contextSchema = z.object({
  jobDescription: z.string().max(18_000).default(""),
  cvText: z.string().max(18_000).default(""),
  profile: profileSchema,
  englishLevel: englishLevelSchema.default("B1"),
});
export type InterviewContext = z.infer<typeof contextSchema>;

export const questionSchema = z.object({
  index: z
    .number()
    .int()
    .min(0)
    .max(TOTAL_QUESTIONS - 1),
  text: z.string().min(1).max(500),
});
export const turnSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(12_000),
  evaluation: z.unknown().optional(),
});
export const sourceSchema = z.object({
  jobDescription: z.string().max(18_000).default(""),
  cvText: z.string().max(18_000).default(""),
  englishLevel: englishLevelSchema.default("B1"),
  questionCount: z.literal(TOTAL_QUESTIONS).default(TOTAL_QUESTIONS),
});

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    requestId: z.string(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;

export const accessCodeSchema = z.object({
  code: z.string().trim().min(1).max(256),
});
