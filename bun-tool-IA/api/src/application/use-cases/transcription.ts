import type { TranscriptionPort } from "../ports/transcription";
export function createTranscriptionUseCase(port: TranscriptionPort) { return { transcribe: (file: File) => port.transcribe(file) }; }
