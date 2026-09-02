import { enviarEmail } from "./email.server";

const DIAS_AVISO = 30;
const DIAS_ENTRE_LEMBRETES = 7;

/**
 * Verifica todas as instalações com manutenção a vencer ou em atraso e envia
 * um único email de resumo por utilizador (dono das instalações), no máximo
 * uma vez por semana por instalação, para não spammar todos os dias.
 */
export async function enviarLembretesManutencao() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hoje = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_AVISO);

  const { data: instalacoes, error } = await supabaseAdmin
    .from("instalacoes")
    .select("id, user_id, entidade, morada, proxima_manutencao, lembrete_enviado_em")
    .not("proxima_manutencao", "is", null)
    .lte("proxima_manutencao", limite.toISOString().slice(0, 10));
  if (error) throw new Error(error.message);

  const aEnviar = (instalacoes ?? []).filter((i) => {
    if (!i.lembrete_enviado_em) return true;
    const dias = (hoje.getTime() - new Date(i.lembrete_enviado_em).getTime()) / 86_400_000;
    return dias >= DIAS_ENTRE_LEMBRETES;
  });

  const porUtilizador = new Map<string, typeof aEnviar>();
  for (const i of aEnviar) {
    const lista = porUtilizador.get(i.user_id) ?? [];
    lista.push(i);
    porUtilizador.set(i.user_id, lista);
  }

  let utilizadoresNotificados = 0;
  const erros: string[] = [];

  for (const [userId, lista] of porUtilizador) {
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const email = perfil?.email;
    if (!email) continue;

    const linhas = lista
      .map((i) => {
        const atrasada = new Date(`${i.proxima_manutencao}T00:00:00`) < hoje;
        const data = new Date(`${i.proxima_manutencao}T00:00:00`).toLocaleDateString("pt-PT");
        return `<li>${atrasada ? "🔴 <b>EM ATRASO</b>" : "🟠 a vencer"} — ${
          i.entidade || i.morada || "Instalação"
        } (${data})</li>`;
      })
      .join("");

    try {
      await enviarEmail({
        para: email,
        assunto: `${lista.length} instalação${lista.length > 1 ? "ões" : ""} com manutenção a vencer`,
        html: `<p>Olá,</p><p>Estas instalações têm manutenção periódica a vencer ou em atraso:</p><ul>${linhas}</ul><p>Abre a app para consultar cada uma e agendar a visita.</p>`,
      });
      utilizadoresNotificados += 1;
      const ids = lista.map((i) => i.id);
      await supabaseAdmin
        .from("instalacoes")
        .update({ lembrete_enviado_em: hoje.toISOString() })
        .in("id", ids);
    } catch (e) {
      erros.push((e as Error).message);
    }
  }

  return { ok: true as const, utilizadores_notificados: utilizadoresNotificados, erros };
}
