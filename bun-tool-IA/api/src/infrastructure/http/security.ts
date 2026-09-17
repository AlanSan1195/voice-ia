import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

const COOKIE_NAME = "vera_access";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const ACCESS_WINDOW_MS = 15 * 60 * 1000;

type Bucket = { startedAt: number; count: number };
export type LimitKind = "access" | "ai" | "pdf" | "transcription" | "tts";
const limits: Record<LimitKind, number> = {
  access: Number(process.env.ACCESS_RATE_LIMIT || 5),
  ai: Number(process.env.AI_RATE_LIMIT || 35),
  pdf: Number(process.env.PDF_RATE_LIMIT || 10),
  transcription: Number(process.env.TRANSCRIPTION_RATE_LIMIT || 20),
  tts: Number(process.env.TTS_RATE_LIMIT || 60),
};
const buckets = new Map<string, Bucket>();
const hmac = (value: string) =>
  createHmac("sha256", process.env.SESSION_SECRET || "")
    .update(value)
    .digest("base64url");
const configured = () =>
  Boolean(process.env.ACCESS_CODE_HASH && process.env.SESSION_SECRET);
export const isAccessConfigured = configured;
export const getClientIp = (
  request: Request,
  server?: { requestIP?: (request: Request) => { address: string } | null },
) => {
  if (process.env.TRUST_PROXY === "true")
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    );
  return server?.requestIP?.(request)?.address || "unknown";
};

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === (process.env.ALLOWED_ORIGIN || "http://localhost:4321");
}

export function consumeLimit(key: string, kind: LimitKind) {
  const now = Date.now();
  const windowMs = kind === "access" ? ACCESS_WINDOW_MS : WINDOW_MS;
  const bucket = buckets.get(`${kind}:${key}`);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    buckets.set(`${kind}:${key}`, { startedAt: now, count: 1 });
    return {
      allowed: true,
      remaining: Math.max(0, limits[kind] - 1),
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }
  if (bucket.count >= limits[kind])
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((windowMs - (now - bucket.startedAt)) / 1000),
    };
  bucket.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limits[kind] - bucket.count),
    retryAfter: Math.ceil(windowMs / 1000),
  };
}

export function externalLimit(kind: LimitKind) {
  return limits[kind];
}

export async function createSessionCookie() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${randomUUID()}.${expires}`;
  return { value: `${payload}.${hmac(payload)}`, expires };
}

export function sessionFromRequest(request: Request) {
  if (!configured()) return null;
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return null;
  const [id, expiresText, signature] = raw.split(".");
  if (!id || !expiresText || !signature) return null;
  const payload = `${id}.${expiresText}`;
  const expected = hmac(payload);
  try {
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null;
  } catch {
    return null;
  }
  const expires = Number(expiresText);
  return Number.isFinite(expires) && expires > Date.now()
    ? { id, expires }
    : null;
}

export const accessCookie = (value: string, secure: boolean) =>
  `${COOKIE_NAME}=${value}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
export const clearAccessCookie = (secure: boolean) =>
  `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
export async function verifyAccessCode(code: string) {
  return (
    configured() &&
    (await Bun.password.verify(code, process.env.ACCESS_CODE_HASH!))
  );
}
export function resetSecurityState() {
  buckets.clear();
}
