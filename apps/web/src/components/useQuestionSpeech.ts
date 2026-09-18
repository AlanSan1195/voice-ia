import { useCallback, useEffect, useRef, useState } from "react";
import type { TtsProvider } from "./InterviewApp.types";

type UseQuestionSpeechOptions = {
  text: string;
  active: boolean;
  apiBase: string;
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function wordsBefore(text: string, characterIndex: number) {
  return countWords(text.slice(0, characterIndex));
}

export function useQuestionSpeech({
  text,
  active,
  apiBase,
}: UseQuestionSpeechOptions) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("loading");
  const [spokenWordCount, setSpokenWordCount] = useState(0);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const voicesChangedRef = useRef<(() => void) | null>(null);

  const revokeAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const cleanupSpeech = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (
      voicesChangedRef.current &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        voicesChangedRef.current,
      );
      voicesChangedRef.current = null;
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    revokeAudio();
    setVoiceSpeaking(false);
  }, [revokeAudio]);

  const speakWithBrowser = useCallback(
    (speechText: string, generation: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window))
        return;
      const isCurrent = () => generationRef.current === generation;
      const play = () => {
        if (!isCurrent()) return;
        voicesChangedRef.current = null;
        const voices = window.speechSynthesis
          .getVoices()
          .filter((voice) => voice.lang.toLowerCase().startsWith("en"));
        const preferred = [
          "Ava",
          "Samantha",
          "Karen",
          "Google US English",
          "Microsoft Aria",
          "Daniel",
        ];
        const voice = voices.sort((left, right) => {
          const score = (name: string) =>
            preferred.reduce(
              (total, preferredName, index) =>
                total +
                (name.toLowerCase().includes(preferredName.toLowerCase())
                  ? preferred.length - index
                  : 0),
              0,
            );
          return score(right.name) - score(left.name);
        })[0];
        const utterance = new SpeechSynthesisUtterance(
          speechText
            .replace(/:\s+/g, "… ")
            .replace(/,\s+(and|but)\s+/i, ", … $1 "),
        );
        utterance.lang = "en-US";
        utterance.rate = 0.88;
        utterance.pitch = 1;
        if (voice) utterance.voice = voice;
        utterance.onstart = () => {
          if (!isCurrent()) return;
          setVoiceSpeaking(true);
          setSpokenWordCount(1);
        };
        utterance.onboundary = (event) => {
          if (isCurrent())
            setSpokenWordCount(
              wordsBefore(utterance.text, event.charIndex) + 1,
            );
        };
        utterance.onend = () => {
          if (!isCurrent()) return;
          setSpokenWordCount(countWords(speechText));
          setVoiceSpeaking(false);
        };
        utterance.onerror = () => {
          if (isCurrent()) setVoiceSpeaking(false);
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length) {
        play();
      } else {
        voicesChangedRef.current = play;
        window.speechSynthesis.addEventListener("voiceschanged", play, {
          once: true,
        });
      }
    },
    [],
  );

  const stopSpeech = useCallback(() => {
    generationRef.current += 1;
    cleanupSpeech();
    setTtsProvider("off");
    setSpokenWordCount(countWords(text));
  }, [cleanupSpeech, text]);

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) stopSpeech();
    setVoiceEnabled((enabled) => !enabled);
  }, [stopSpeech, voiceEnabled]);

  useEffect(() => {
    const generation = ++generationRef.current;
    cleanupSpeech();
    const words = countWords(text);
    if (!active || !voiceEnabled || !text.trim()) {
      setTtsProvider("off");
      setSpokenWordCount(words);
      return () => undefined;
    }

    setTtsProvider("loading");
    setSpokenWordCount(0);
    const controller = new AbortController();
    requestRef.current = controller;
    const isCurrent = () =>
      generationRef.current === generation && !controller.signal.aborted;
    const fallbackToBrowser = (audio?: HTMLAudioElement) => {
      if (!isCurrent()) return;
      audio?.pause();
      revokeAudio();
      setTtsProvider("system");
      speakWithBrowser(text, generation);
    };

    void fetch(`${apiBase}/api/audio/speak`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("TTS unavailable");
        if (!isCurrent()) return;
        const objectUrl = URL.createObjectURL(await response.blob());
        if (!isCurrent()) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        objectUrlRef.current = objectUrl;
        const audio = new Audio(objectUrl);
        audio.preload = "auto";
        audioRef.current = audio;
        audio.onplaying = () => {
          if (!isCurrent()) return;
          setTtsProvider("streaming");
          setVoiceSpeaking(true);
          setSpokenWordCount(1);
        };
        audio.ontimeupdate = () => {
          if (
            isCurrent() &&
            Number.isFinite(audio.duration) &&
            audio.duration > 0
          )
            setSpokenWordCount(
              Math.min(
                words,
                Math.max(
                  1,
                  Math.ceil((audio.currentTime / audio.duration) * words),
                ),
              ),
            );
        };
        audio.onended = () => {
          if (!isCurrent()) return;
          setSpokenWordCount(words);
          setVoiceSpeaking(false);
          revokeAudio();
        };
        audio.onerror = () => fallbackToBrowser(audio);
        await audio.play().catch(() => fallbackToBrowser(audio));
      })
      .catch((cause: unknown) => {
        if (!isCurrent()) return;
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        fallbackToBrowser();
      });

    return () => {
      if (generationRef.current === generation) {
        generationRef.current += 1;
        cleanupSpeech();
      }
    };
  }, [
    active,
    apiBase,
    cleanupSpeech,
    revokeAudio,
    speakWithBrowser,
    text,
    voiceEnabled,
  ]);

  return {
    voiceEnabled,
    ttsProvider,
    spokenWordCount,
    voiceSpeaking,
    toggleVoice,
    stopSpeech,
  };
}
