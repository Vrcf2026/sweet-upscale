const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !driveKey) {
    throw new Error("Google Drive não está ligado a este projeto.");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": driveKey,
  };
}

async function ler(res: Response) {
  const texto = await res.text();
  if (!res.ok) {
    console.error(`[Drive] ${res.status}: ${texto}`);
    throw new Error(`Google Drive respondeu ${res.status}: ${texto}`);
  }
  return texto ? (JSON.parse(texto) as Record<string, unknown>) : {};
}

/** Encontra (ou cria) a pasta de backups na Drive da empresa. */
export async function pastaBackups(nome = "Backups Registo Prévio"): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${nome.replace(/'/g, "\\'")}' and trashed=false`,
  );
  const lista = await ler(
    await fetch(`${GATEWAY}/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`, {
      headers: headers(),
    }),
  );
  const ficheiros = (lista["files"] as { id: string }[] | undefined) ?? [];
  if (ficheiros[0]) return ficheiros[0].id;

  const criada = await ler(
    await fetch(`${GATEWAY}/drive/v3/files?fields=id`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome, mimeType: "application/vnd.google-apps.folder" }),
    }),
  );
  return criada["id"] as string;
}

/** Envia um ficheiro de texto para a Drive e devolve o id e a ligação. */
export async function enviarParaDrive(opcoes: {
  nome: string;
  conteudo: string;
  mimeType: string;
  pastaId?: string;
}) {
  const fronteira = `lov${Date.now()}`;
  const metadados = {
    name: opcoes.nome,
    ...(opcoes.pastaId ? { parents: [opcoes.pastaId] } : {}),
  };
  const corpo =
    `--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadados)}\r\n` +
    `--${fronteira}\r\nContent-Type: ${opcoes.mimeType}\r\n\r\n` +
    `${opcoes.conteudo}\r\n--${fronteira}--`;

  const res = await fetch(
    `${GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": `multipart/related; boundary=${fronteira}` },
      body: corpo,
    },
  );
  const dados = await ler(res);
  return {
    id: String(dados["id"] ?? ""),
    nome: String(dados["name"] ?? opcoes.nome),
    link: (dados["webViewLink"] as string | undefined) ?? null,
    tamanho: new TextEncoder().encode(opcoes.conteudo).length,
  };
}
