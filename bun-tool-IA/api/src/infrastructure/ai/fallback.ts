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
  async generate(payload: AiPayload) {
    const attempts: string[] = [];
    for (const provider of this.providers) {
      if (!provider) continue;
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), this.timeoutMs),
        );
        return {
          provider: provider.name as ProviderName,
          value: await Promise.race([provider.generate(payload), timeout]),
        };
      } catch (error) {
        attempts.push(
          `${provider.name}: ${error instanceof Error ? error.message : "unknown error"}`,
        );
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
