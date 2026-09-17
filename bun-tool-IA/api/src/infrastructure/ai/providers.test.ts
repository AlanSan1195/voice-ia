import { describe, expect, test } from "bun:test";
import { questionSchema } from "./providers";

describe("AI provider response contracts", () => {
  test("accepts the legacy one-based final question index", () => {
    expect(
      questionSchema.parse({ index: 3, text: "What did you improve?" }),
    ).toEqual({ index: 3, text: "What did you improve?" });
  });
});
