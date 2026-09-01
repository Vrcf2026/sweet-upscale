import { supabase } from "@/integrations/supabase/client";

export type Auditoria = {
  id: string;
  user_id: string;
  entidade: string;
  entidade_id: string | null;
  accao: string;
  descricao: string;
  detalhe: Record<string, unknown>;
  created_at: string;
};

export type Accao = "criou" | "alterou" | "apagou" | "gerou" | "estado" | "arquivou" | "enviou";

export const ACCAO_LABEL: Record<Accao, string> = {
  criou: "Criou",
  alterou: "Alterou",
  apagou: "Apagou",
  gerou: "Gerou",
  estado: "Mudou estado",
  arquivou: "Arquivou",
  enviou: "Enviou ao cliente",
};

/** Regista uma ação no trilho de auditoria. Nunca quebra a operação principal. */
export async function registar(
  entidade: string,
  accao: Accao,
  entidadeId: string | null,
  descricao: string,
  detalhe: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("auditoria").insert({
      user_id: data.user.id,
      entidade,
      entidade_id: entidadeId,
      accao,
      descricao,
      detalhe: detalhe as never,
    });
  } catch {
    /* auditoria é best-effort */
  }
}

export async function fetchAuditoria(limite = 200) {
  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Auditoria[];
}
