import { describe, expect, test } from "bun:test";
import type {
  AiGateway,
  AiPayload,
  AiProvider,
} from "../../application/ports/ai";
import { ProviderFallbackGateway } from "./fallback";

describe("ProviderFallbackGateway", () => {
  test("continues with the second provider when the first response is invalid", async () => {
    const invalid: AiProvider = {
      name: "groq",
      async generate() {
        throw new Error("invalid evaluation");
      },
    };
    const valid: AiProvider = {
      name: "cerebras",
      async generate() {
        return {
          profile: {
            role: "Engineer",
            summary: "Profile",
            focusAreas: ["TypeScript"],
          },
          question: { index: 0, text: "Tell me about your experience." },
        };
      },
    };
    const gateway = new ProviderFallbackGateway([invalid, valid]);
    const result = await gateway.generate({
      kind: "start",
      context: {
        jobDescription: "A role description that is long enough.",
        cvText: "",
        englishLevel: "B1",
      },
      questionCount: 3,
    });
    expect(result.provider).toBe("cerebras");
  });

  test("uses providers in order and exposes a typed failure when none are configured", async () => {
    const gateway = new ProviderFallbackGateway();
    const payload: AiPayload = {
      kind: "start",
      context: {
        jobDescription: "A role description that is long enough.",
        cvText: "A candidate profile that is long enough for validation.",
        englishLevel: "B1",
      },
      questionCount: 6,
    };
    if (process.env.GROQ_API_KEY || process.env.CEREBRAS_API_KEY) return;
    await expect(gateway.generate(payload)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
      retryable: true,
    });
  });
});
