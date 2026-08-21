import type { DocTipo } from "./model";

export type TipoCampo = "input" | "area" | "date" | "time";
export type Campo = { nome: string; label: string; tipo: TipoCampo; grupo?: string };

const c = (nome: string, label: string, tipo: TipoCampo = "input", grupo?: string): Campo => ({
  nome,
  label,
  tipo,
  ...(grupo ? { grupo } : {}),
});

/** Esquema declarativo dos campos de cada documento (usado pelo gerador). */
export const CAMPOS_DOC: Record<DocTipo, Campo[]> = {
  relatorio: [
    c("data", "Data", "date", "Intervenção"),
    c("hora", "Hora", "time", "Intervenção"),
    c("tipo", "Tipo de intervenção", "input", "Intervenção"),
    c("modo", "Modo de deteção", "input", "Intervenção"),
    c("tecnico", "Técnico", "input", "Intervenção"),
    c("causa", "Causa provável", "area", "Descrição"),
    c("trabalhos", "Trabalhos efetuados", "area", "Descrição"),
    c("conclusao", "Conclusão", "area", "Descrição"),
  ],
  livro: [],
  declaracao: [
    c("texto", "Texto da declaração (opcional)", "area", "Declaração"),
    c("servicos", "Serviços contratados", "area", "Declaração"),
  ],
  auto: [
    c("retencao", "Retenção de imagens (dias)", "input", "Auto"),
    c("testes", "Testes efetuados", "area", "Auto"),
    c("observacoes", "Observações", "area", "Auto"),
  ],
  comunicacao: [
    c("data", "Data", "date", "Autoridade"),
    c("subunidade", "Subunidade (esquadra / posto)", "input", "Autoridade"),
    c("decNome", "Nome do declarante", "input", "Declarante"),
    c("decMorada", "Morada do declarante", "input", "Declarante"),
    c("decLocalidade", "Localidade do declarante", "input", "Declarante"),
    c("decCp", "Código postal do declarante", "input", "Declarante"),
    c("decTipoDoc", "Tipo de doc. identificação", "input", "Declarante"),
    c("decNumDoc", "N.º do documento", "input", "Declarante"),
    c("decTlf", "Telefone", "input", "Declarante"),
    c("decTlm", "Telemóvel", "input", "Declarante"),
    c("decEmail", "Correio eletrónico", "input", "Declarante"),
    c("localMorada", "Morada do local do alarme", "input", "Local do alarme"),
    c("localLocalidade", "Localidade do local", "input", "Local do alarme"),
    c("localCp", "Código postal do local", "input", "Local do alarme"),
    c("marca", "Marca do alarme", "input", "Local do alarme"),
    c("modelo", "Modelo do alarme", "input", "Local do alarme"),
    c("instaladoPor", "Alarme instalado por", "input", "Local do alarme"),
    c("contacto1Nome", "Nome do contacto 1", "input", "Reposição — contacto 1"),
    c("contacto1Morada", "Morada do contacto 1", "input", "Reposição — contacto 1"),
    c("contacto1Localidade", "Localidade do contacto 1", "input", "Reposição — contacto 1"),
    c("contacto1Cp", "Código postal do contacto 1", "input", "Reposição — contacto 1"),
    c("contacto1Doc", "Tipo e n.º doc. do contacto 1", "input", "Reposição — contacto 1"),
    c("contacto1Tlf", "Telefone do contacto 1", "input", "Reposição — contacto 1"),
    c("contacto1Tlm", "Telemóvel do contacto 1", "input", "Reposição — contacto 1"),
    c("contacto2Nome", "Nome do contacto 2", "input", "Reposição — contacto 2"),
    c("contacto2Morada", "Morada do contacto 2", "input", "Reposição — contacto 2"),
    c("contacto2Localidade", "Localidade do contacto 2", "input", "Reposição — contacto 2"),
    c("contacto2Cp", "Código postal do contacto 2", "input", "Reposição — contacto 2"),
    c("contacto2Doc", "Tipo e n.º doc. do contacto 2", "input", "Reposição — contacto 2"),
    c("contacto2Tlf", "Telefone do contacto 2", "input", "Reposição — contacto 2"),
    c("contacto2Tlm", "Telemóvel do contacto 2", "input", "Reposição — contacto 2"),
    c("observacoes", "Observações", "area", "Observações"),
  ],
};

export const CAMPOS_ASSINANTE: Campo[] = [
  c("nomeAssinante", "Nome de quem assina"),
  c("qualidadeAssinante", "Qualidade (ex.: responsável pelo sistema)"),
  c("docAssinante", "N.º CC / NIF"),
];

/** Agrupa os campos por secção mantendo a ordem de declaração. */
export function agrupar(campos: Campo[]) {
  const grupos: { grupo: string; campos: Campo[] }[] = [];
  campos.forEach((campo) => {
    const nome = campo.grupo ?? "Preenchimento";
    const atual = grupos.find((g) => g.grupo === nome);
    if (atual) atual.campos.push(campo);
    else grupos.push({ grupo: nome, campos: [campo] });
  });
  return grupos;
}
