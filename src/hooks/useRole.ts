import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "superadmin" | "tecnico";

export function useRole() {
  const query = useQuery({
    queryKey: ["meu-role"],
    queryFn: async (): Promise<AppRole> => {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao.user) return "tecnico";
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sessao.user.id)
        .maybeSingle();
      return ((data?.role as AppRole | undefined) ?? "tecnico");
    },
    staleTime: 5 * 60 * 1000,
  });

  return { role: query.data, isSuperadmin: query.data === "superadmin", loading: query.isLoading };
}
