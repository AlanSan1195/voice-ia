import type { DocumentTextPort } from "../ports/document";
export function createDocumentUseCase(port: DocumentTextPort) { return { extract: (file: File) => port.extract(file) }; }
