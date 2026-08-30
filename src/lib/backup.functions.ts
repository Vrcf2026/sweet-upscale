import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RegistoBackup = {
  id: string;
  origem: string;
  ficheiro: string;
  drive_link: string | null;
  tamanho_bytes: number;
  estado: string;
  erro: string | null;
  created_at: string;
};

async function garantirSuperadmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await sb.rpc("has_role", {
    _user_id: context.userId,
    _role: "superadmin",
  });
  if (data !== true) throw new Error("Apenas o superadmin pode gerir backups");
}

export const enviarBackupDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirSuperadmin(context);
    const { backupParaDrive } = await import("./backup.server");
    return backupParaDrive("manual");
  });

export const listarBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RegistoBackup[]> => {
    const sb = context.supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          order: (
            c: string,
            o: { ascending: boolean },
          ) => { limit: (n: number) => Promise<{ data: RegistoBackup[] | null }> };
        };
      };
    };

    const { data } = await sb
      .from("backups")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
