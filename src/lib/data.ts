import { supabase } from "@/integrations/supabase/client";
import type {
  Cliente,
  Documento,
  Empresa,
  Equipamento,
  Instalacao,
  Intervencao,
} from "./model";

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada");
  return data.user.id;
}

export async function fetchEmpresa() {
  const res = await supabase.from("empresa").select("*").maybeSingle();
  return unwrap<Empresa | null>(res);
}

export async function fetchClientes() {
  const res = await supabase.from("clientes").select("*").order("nome");
  return unwrap<Cliente[]>(res);
}

export async function fetchCliente(id: string) {
  const res = await supabase.from("clientes").select("*").eq("id", id).maybeSingle();
  return unwrap<Cliente | null>(res);
}

export async function fetchInstalacoes(clienteId?: string) {
  let q = supabase.from("instalacoes").select("*").order("created_at", { ascending: false });
  if (clienteId) q = q.eq("cliente_id", clienteId);
  return unwrap<Instalacao[]>(await q);
}

export async function fetchInstalacao(id: string) {
  const res = await supabase.from("instalacoes").select("*").eq("id", id).maybeSingle();
  return unwrap<Instalacao | null>(res);
}

export async function fetchEquipamentos(instalacaoId: string) {
  const res = await supabase
    .from("equipamentos")
    .select("*")
    .eq("instalacao_id", instalacaoId)
    .order("ordem");
  return unwrap<Equipamento[]>(res);
}

export async function fetchIntervencoes(instalacaoId: string) {
  const res = await supabase
    .from("intervencoes")
    .select("*")
    .eq("instalacao_id", instalacaoId)
    .order("data", { ascending: false });
  return unwrap<Intervencao[]>(res);
}

export async function fetchDocumentos(filtro?: { instalacaoId?: string; clienteId?: string }) {
  let q = supabase.from("documentos").select("*").order("created_at", { ascending: false });
  if (filtro?.instalacaoId) q = q.eq("instalacao_id", filtro.instalacaoId);
  if (filtro?.clienteId) q = q.eq("cliente_id", filtro.clienteId);
  return unwrap<Documento[]>(await q);
}

export async function fetchDocumento(id: string) {
  const res = await supabase.from("documentos").select("*").eq("id", id).maybeSingle();
  return unwrap<Documento | null>(res);
}

export async function proximoNumero() {
  const { proximoNumeroDoc } = await import("./numeracao.functions");
  return String(await proximoNumeroDoc());
}

/** Pesquisa global — equipamento e intervenções de todas as instalações. */
export async function fetchEquipamentosTodos() {
  const res = await supabase
    .from("equipamentos")
    .select("id, instalacao_id, equip, marca, serie, local")
    .limit(2000);
  return unwrap<
    {
      id: string;
      instalacao_id: string;
      equip: string;
      marca: string | null;
      serie: string | null;
      local: string | null;
    }[]
  >(res);
}

export async function fetchIntervencoesTodas() {
  const res = await supabase
    .from("intervencoes")
    .select("id, instalacao_id, data, tipo, causa, trabalhos, num_relatorio, tecnico")
    .order("data", { ascending: false })
    .limit(2000);
  return unwrap<
    {
      id: string;
      instalacao_id: string;
      data: string;
      tipo: string | null;
      causa: string | null;
      trabalhos: string | null;
      num_relatorio: string | null;
      tecnico: string | null;
    }[]
  >(res);
}
