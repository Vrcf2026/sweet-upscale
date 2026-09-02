export type Conformidade = "em_dia" | "a_vencer" | "atrasada" | "sem_dados";

const DIAS_AVISO = 30;

/**
 * Estado de conformidade de manutenção de uma instalação, com base apenas na
 * data da próxima manutenção. Não avalia RGPD nem certificações — é um
 * indicador rápido, não uma auditoria completa.
 */
export function estadoConformidade(i: { proxima_manutencao?: string | null }): Conformidade {
  if (!i.proxima_manutencao) return "sem_dados";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prox = new Date(`${i.proxima_manutencao}T00:00:00`);
  const dias = (prox.getTime() - hoje.getTime()) / 86_400_000;
  if (dias < 0) return "atrasada";
  if (dias <= DIAS_AVISO) return "a_vencer";
  return "em_dia";
}

export const CONFORMIDADE_LABEL: Record<Conformidade, string> = {
  em_dia: "Manutenção em dia",
  a_vencer: "Manutenção a vencer",
  atrasada: "Manutenção em atraso",
  sem_dados: "Sem manutenção agendada",
};

export const CONFORMIDADE_BADGE: Record<Conformidade, "default" | "secondary" | "destructive"> = {
  em_dia: "secondary",
  a_vencer: "default",
  atrasada: "destructive",
  sem_dados: "secondary",
};
