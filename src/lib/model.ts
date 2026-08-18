export type Empresa = {
  id: string;
  user_id: string;
  nome: string;
  nipc: string | null;
  registo: string | null;
  data_emissao: string | null;
  morada: string | null;
  localidade: string | null;
  contacto: string | null;
  tecnico: string | null;
};

export type Cliente = {
  id: string;
  user_id: string;
  nome: string;
  nif: string | null;
  contacto: string | null;
  morada: string | null;
  localidade: string | null;
  cp: string | null;
  tlm: string | null;
  tel: string | null;
  email: string | null;
  created_at: string;
};

export type Instalacao = {
  id: string;
  user_id: string;
  cliente_id: string;
  entidade: string | null;
  sistema_id: string | null;
  tipo_sistema: string | null;
  morada: string | null;
  localidade: string | null;
  responsavel: string | null;
  contacto_resp: string | null;
  instalado_por: string | null;
  data_instalacao: string | null;
  num_registo: string | null;
  monitorizado_por: string | null;
  periodicidade_meses: number | null;
  proxima_manutencao: string | null;
  estado: string;
  autoridade: string | null;
  autoridade_subunidade: string | null;
  created_at: string;
};

export type Equipamento = {
  id: string;
  instalacao_id: string;
  equip: string;
  marca: string | null;
  serie: string | null;
  local: string | null;
  ordem: number;
};

export type Intervencao = {
  id: string;
  instalacao_id: string;
  data: string;
  hora: string | null;
  tipo: string | null;
  modo: string | null;
  causa: string | null;
  trabalhos: string | null;
  num_relatorio: string | null;
  tecnico: string | null;
};

export const TIPOS_SISTEMA = [
  "Videovigilância",
  "Alarme",
  "Videovigilância + Alarme",
  "Outro",
] as const;

export const ESTADOS_INSTALACAO = [
  { valor: "ativa", label: "Ativa" },
  { valor: "concluida", label: "Concluída" },
  { valor: "entregue", label: "Entregue ao cliente" },
] as const;

export type DocTipo = "relatorio" | "livro" | "declaracao" | "auto";

export type Documento = {
  id: string;
  user_id: string;
  cliente_id: string | null;
  instalacao_id: string | null;
  tipo: DocTipo;
  numero: string | null;
  resumo: string | null;
  estado: "rascunho" | "assinado" | "entregue";
  html: string;
  dados: Record<string, unknown>;
  created_at: string;
};

export const DOC_LABEL: Record<DocTipo, string> = {
  relatorio: "Relatório Técnico de Intervenção",
  livro: "Livro de Registos do Sistema",
  declaracao: "Declaração de Instalação",
  auto: "Auto de Instalação",
};

export const ESTADO_LABEL: Record<Documento["estado"], string> = {
  rascunho: "Rascunho",
  assinado: "Assinado",
  entregue: "Entregue",
};
