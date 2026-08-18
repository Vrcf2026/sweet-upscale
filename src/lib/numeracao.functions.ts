import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const proximoNumeroDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ano = new Date().getFullYear();

    const { data: existente } = await supabaseAdmin
      .from("doc_counters")
      .select("seq")
      .eq("user_id", context.userId)
      .eq("ano", ano)
      .maybeSingle();

    const seq = (existente?.seq ?? 0) + 1;

    const { error } = await supabaseAdmin
      .from("doc_counters")
      .upsert({ user_id: context.userId, ano, seq }, { onConflict: "user_id,ano" });
    if (error) throw new Error(error.message);

    return `${ano}/${String(seq).padStart(4, "0")}`;
  });
