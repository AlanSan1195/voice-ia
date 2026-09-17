export interface DocumentTextPort {
  extract(
    file: File,
    signal?: AbortSignal,
  ): Promise<{ text: string; fileName: string; characters: number }>;
}
