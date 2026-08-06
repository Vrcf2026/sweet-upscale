export async function exportarPdf(el: HTMLElement, nome: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.92);

  let resta = imgH;
  let pos = 0;
  pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
  resta -= pageH;
  while (resta > 0) {
    pos -= pageH;
    pdf.addPage();
    pdf.addImage(img, "JPEG", 0, pos, pageW, imgH);
    resta -= pageH;
  }

  pdf.save(`${nome}.pdf`);
}

export function comprimirImagem(file: File, maxLado = 1280, qualidade = 0.75) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function lerExcel(file: File) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const pick = (row: Record<string, unknown>, keys: string[]) => {
    const entry = Object.entries(row).find(([k]) =>
      keys.some((key) => k.toLowerCase().replace(/[^a-z]/g, "").includes(key)),
    );
    return entry ? String(entry[1] ?? "").trim() : "";
  };

  return rows
    .map((row) => ({
      equip: pick(row, ["equipamento", "artigo", "designacao"]),
      marca: pick(row, ["marca", "modelo"]),
      serie: pick(row, ["serie", "sn", "numserie"]),
      local: pick(row, ["local", "localizacao", "zona"]),
    }))
    .filter((r) => r.equip);
}

export async function extrairTextoPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let texto = "";
  for (let p = 1; p <= Math.min(doc.numPages, 15); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    texto +=
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ") + "\n";
  }
  return texto;
}
