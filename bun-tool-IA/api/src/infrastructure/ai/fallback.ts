import type {
  AiGateway,
  AiPayload,
  AiProvider,
} from "../../application/ports/ai";
import type { ProviderName } from "../../domain/interview";
import { cerebrasProvider, groqProvider } from "./providers";

export class ProviderFallbackGateway implements AiGateway {
  private readonly providers: AiProvider[];
  private readonly timeoutMs = Number(process.env.AI_TIMEOUT_MS || 20_000);
  constructor(providers?: AiProvider[]) {
    this.providers =
      providers ??
      [groqProvider(), cerebrasProvider()].filter(
        (provider): provider is AiProvider => Boolean(provider),
      );
  }
  async generate(payload: AiPayload, signal?: AbortSignal) {
    const attempts: string[] = [];
    for (const provider of this.providers) {
      if (!provider) continue;
      try {
        const controller = new AbortController();
        const onAbort = () => controller.abort(signal?.reason);
        signal?.addEventListener("abort", onAbort, { once: true });
        const timeoutId = setTimeout(
          () => controller.abort(new Error("timeout")),
          this.timeoutMs,
        );
        try {
          return {
            provider: provider.name as ProviderName,
            value: await provider.generate(payload, controller.signal),
          };
        } finally {
          clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onAbort);
        }
      } catch (error) {
        attempts.push(
          `${provider.name}: ${error instanceof Error ? error.message : "unknown error"}`,
        );
        if (signal?.aborted)
          throw Object.assign(new Error("La solicitud fue cancelada."), {
            code: "REQUEST_ABORTED",
            retryable: true,
          });
      }
    }
    const reason = attempts.length
      ? attempts.join(" | ")
      : "Configura GROQ_API_KEY o CEREBRAS_API_KEY.";
    throw Object.assign(
      new Error(`No hay un proveedor de IA disponible. ${reason}`),
      { code: "AI_UNAVAILABLE", retryable: true },
    );
  }
}
