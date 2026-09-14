import type { TranscriptionPort } from "../../application/ports/transcription";

export const groqTranscriptionAdapter: TranscriptionPort = {
  async transcribe(file) {
    if (!process.env.GROQ_API_KEY)
      throw Object.assign(
        new Error("GROQ_API_KEY es necesaria para transcribir audio."),
        { code: "TRANSCRIPTION_NOT_CONFIGURED", retryable: false },
      );
    const max = Number(process.env.MAX_AUDIO_BYTES || 12000000);
    if (!file.size || file.size > max)
      throw Object.assign(
        new Error("El audio está vacío o supera el límite permitido."),
        { code: "AUDIO_INVALID", retryable: false },
      );
    const form = new FormData();
    form.append("file", file, file.name || "answer.webm");
    form.append(
      "model",
      process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo",
    );
    form.append("language", "en");
    form.append("response_format", "json");
    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: form,
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      text?: unknown;
      error?: { message?: string };
    };
    if (!response.ok || typeof payload.text !== "string")
      throw Object.assign(
        new Error(
          payload.error?.message || "Groq no pudo transcribir el audio.",
        ),
        { code: "TRANSCRIPTION_FAILED", retryable: true },
      );
    return {
      text: payload.text.replace(/\s+/g, " ").trim(),
      provider: "groq" as const,
    };
  },
};
