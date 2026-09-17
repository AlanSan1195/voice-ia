export interface TranscriptionPort {
  transcribe(
    file: File,
    signal?: AbortSignal,
  ): Promise<{ text: string; provider: "groq" }>;
}
