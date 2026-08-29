import { enviarParaDrive, pastaBackups } from "./drive.server";

const TABELAS = [
  "empresa",
  "clientes",
  "instalacoes",
  "equipamentos",
  "intervencoes",
  "documentos",
  "auditoria",
] as const;

/** Recolhe todos os dados da aplicação (acesso privilegiado — só servidor). */
export async function recolherTudo() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const dados: Record<string, unknown[]> = {};
  for (const t of TABELAS) {
    const { data, error } = await supabaseAdmin.from(t).select("*");
    if (error) throw new Error(`${t}: ${error.message}`);
    dados[t] = data ?? [];
  }
  return { exportado_em: new Date().toISOString(), ...dados };
}

/** Recolhe tudo, envia para a Google Drive da empresa e regista o resultado. */
export async function backupParaDrive(origem: "manual" | "automatico") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
  const nome = `backup-${carimbo}.json`;
  try {
    const dados = await recolherTudo();
    const pastaId = await pastaBackups();
    const enviado = await enviarParaDrive({
      nome,
      conteudo: JSON.stringify(dados, null, 2),
      mimeType: "application/json",
      pastaId,
    });
    await supabaseAdmin.from("backups").insert({
      origem,
      ficheiro: enviado.nome,
      drive_file_id: enviado.id,
      drive_link: enviado.link,
      tamanho_bytes: enviado.tamanho,
      estado: "ok",
    });
    return { ok: true as const, ficheiro: enviado.nome, link: enviado.link };
  } catch (e) {
    const erro = (e as Error).message;
    await supabaseAdmin
      .from("backups")
      .insert({ origem, ficheiro: nome, estado: "erro", erro });
    throw new Error(erro);
  }
}
