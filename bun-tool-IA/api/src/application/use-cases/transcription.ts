import type { TranscriptionPort } from "../ports/transcription";
export function createTranscriptionUseCase(port: TranscriptionPort) {
  return {
    transcribe: (file: File, signal?: AbortSignal) =>
      port.transcribe(file, signal),
  };
}
