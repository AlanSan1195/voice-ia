import { ZodError } from "zod";
import { z } from "zod";
import { TOTAL_QUESTIONS } from "./src/domain/interview";
import { createInterviewUseCases } from "./src/application/use-cases/interview";
import { createDocumentUseCase } from "./src/application/use-cases/document";
import { createTranscriptionUseCase } from "./src/application/use-cases/transcription";
import { ProviderFallbackGateway } from "./src/infrastructure/ai/fallback";
import { pdfDocumentAdapter } from "./src/infrastructure/documents/pdf";
import { groqTranscriptionAdapter } from "./src/infrastructure/transcription/groq";
import { generateSpeech } from "./src/infrastructure/speech/speech";
import {
  accessCookie,
  clearAccessCookie,
  consumeLimit,
  createSessionCookie,
  externalLimit,
  getClientIp,
  isAccessConfigured,
  isAllowedOrigin,
  sessionFromRequest,
  verifyAccessCode,
} from "./src/infrastructure/http/security";
const accessCodeSchema = z.object({ code: z.string().trim().min(1).max(256) });

const port = Number(process.env.PORT || 3001);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:4321";
const secureCookie = process.env.NODE_ENV === "production";
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
  Vary: "Origin",
};
const MAX_BODY = 16 * 1024 * 1024;
const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
const requestId = () => crypto.randomUUID();
const errorResponse = (error: unknown, id: string) => {
  if (error instanceof ZodError)
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos enviados no son válidos.",
          retryable: false,
          requestId: id,
        },
      },
      422,
    );
  const cause = error as {
    code?: string;
    retryable?: boolean;
    message?: string;
    status?: number;
  };
  const code = cause.code || "INTERNAL_ERROR";
  const status =
    cause.status ||
    (code === "AI_UNAVAILABLE"
      ? 503
      : code.startsWith("TRANSCRIPTION") || code.startsWith("TTS_")
        ? 502
        : code === "FILE_TOO_LARGE" || code === "BODY_TOO_LARGE"
          ? 413
          : code.includes("UNSUPPORTED")
            ? 415
            : 400);
  const message =
    status >= 500
      ? code === "AI_UNAVAILABLE"
        ? "El servicio de IA no está disponible temporalmente."
        : "No se pudo completar la solicitud."
      : cause.message || "Solicitud inválida.";
  return json(
    {
      error: {
        code,
        message,
        retryable: cause.retryable ?? status >= 500,
        requestId: id,
      },
    },
    status,
  );
};
async function body(req: Request, max = 256 * 1024) {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > max || declared > MAX_BODY)
    throw Object.assign(
      new Error("El cuerpo de la solicitud es demasiado grande."),
      { code: "BODY_TOO_LARGE", status: 413, retryable: false },
    );
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > max || raw.length > MAX_BODY)
    throw Object.assign(
      new Error("El cuerpo de la solicitud es demasiado grande."),
      { code: "BODY_TOO_LARGE", status: 413, retryable: false },
    );
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw Object.assign(new Error("El cuerpo JSON no es válido."), {
      code: "INVALID_JSON",
      status: 400,
      retryable: false,
    });
  }
}
function normalizeInterviewInput(input: Record<string, unknown>) {
  return input.context
    ? input
    : {
        ...input,
        context: {
          jobDescription: input.jobDescription || "",
          cvText: input.cvText || "",
          profile: input.profile,
          englishLevel: input.englishLevel || "B1",
        },
      };
}
class Concurrency {
  private active = 0;
  constructor(private readonly max: number) {}
  async run<T>(task: () => Promise<T>) {
    if (this.active >= this.max)
      throw Object.assign(
        new Error("Límite temporal alcanzado. Inténtalo de nuevo."),
        { code: "RATE_LIMITED", status: 429, retryable: true },
      );
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
    }
  }
}

export function createApp(deps?: {
  interview?: ReturnType<typeof createInterviewUseCases>;
  documents?: ReturnType<typeof createDocumentUseCase>;
  transcription?: ReturnType<typeof createTranscriptionUseCase>;
  speech?: typeof generateSpeech;
}) {
  const interview =
    deps?.interview ?? createInterviewUseCases(new ProviderFallbackGateway());
  const documents =
    deps?.documents ?? createDocumentUseCase(pdfDocumentAdapter);
  const transcription =
    deps?.transcription ?? createTranscriptionUseCase(groqTranscriptionAdapter);
  const speech = deps?.speech ?? generateSpeech;
  const external = new Concurrency(4);
  const pdf = new Concurrency(2);
  return async function fetch(
    req: Request,
    server?: { requestIP?: (request: Request) => { address: string } | null },
  ) {
    const id = requestId();
    if (!isAllowedOrigin(req))
      return errorResponse(
        Object.assign(new Error("Origen no permitido."), {
          code: "ORIGIN_FORBIDDEN",
          status: 403,
          retryable: false,
        }),
        id,
      );
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    const path = url.pathname;
    const ip = getClientIp(req, server);
    try {
      if (req.method === "GET" && path === "/api/health")
        return json({ ok: true, service: "vera-api", version: "0.1.0" }, 200, {
          "X-Request-Id": id,
        });
      if (req.method === "POST" && path === "/api/access") {
        if (!isAccessConfigured())
          return errorResponse(
            Object.assign(new Error("El acceso no está configurado."), {
              code: "ACCESS_NOT_CONFIGURED",
              status: 503,
              retryable: false,
            }),
            id,
          );
        const rate = consumeLimit(ip, "access");
        if (!rate.allowed)
          return json(
            {
              error: {
                code: "RATE_LIMITED",
                message: "Demasiados intentos. Inténtalo más tarde.",
                retryable: true,
                requestId: id,
              },
            },
            429,
            { "Retry-After": String(rate.retryAfter) },
          );
        const input = accessCodeSchema.parse(await body(req));
        if (!(await verifyAccessCode(input.code)))
          return errorResponse(
            Object.assign(new Error("Código de acceso incorrecto."), {
              code: "ACCESS_DENIED",
              status: 401,
              retryable: false,
            }),
            id,
          );
        const session = await createSessionCookie();
        return json(
          {
            authenticated: true,
            expiresAt: new Date(session.expires).toISOString(),
          },
          200,
          {
            "Set-Cookie": accessCookie(session.value, secureCookie),
            "X-Request-Id": id,
          },
        );
      }
      if (
        (req.method === "GET" || req.method === "DELETE") &&
        path === "/api/access"
      ) {
        if (req.method === "DELETE")
          return json({ authenticated: false }, 200, {
            "Set-Cookie": clearAccessCookie(secureCookie),
            "X-Request-Id": id,
          });
        const session = sessionFromRequest(req);
        return json(
          {
            authenticated: Boolean(session),
            expiresAt: session ? new Date(session.expires).toISOString() : null,
          },
          session ? 200 : 401,
          { "X-Request-Id": id },
        );
      }
      const session = sessionFromRequest(req);
      if (!session)
        return errorResponse(
          Object.assign(new Error("Se requiere un código de acceso válido."), {
            code: "AUTH_REQUIRED",
            status: 401,
            retryable: false,
          }),
          id,
        );
      const sessionKey = `${session.id}:${ip}`;
      const kind = path.includes("documents")
        ? "pdf"
        : path.includes("transcribe")
          ? "transcription"
          : path.includes("speak")
            ? "tts"
            : "ai";
      const rate = consumeLimit(sessionKey, kind);
      if (!rate.allowed)
        return json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Has alcanzado el límite temporal. Inténtalo más tarde.",
              retryable: true,
              requestId: id,
            },
          },
          429,
          {
            "Retry-After": String(rate.retryAfter),
            "X-RateLimit-Limit": String(externalLimit(kind)),
            "X-RateLimit-Remaining": "0",
          },
        );
      const rateHeaders = {
        "X-Request-Id": id,
        "X-RateLimit-Limit": String(externalLimit(kind)),
        "X-RateLimit-Remaining": String(rate.remaining),
      };
      if (req.method === "POST" && path === "/api/documents/extract")
        return await pdf.run(async () =>
          json(
            await documents.extract(
              await formFile(req, "file", 8_000_000),
              req.signal,
            ),
            200,
            rateHeaders,
          ),
        );
      if (req.method === "POST" && path === "/api/audio/transcribe")
        return await external.run(async () =>
          json(
            await transcription.transcribe(
              await formFile(req, "audio", 12_000_000),
            ),
            200,
            rateHeaders,
          ),
        );
      if (req.method === "POST" && path === "/api/audio/speak") {
        const input = await body(req);
        if (
          typeof input.text !== "string" ||
          input.text.trim().length === 0 ||
          input.text.length > 500
        )
          throw Object.assign(
            new Error("El texto debe tener entre 1 y 500 caracteres."),
            { code: "TTS_TEXT_INVALID", retryable: false },
          );
        return await external.run(async () => {
          const response = await speech(input.text as string, req.signal);
          const headers = new Headers(response.headers);
          Object.entries(rateHeaders).forEach(([key, value]) =>
            headers.set(key, value),
          );
          return new Response(response.body, {
            status: response.status,
            headers,
          });
        });
      }
      if (req.method === "POST" && path === "/api/interviews/start")
        return await external.run(async () => {
          const result = await interview.start(await body(req), req.signal);
          const payload = result as {
            provider: string;
            value: { profile: unknown; question: unknown };
          };
          return json(
            {
              ...payload.value,
              provider: payload.provider,
              totalQuestions: TOTAL_QUESTIONS,
            },
            200,
            rateHeaders,
          );
        });
      if (req.method === "POST" && path === "/api/interviews/next")
        return await external.run(async () => {
          const result = await interview.next(
            normalizeInterviewInput(await body(req)) as unknown as Parameters<
              typeof interview.next
            >[0],
            req.signal,
          );
          const payload = result as {
            provider: string;
            value: { question: unknown };
          };
          return json(
            { ...payload.value, provider: payload.provider },
            200,
            rateHeaders,
          );
        });
      if (req.method === "POST" && path === "/api/interviews/evaluate-turn")
        return await external.run(async () => {
          const result = await interview.evaluateTurn(
            normalizeInterviewInput(await body(req)) as unknown as Parameters<
              typeof interview.evaluateTurn
            >[0],
            req.signal,
          );
          const payload = result as {
            provider: string;
            value: Record<string, unknown>;
          };
          return json(
            { ...payload.value, provider: payload.provider },
            200,
            rateHeaders,
          );
        });
      if (req.method === "POST" && path === "/api/interviews/feedback")
        return await external.run(async () => {
          const result = await interview.feedback(
            normalizeInterviewInput(await body(req)) as unknown as Parameters<
              typeof interview.feedback
            >[0],
            req.signal,
          );
          const payload = result as {
            provider: string;
            value: Record<string, unknown>;
          };
          return json(
            { ...payload.value, provider: payload.provider },
            200,
            rateHeaders,
          );
        });
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Ruta no encontrada.",
            retryable: false,
            requestId: id,
          },
        },
        404,
        { "X-Request-Id": id },
      );
    } catch (error) {
      console.error(
        `[${id}] request failed`,
        error instanceof Error ? error.message : "unknown",
      );
      return errorResponse(error, id);
    }
  };
}
async function formFile(req: Request, field: string, max: number) {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > max || declared > MAX_BODY)
    throw Object.assign(new Error("El archivo supera el límite permitido."), {
      code: "FILE_TOO_LARGE",
      status: 413,
      retryable: false,
    });
  const raw = await req.arrayBuffer();
  if (raw.byteLength > max || raw.byteLength > MAX_BODY)
    throw Object.assign(new Error("El archivo supera el límite permitido."), {
      code: "FILE_TOO_LARGE",
      status: 413,
      retryable: false,
    });
  const parsed = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: raw,
  });
  const file = (await parsed.formData()).get(field);
  if (!(file instanceof File))
    throw Object.assign(
      new Error(
        field === "file"
          ? "Adjunta un archivo PDF."
          : "Adjunta un archivo de audio.",
      ),
      {
        code: field === "file" ? "FILE_REQUIRED" : "AUDIO_REQUIRED",
        retryable: false,
      },
    );
  return file;
}
if (import.meta.main) {
  const app = createApp();
  const server = Bun.serve({
    port,
    maxRequestBodySize: MAX_BODY,
    fetch: (req, srv) => app(req, srv),
  });
  console.log(`Vera API listening on ${server.url}`);
}
