import { describe, expect, it, beforeEach } from "bun:test";
import { createApp } from "./index";
import { resetSecurityState } from "./src/infrastructure/http/security";

const hash =
  "$argon2id$v=19$m=65536,t=2,p=1$D0XDpii0cie4Yi0RPw8Ke/dQihGvs6eqb3dvbfB8PCA$ZjrafTAjCcGVrIePuJPkB05sMFlaOtAS1ZMVGjL6ZDc";
const deps = {
  speech: async () =>
    new Response("audio", { headers: { "Content-Type": "audio/wav" } }),
};
const request = (path: string, init: RequestInit = {}) =>
  new Request(`http://localhost${path}`, init);

describe("Vera HTTP boundary", () => {
  beforeEach(() => {
    process.env.ACCESS_CODE_HASH = hash;
    process.env.SESSION_SECRET = "test-secret";
    resetSecurityState();
  });

  it("keeps health public without leaking provider configuration", async () => {
    const response = await createApp(deps)(request("/api/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      service: "vera-api",
      version: "0.1.0",
    });
  });

  it("creates and validates an access session", async () => {
    const app = createApp(deps);
    const denied = await app(
      request("/api/access", {
        method: "POST",
        body: JSON.stringify({ code: "wrong" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(denied.status).toBe(401);
    const granted = await app(
      request("/api/access", {
        method: "POST",
        body: JSON.stringify({ code: "test" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(granted.status).toBe(200);
    const cookie = granted.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    if (!cookie) throw new Error("cookie missing");
    const status = await app(
      request("/api/access", { headers: { cookie: cookie.split(";")[0]! } }),
    );
    expect(status.status).toBe(200);
  });

  it("rejects protected requests and GET TTS", async () => {
    const app = createApp(deps);
    expect((await app(request("/api/audio/speak?text=secret"))).status).toBe(
      401,
    );
    const granted = await app(
      request("/api/access", {
        method: "POST",
        body: JSON.stringify({ code: "test" }),
        headers: { "content-type": "application/json" },
      }),
    );
    const setCookie = granted.headers.get("set-cookie");
    if (!setCookie) throw new Error("cookie missing");
    const cookie = setCookie.split(";")[0]!;
    expect(
      (
        await app(
          request("/api/audio/speak?text=secret", { headers: { cookie } }),
        )
      ).status,
    ).toBe(404);
  });
});
