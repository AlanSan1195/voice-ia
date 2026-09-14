import { describe, expect, test } from "bun:test";
import type { AiGateway, AiPayload } from "../ports/ai";
import { createInterviewUseCases } from "./interview";

describe("interview question indexes", () => {
  test("normalizes AI indexes and accepts the legacy third-question index", async () => {
    let lastPayload: AiPayload | undefined;
    const gateway: AiGateway = {
      async generate(payload) {
        lastPayload = payload;
        if (payload.kind === "next")
          return {
            provider: "groq",
            value: { question: { index: 3, text: "What did you improve?" } },
          };
        if (payload.kind === "turnEvaluation")
          return {
            provider: "groq",
            value: {
              englishScore: 7,
              professionalEnglishScore: 6,
              technicalScore: 8,
              relevanceScore: 8,
              structureScore: 7,
              clarityScore: 7,
              observedEnglishLevel: "B1",
              feedback: "Respuesta clara.",
              strengths: ["Buen ejemplo."],
              priorityImprovement: "Incluye una métrica.",
              correctedAnswer: "I improved the API.",
              nextLevelAnswer: "I improved the API and reduced latency by 20%.",
            },
          };
        throw new Error("Unexpected payload");
      },
    };
    const useCases = createInterviewUseCases(gateway);
    const context = {
      jobDescription:
        "Backend engineer role with TypeScript and API responsibilities.",
      cvText: "",
      englishLevel: "B1" as const,
      profile: {
        role: "Backend Engineer",
        summary: "Candidate profile",
        focusAreas: ["TypeScript"],
      },
    };
    const next = await useCases.next({
      context,
      turns: [
        {
          question: "Tell me about your API experience.",
          answer: "I built an API.",
        },
      ],
    });
    expect((next.value as { question: { index: number } }).question.index).toBe(
      1,
    );
    await useCases.evaluateTurn({
      context,
      question: "What did you improve?",
      answer: "I improved the API.",
      turnIndex: 3,
    });
    expect(lastPayload?.kind).toBe("turnEvaluation");
    if (lastPayload?.kind === "turnEvaluation")
      expect(lastPayload.turnIndex).toBe(2);
  });
});
