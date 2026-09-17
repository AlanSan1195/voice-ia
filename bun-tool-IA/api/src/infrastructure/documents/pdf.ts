import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { DocumentTextPort } from "../../application/ports/document";

const MAX = Number(process.env.MAX_SOURCE_LENGTH || 18000);
const MAX_PAGES = Number(process.env.MAX_PDF_PAGES || 50);
const PAGE_TIMEOUT_MS = Number(process.env.PDF_PAGE_TIMEOUT_MS || 10_000);
export const pdfDocumentAdapter: DocumentTextPort = {
  async extract(file, signal?: AbortSignal) {
    if (file.type !== "application/pdf")
      throw Object.assign(new Error("Solo se aceptan PDFs en esta versión."), {
        code: "UNSUPPORTED_FILE",
        retryable: false,
      });
    if (file.size > 8_000_000)
      throw Object.assign(new Error("El PDF supera el límite de 8 MB."), {
        code: "FILE_TOO_LARGE",
        retryable: false,
      });
    const data = new Uint8Array(await file.arrayBuffer());
    let loadingTask: ReturnType<typeof getDocument> | undefined;
    try {
      loadingTask = getDocument({
        data,
        disableWorker: true,
        useWorkerFetch: false,
        isEvalSupported: false,
      } as any);
      const document = await loadingTask.promise;
      const pages: string[] = [];
      for (
        let pageNumber = 1;
        pageNumber <= Math.min(document.numPages, MAX_PAGES);
        pageNumber += 1
      ) {
        if (signal?.aborted)
          throw Object.assign(new Error("La solicitud fue cancelada."), {
            code: "REQUEST_ABORTED",
            retryable: true,
          });
        const page = await document.getPage(pageNumber);
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("page timeout")),
              PAGE_TIMEOUT_MS,
            );
          });
          const content = await Promise.race([page.getTextContent(), timeout]);
          const pageText = content.items
            .map((item: unknown) =>
              item &&
              typeof item === "object" &&
              "str" in item &&
              typeof item.str === "string"
                ? item.str
                : "",
            )
            .filter(Boolean)
            .join(" ");
          if (pageText) pages.push(pageText);
        } finally {
          if (timer) clearTimeout(timer);
          page.cleanup();
        }
        if (pages.join(" ").length >= MAX) break;
      }
      const text = pages.join(" ").replace(/\s+/g, " ").trim();
      if (text.length < 80)
        throw Object.assign(
          new Error(
            "No se pudo extraer suficiente texto. Verifica que el PDF tenga texto seleccionable.",
          ),
          { code: "PDF_EMPTY", retryable: false },
        );
      const normalized = text.slice(0, MAX);
      return {
        text: normalized,
        fileName: file.name,
        characters: normalized.length,
      };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) throw error;
      throw Object.assign(
        new Error(
          "No se pudo leer el PDF. Verifica que no esté protegido y que tenga texto seleccionable.",
        ),
        { code: "PDF_PARSE_FAILED", retryable: false, cause: error },
      );
    } finally {
      await loadingTask?.destroy();
    }
  },
};
