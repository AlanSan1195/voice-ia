import { describe, expect, it } from "bun:test";
import { pdfDocumentAdapter } from "./pdf";

function makeTextPdf(text: string) {
  const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${text}) Tj\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

describe("pdfDocumentAdapter", () => {
  it("extracts text and releases the pdf.js loading task", async () => {
    const source =
      "Senior software engineer with experience in TypeScript React APIs testing cloud architecture and team leadership";
    const file = new File([makeTextPdf(source)], "resume.pdf", {
      type: "application/pdf",
    });

    const result = await pdfDocumentAdapter.extract(file);

    expect(result.fileName).toBe("resume.pdf");
    expect(result.text).toContain("Senior software engineer");
    expect(result.characters).toBeGreaterThan(80);
  });
});
