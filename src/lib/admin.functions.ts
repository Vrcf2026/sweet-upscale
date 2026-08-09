import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPERADMIN_EMAIL = "vrcf.loja@gmail.com";

export type UtilizadorAdmin = {
  id: string;
  email: string;
  nome: string;
  role: "superadmin" | "tecnico";
  acessos: { id: string; cliente_id: string | null; instalacao_id: string | null }[];
};

async function garantirSuperadmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data } = await supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "superadmin",
  });
  if (data !== true) throw new Error("Apenas o superadmin pode gerir utilizadores");
}

export const listarUtilizadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UtilizadorAdmin[]> => {
    await garantirSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: perfis }, { data: roles }, { data: acessos }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nome, email"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("acessos").select("id, user_id, cliente_id, instalacao_id"),
    ]);

    return (perfis ?? []).map((p) => ({
      id: p.id,
      email: p.email ?? "",
      nome: p.nome ?? p.email ?? "",
      role:
        ((roles ?? []).find((r) => r.user_id === p.id)?.role as "superadmin" | "tecnico") ??
        "tecnico",
      acessos: (acessos ?? [])
        .filter((a) => a.user_id === p.id)
        .map((a) => ({ id: a.id, cliente_id: a.cliente_id, instalacao_id: a.instalacao_id })),
    }));
  });

export const criarUtilizador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; password: string; nome: string; role: "superadmin" | "tecnico" }) => {
    if (!data.email.includes("@")) throw new Error("Email inválido");
    if (data.password.length < 8) throw new Error("A palavra-passe precisa de 8 caracteres");
    return data;
  })
  .handler(async ({ data, context }) => {
    await garantirSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Não foi possível criar o utilizador");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", criado.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: criado.user.id, role: data.role });
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: criado.user.id, email: data.email, nome: data.nome || data.email });

    return { id: criado.user.id };
  });

export const definirRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: "superadmin" | "tecnico" }) => data)
  .handler(async ({ data, context }) => {
    await garantirSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const redefinirPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; password: string }) => {
    if (data.password.length < 8) throw new Error("A palavra-passe precisa de 8 caracteres");
    return data;
  })
  .handler(async ({ data, context }) => {
    await garantirSuperadmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apagarUtilizador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await garantirSuperadmin(context);
    if (data.userId === context.userId) throw new Error("Não podes apagar a tua própria conta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cria a conta do superadmin inicial se ainda não existir nenhum superadmin. */
export const arrancarSuperadmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existentes } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "superadmin");
  if (existentes && existentes.length > 0) return { criado: false };

  const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
    email: SUPERADMIN_EMAIL,
    password: "Vrcf2025*",
    email_confirm: true,
    user_metadata: { nome: "Superadmin" },
  });
  if (error || !criado.user) return { criado: false };
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: criado.user.id, role: "superadmin" }, { onConflict: "user_id,role" });
  return { criado: true };
});
