import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { DocumentTextPort } from "../../application/ports/document";

const MAX = Number(process.env.MAX_SOURCE_LENGTH || 18000);
export const pdfDocumentAdapter: DocumentTextPort = {
  async extract(file) {
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
    let document: any;
    try {
      const loadingTask = getDocument({
        data,
        disableWorker: true,
        useWorkerFetch: false,
        isEvalSupported: false,
      } as any);
      document = await loadingTask.promise;
      const pages: string[] = [];
      for (
        let pageNumber = 1;
        pageNumber <= document.numPages;
        pageNumber += 1
      ) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
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
        page.cleanup();
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
      await document?.destroy();
    }
  },
};
