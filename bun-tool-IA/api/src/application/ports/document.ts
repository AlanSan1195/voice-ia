export interface DocumentTextPort {
  extract(
    file: File,
  ): Promise<{ text: string; fileName: string; characters: number }>;
}
