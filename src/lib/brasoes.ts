import { supabase } from "@/integrations/supabase/client";

/**
 * Brasões oficiais (PSP/GNR) guardados na base de dados e partilhados por
 * toda a equipa — antes viviam só no localStorage de cada dispositivo.
 */
export async function fetchBrasao(autoridade: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("brasoes")
    .select("imagem")
    .eq("autoridade", autoridade)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.imagem ?? null;
}

export async function guardarBrasao(autoridade: string, imagem: string) {
  const { data: sessao } = await supabase.auth.getUser();
  const { error } = await supabase.from("brasoes").upsert(
    {
      autoridade,
      imagem,
      updated_by: sessao.user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "autoridade" },
  );
  if (error) throw new Error(error.message);
}
