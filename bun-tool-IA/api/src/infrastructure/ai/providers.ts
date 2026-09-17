import Groq from "groq-sdk";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type {
  AiPayload,
  AiProvider,
  AiResult,
} from "../../application/ports/ai";
import {
  feedbackNarrativeSchema,
  turnAssessmentSchema,
} from "../../application/scoring/interview-scoring";
import { promptFor } from "./prompts";
import { z } from "zod";

function parseJson(raw: string): unknown {
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start)
    throw new Error("La IA no devolvió JSON válido.");
  return JSON.parse(clean.slice(start, end + 1));
}
export const questionSchema = z.object({
  index: z.number().int().min(0).max(3).default(0),
  text: z.string().min(1).max(500),
});
const profileSchema = z.object({
  role: z.string().min(1).max(120),
  summary: z.string().max(1000),
  focusAreas: z.array(z.string().min(1).max(120)).max(10),
});
function validate(value: unknown, kind: AiPayload["kind"]): AiResult["value"] {
  if (!value || typeof value !== "object")
    throw new Error("Respuesta vacía de IA.");
  if (kind === "turnEvaluation") return turnAssessmentSchema.parse(value);
  if (kind === "feedback") return feedbackNarrativeSchema.parse(value);
  if (kind === "start")
    return z
      .object({ profile: profileSchema, question: questionSchema })
      .parse(value);
  return z.object({ question: questionSchema }).parse(value);
}
function messages(payload: AiPayload) {
  return [
    { role: "system" as const, content: "You return strict JSON only." },
    { role: "user" as const, content: promptFor(payload) },
  ];
}

export function groqProvider(): AiProvider | null {
  if (!process.env.GROQ_API_KEY) return null;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return {
    name: "groq",
    async generate(payload, signal) {
      const response = await client.chat.completions.create(
        {
          model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
          messages: messages(payload),
          response_format: { type: "json_object" },
          temperature: 0.45,
          max_tokens:
            payload.kind === "feedback"
              ? 5000
              : payload.kind === "turnEvaluation"
                ? 2000
                : 1200,
        },
        signal ? { signal } : undefined,
      );
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error("Groq devolvió una respuesta vacía.");
      return validate(parseJson(text), payload.kind);
    },
  };
}
export function cerebrasProvider(): AiProvider | null {
  if (!process.env.CEREBRAS_API_KEY) return null;
  const client = new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
  return {
    name: "cerebras",
    async generate(payload, signal) {
      const response = await client.chat.completions.create(
        {
          model: process.env.CEREBRAS_MODEL || "gpt-oss-120b",
          messages: messages(payload),
          response_format: { type: "json_object" },
          temperature: 0.45,
          max_completion_tokens:
            payload.kind === "feedback"
              ? 5000
              : payload.kind === "turnEvaluation"
                ? 2000
                : 1200,
        },
        signal ? { signal } : undefined,
      );
      const text = (response as any).choices?.[0]?.message?.content;
      if (!text) throw new Error("Cerebras devolvió una respuesta vacía.");
      return validate(parseJson(text), payload.kind);
    },
  };
}
