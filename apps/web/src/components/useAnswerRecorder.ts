import { useCallback, useEffect, useRef, useState } from "react";

type UseAnswerRecorderOptions = {
  apiBase: string;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
};

const RECORDING_LIMIT_MS = 120_000;

export function useAnswerRecorder({
  apiBase,
  onTranscript,
  onError,
}: UseAnswerRecorderOptions) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const transcriptionRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

  const clearRecordingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    clearRecordingTimeout();
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }, [clearRecordingTimeout]);

  const cancelRecording = useCallback(() => {
    generationRef.current += 1;
    clearRecordingTimeout();
    transcriptionRef.current?.abort();
    transcriptionRef.current = null;
    if (mountedRef.current) {
      setListening(false);
      setTranscribing(false);
    }
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state === "recording") recorder.stop();
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
  }, [clearRecordingTimeout, stopTracks]);

  const toggleRecording = useCallback(async () => {
    if (listening) {
      stopRecording();
      return;
    }
    if (transcribing) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      onError(
        "Este navegador no permite grabar audio. Escribe tu respuesta manualmente.",
      );
      return;
    }
    const generation = ++generationRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
          (candidate) => MediaRecorder.isTypeSupported(candidate),
        ) || "";
      const media = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = media;
      chunksRef.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      media.onstop = async () => {
        clearRecordingTimeout();
        stopTracks();
        recorderRef.current = null;
        if (mountedRef.current) setListening(false);
        if (!mountedRef.current) return;
        const chunks = chunksRef.current;
        const mime = chunks[0]?.type || "audio/webm";
        const controller = new AbortController();
        const transcriptionGeneration = generationRef.current;
        transcriptionRef.current = controller;
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append(
            "audio",
            new Blob(chunks, { type: mime }),
            `answer.${mime.includes("mp4") ? "m4a" : "webm"}`,
          );
          const response = await fetch(`${apiBase}/api/audio/transcribe`, {
            method: "POST",
            body: form,
            credentials: "include",
            signal: controller.signal,
          });
          const payload: unknown = await response.json().catch(() => ({}));
          if (!response.ok) {
            const message =
              typeof payload === "object" &&
              payload !== null &&
              "error" in payload &&
              typeof payload.error === "object" &&
              payload.error !== null &&
              "message" in payload.error &&
              typeof payload.error.message === "string"
                ? payload.error.message
                : "No se pudo transcribir el audio.";
            throw new Error(message);
          }
          if (!mountedRef.current) return;
          const text =
            typeof payload === "object" &&
            payload !== null &&
            "text" in payload &&
            typeof payload.text === "string"
              ? payload.text
              : "";
          if (text) onTranscript(text);
        } catch (cause) {
          if (
            mountedRef.current &&
            generationRef.current === transcriptionGeneration &&
            !(cause instanceof DOMException && cause.name === "AbortError")
          ) {
            onError(
              cause instanceof Error
                ? cause.message
                : "Transcripción fallida. Puedes escribir la respuesta.",
            );
          }
        } finally {
          if (
            mountedRef.current &&
            generationRef.current === transcriptionGeneration
          ) {
            setTranscribing(false);
            transcriptionRef.current = null;
          }
        }
      };
      media.start();
      setListening(true);
      timeoutRef.current = window.setTimeout(stopRecording, RECORDING_LIMIT_MS);
    } catch {
      stopTracks();
      if (mountedRef.current && generation === generationRef.current) {
        onError(
          "No se concedió acceso al micrófono. Puedes escribir la respuesta manualmente.",
        );
      }
    }
  }, [
    apiBase,
    clearRecordingTimeout,
    listening,
    onError,
    onTranscript,
    stopRecording,
    stopTracks,
    transcribing,
  ]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      generationRef.current += 1;
      clearRecordingTimeout();
      transcriptionRef.current?.abort();
      transcriptionRef.current = null;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state === "recording") recorder.stop();
      }
      recorderRef.current = null;
      stopTracks();
    },
    [clearRecordingTimeout, stopTracks],
  );

  return {
    listening,
    transcribing,
    toggleRecording,
    stopRecording,
    cancelRecording,
  };
}
