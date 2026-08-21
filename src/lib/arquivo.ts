import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "./data";
import { registar } from "./auditoria";

/** SHA-256 em hexadecimal — impressão digital do documento assinado. */
export async function hashSha256(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function carregarFicheiro(caminhoRelativo: string, blob: Blob, contentType: string) {
  const userId = await getUserId();
  const path = `${userId}/${caminhoRelativo}`;
  const { error } = await supabase.storage
    .from("arquivo")
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function urlAssinado(path: string, segundos = 300) {
  const { data, error } = await supabase.storage.from("arquivo").createSignedUrl(path, segundos);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Arquiva a versão final do documento em ficheiro (Storage) e guarda o hash
 * na base de dados, para prova de integridade.
 */
export async function arquivarDocumento(doc: {
  id: string;
  numero: string | null;
  html: string;
  hash?: string | null;
}) {
  const hash = await hashSha256(doc.html);
  const nome = (doc.numero ?? doc.id).replace(/[^\w.-]+/g, "_");
  const path = await carregarFicheiro(
    `documentos/${doc.id}/${nome}.html`,
    new Blob([doc.html], { type: "text/html;charset=utf-8" }),
    "text/html",
  );
  const { error } = await supabase
    .from("documentos")
    .update({ hash, ficheiro_path: path })
    .eq("id", doc.id);
  if (error) throw new Error(error.message);
  await registar("documento", "arquivou", doc.id, `Documento ${doc.numero ?? ""} arquivado`, {
    hash,
    path,
  });
  return { hash, path };
}

/** Guarda uma fotografia no arquivo e devolve o caminho. */
export async function arquivarFoto(instalacaoId: string, dataUrl: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return carregarFicheiro(
    `fotos/${instalacaoId}/${Date.now()}.jpg`,
    blob,
    blob.type || "image/jpeg",
  );
}
