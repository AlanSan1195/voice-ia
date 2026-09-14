export interface TranscriptionPort {
  transcribe(file: File): Promise<{ text: string; provider: "groq" }>;
}
