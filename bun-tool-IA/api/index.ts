import { createInterviewUseCases } from "./src/application/use-cases/interview";
import { createDocumentUseCase } from "./src/application/use-cases/document";
import { createTranscriptionUseCase } from "./src/application/use-cases/transcription";
import { ProviderFallbackGateway } from "./src/infrastructure/ai/fallback";
import { pdfDocumentAdapter } from "./src/infrastructure/documents/pdf";
import { groqTranscriptionAdapter } from "./src/infrastructure/transcription/groq";
import { generateSpeech } from "./src/infrastructure/speech/speech";
import { TOTAL_QUESTIONS } from "./src/domain/interview";
import { ZodError } from "zod";

const interview = createInterviewUseCases(new ProviderFallbackGateway());
const documents = createDocumentUseCase(pdfDocumentAdapter);
const transcription = createTranscriptionUseCase(groqTranscriptionAdapter);
const port = Number(process.env.PORT || 3001);
const cors = { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "http://localhost:4321", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", ...headers } });
const errorResponse = (error: unknown) => { if (error instanceof ZodError) return json({ error: { code: "VALIDATION_ERROR", message: "Los datos de la entrevista no son válidos. Actualiza la página e inténtalo de nuevo.", retryable: false } }, 400); const cause = error as { code?: string; retryable?: boolean; message?: string }; const status = cause.code === "AI_UNAVAILABLE" ? 503 : cause.code?.startsWith("TRANSCRIPTION") ? 502 : 400; return json({ error: { code: cause.code || "BAD_REQUEST", message: cause.message || "Solicitud inválida.", retryable: cause.retryable ?? false } }, status); };
async function body(req: Request) { return await req.json() as Record<string, unknown>; }
function normalizeInterviewInput(input: Record<string, unknown>) {
  if (input.context) return input;
  return { ...input, context: { jobDescription: input.jobDescription || "", cvText: input.cvText || "", profile: input.profile, englishLevel: input.englishLevel || "B1" } };
}

const server = Bun.serve({ port, async fetch(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = new URL(req.url); const path = url.pathname;
  try {
    if (req.method === "GET" && path === "/api/health") return json({ ok: true, service: "vera-api", providers: { groq: Boolean(process.env.GROQ_API_KEY), cerebras: Boolean(process.env.CEREBRAS_API_KEY), transcription: Boolean(process.env.GROQ_API_KEY), voice: process.env.ELEVENLABS_API_KEY ? "elevenlabs" : process.env.GROQ_API_KEY ? "groq" : "system" } });
    if (req.method === "POST" && path === "/api/documents/extract") { const form = await req.formData(); const file = form.get("file"); if (!(file instanceof File)) throw Object.assign(new Error("Adjunta un archivo PDF."), { code: "FILE_REQUIRED", retryable: false }); return json(await documents.extract(file)); }
    if (req.method === "POST" && path === "/api/audio/transcribe") { const form = await req.formData(); const file = form.get("audio"); if (!(file instanceof File)) throw Object.assign(new Error("Adjunta un archivo de audio."), { code: "AUDIO_REQUIRED", retryable: false }); return json(await transcription.transcribe(file)); }
    if (req.method === "GET" && path === "/api/audio/speak") { const text = url.searchParams.get("text"); if (!text) throw Object.assign(new Error("Indica el texto a reproducir."), { code: "TTS_TEXT_REQUIRED", retryable: false }); return await generateSpeech(text); }
    if (req.method === "POST" && path === "/api/audio/speak") { const input = await body(req); if (typeof input.text !== "string") throw Object.assign(new Error("Indica el texto a reproducir."), { code: "TTS_TEXT_REQUIRED", retryable: false }); return await generateSpeech(input.text); }
    if (req.method === "POST" && path === "/api/interviews/start") { const result = await interview.start(await body(req)); const payload = result as any; return json({ ...payload.value, provider: payload.provider, totalQuestions: TOTAL_QUESTIONS }); }
    if (req.method === "POST" && path === "/api/interviews/next") { const input = normalizeInterviewInput(await body(req)); const result = await interview.next(input as any); const payload = result as any; return json({ ...payload.value, provider: payload.provider }); }
    if (req.method === "POST" && path === "/api/interviews/evaluate-turn") { const input = normalizeInterviewInput(await body(req)); const result = await interview.evaluateTurn(input as any); const payload = result as any; return json({ ...payload.value, provider: payload.provider }); }
    if (req.method === "POST" && path === "/api/interviews/feedback") { const input = normalizeInterviewInput(await body(req)); const result = await interview.feedback(input as any); const payload = result as any; return json({ ...payload.value, provider: payload.provider }); }
    return json({ error: { code: "NOT_FOUND", message: "Ruta no encontrada.", retryable: false } }, 404);
  } catch (error) { console.error(error); return errorResponse(error); }
} });

console.log(`Vera API listening on ${server.url}`);
console.log(`Voice provider: ${process.env.ELEVENLABS_API_KEY ? "ElevenLabs v3 (Groq fallback)" : process.env.GROQ_API_KEY ? "Groq Orpheus" : "browser fallback only"}`);
