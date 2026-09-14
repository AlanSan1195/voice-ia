type SpeechProvider = "elevenlabs" | "groq";

const corsHeaders = (provider: SpeechProvider, contentType: string) => ({
  "Content-Type": contentType,
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin":
    process.env.ALLOWED_ORIGIN || "http://localhost:4321",
  "Access-Control-Expose-Headers": "X-TTS-Provider",
  "X-TTS-Provider": provider,
});

function normalizeQuestion(text: string) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/:\s+/g, "… ")
    .replace(/,\s+(and|but)\s+(how|why|what|which|when)\b/gi, ", … $1 $2")
    .trim();
}

function elevenLabsPerformance(text: string) {
  const question = normalizeQuestion(text);
  const withPause = question.replace(
    /,\s+(and|but)\s+/i,
    ", [short pause] $1 ",
  );
  return `[warm] ${withPause}`;
}

function groqPerformance(text: string) {
  return `[professionally] ${normalizeQuestion(text)}`;
}

async function elevenLabsSpeech(text: string): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ElevenLabs no está configurado.");
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const model = process.env.ELEVENLABS_TTS_MODEL || "eleven_v3";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: elevenLabsPerformance(text),
        model_id: model,
        language_code: "en",
        apply_text_normalization: "on",
        voice_settings: {
          stability: 0.48,
          similarity_boost: 0.78,
          style: 0.22,
          use_speaker_boost: true,
        },
      }),
    },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      detail?: { message?: string };
      message?: string;
    };
    throw new Error(
      payload.detail?.message ||
        payload.message ||
        "ElevenLabs no pudo generar el audio.",
    );
  }
  return new Response(response.body, {
    status: 200,
    headers: corsHeaders(
      "elevenlabs",
      response.headers.get("Content-Type") || "audio/mpeg",
    ),
  });
}

async function groqSpeech(text: string): Promise<Response> {
  if (!process.env.GROQ_API_KEY) throw new Error("Groq no está configurado.");
  const input = groqPerformance(text).slice(0, 200);
  const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english",
      voice: process.env.GROQ_TTS_VOICE || "autumn",
      input,
      response_format: "wav",
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(payload.error?.message || "Groq no pudo generar el audio.");
  }
  return new Response(response.body, {
    status: 200,
    headers: corsHeaders("groq", "audio/wav"),
  });
}

export async function generateSpeech(text: string): Promise<Response> {
  const clean = normalizeQuestion(text);
  if (!clean)
    throw Object.assign(new Error("El texto para voz está vacío."), {
      code: "TTS_EMPTY",
      retryable: false,
    });
  const errors: string[] = [];
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      return await elevenLabsSpeech(clean);
    } catch (error) {
      const message = error instanceof Error ? error.message : "error";
      console.warn(`[tts] ElevenLabs failed: ${message}`);
      errors.push(`ElevenLabs: ${message}`);
    }
  }
  try {
    return await groqSpeech(clean);
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    console.warn(`[tts] Groq failed: ${message}`);
    errors.push(`Groq: ${message}`);
  }
  throw Object.assign(
    new Error(`No fue posible generar voz IA. ${errors.join(" | ")}`),
    { code: "TTS_FAILED", retryable: true },
  );
}
