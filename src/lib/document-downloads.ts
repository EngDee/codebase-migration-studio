/** Browser-only document export; import heavy renderers only when preparing an output. */
export async function captureDocument(element: HTMLElement) {
  await document.fonts.ready;
  await Promise.all(Array.from(element.querySelectorAll("img")).map(async (image) => {
    await image.decode();
  }));
  const { default: html2canvas } = await import("html2canvas-pro");
  return html2canvas(element, { scale: 3, useCORS: true, backgroundColor: null, logging: false });
}

export async function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare image.")), "image/png"));
}

export async function documentPdf(canvases: HTMLCanvasElement[], format: "card" | "a4"): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  for (const canvas of canvases) {
    const image = await pdf.embedPng(await (await canvasPng(canvas)).arrayBuffer());
    // PDF paper geometry is not a UI design token. Card pages preserve the full rendered aspect ratio.
    const width = format === "card" ? 297.64 : 595.28;
    const height = format === "card" ? width * canvas.height / canvas.width : 841.89;
    const margin = format === "card" ? 0 : 34;
    const scale = Math.min((width - margin * 2) / image.width, (height - margin * 2) / image.height);
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: margin, y: height - margin - image.height * scale, width: image.width * scale, height: image.height * scale });
  }
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}

export async function deliverDocument(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function printDocument(element: HTMLElement) {
  element.setAttribute("data-membership-print", "true");
  const clear = () => { element.removeAttribute("data-membership-print"); window.removeEventListener("afterprint", clear); };
  window.addEventListener("afterprint", clear);
  window.print();
}