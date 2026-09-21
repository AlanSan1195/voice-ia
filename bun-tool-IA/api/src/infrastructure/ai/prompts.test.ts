import { describe, expect, test } from "bun:test";
import type { AiPayload } from "../../application/ports/ai";
import { promptFor } from "./prompts";

const context = {
  jobDescription: "Frontend role with React and TypeScript.",
  cvText: "",
  englishLevel: "B1" as const,
  profile: {
    role: "Frontend Developer",
    summary: "Builds web interfaces.",
    focusAreas: ["React"],
  },
};

describe("interview prompts", () => {
  ("A1 A2 B1 B2".split(" ") as Array<"A1" | "A2" | "B1" | "B2">).forEach(
    (level) => {
      test(`keeps the ${level} guidance in turn evaluation prompts`, () => {
        const payload: AiPayload = {
          kind: "turnEvaluation",
          context: { ...context, englishLevel: level },
          question: "How did you improve an interface?",
          answer: "I improved the interface.",
          turnIndex: 0,
        };
        const prompt = promptFor(payload);
        expect(prompt).toContain(
          `candidate self-reported CEFR level is ${level}`,
        );
        expect(prompt).toContain("All six scores must be numbers from 1 to 10");
      });
    },
  );
});
