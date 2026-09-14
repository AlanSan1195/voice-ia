import Groq from "groq-sdk";
import Cerebras from "@cerebras/cerebras_cloud_sdk";
import type { AiPayload, AiProvider } from "../../application/ports/ai";
import {
  feedbackNarrativeSchema,
  turnAssessmentSchema,
} from "../../application/scoring/interview-scoring";
import { promptFor } from "./prompts";

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
function validate(value: unknown, kind: AiPayload["kind"]): any {
  if (!value || typeof value !== "object")
    throw new Error("Respuesta vacía de IA.");
  if (kind === "turnEvaluation") return turnAssessmentSchema.parse(value);
  if (kind === "feedback") return feedbackNarrativeSchema.parse(value);
  const object = value as Record<string, unknown>;
  if (kind === "start" && (!object.profile || !object.question))
    throw new Error("Falta el perfil o la pregunta inicial.");
  if (kind === "next" && !object.question)
    throw new Error("Falta la siguiente pregunta.");
  return value;
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
    async generate(payload) {
      const response = await client.chat.completions.create({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages: messages(payload),
        temperature: 0.45,
        max_tokens: payload.kind === "feedback" ? 5000 : 1200,
      });
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
    async generate(payload) {
      const response = await client.chat.completions.create({
        model: process.env.CEREBRAS_MODEL || "gpt-oss-120b",
        messages: messages(payload),
        temperature: 0.45,
        max_completion_tokens: payload.kind === "feedback" ? 5000 : 1200,
      });
      const text = (response as any).choices?.[0]?.message?.content;
      if (!text) throw new Error("Cerebras devolvió una respuesta vacía.");
      return validate(parseJson(text), payload.kind);
    },
  };
}
