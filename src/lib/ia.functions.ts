import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chamarIA, chamarIAComImagem, type EquipRow } from "./ia.server";

export const estruturarEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { texto: string }) => {
    if (!data?.texto?.trim()) throw new Error("Texto vazio");
    return data;
  })
  .handler(async ({ data }) => {
    const result = await chamarIA(
      'És um assistente de um instalador de sistemas de segurança em Portugal. Recebes texto solto de faturas, packing lists ou orçamentos e devolves APENAS um array JSON de equipamentos, no formato [{"equip":"","marca":"","serie":"","local":""}]. equip = designação do equipamento, marca = marca/modelo, serie = número de série se existir, local = localização se indicada. Sem texto extra.',
      data.texto,
    );
    const arr = Array.isArray(result) ? result : (result?.equipamentos ?? []);
    return (arr as EquipRow[])
      .map((r) => ({
        equip: String(r?.equip ?? "").trim(),
        marca: String(r?.marca ?? "").trim(),
        serie: String(r?.serie ?? "").trim(),
        local: String(r?.local ?? "").trim(),
      }))
      .filter((r) => r.equip);
  });

export const extrairOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { texto: string }) => {
    if (!data?.texto?.trim()) throw new Error("Texto vazio");
    return data;
  })
  .handler(async ({ data }) => {
    const result = await chamarIA(
      'És um assistente de um instalador de sistemas de segurança em Portugal. Recebes o texto de um orçamento e devolves APENAS JSON no formato {"cliente":{"nome":"","nif":"","morada":"","localidade":"","cp":"","email":"","tlm":""},"instalacao":{"entidade":"","tipo_sistema":"","morada":"","localidade":""},"equipamentos":[{"equip":"","marca":"","serie":"","local":""}]}. Deixa vazio o que não conseguires determinar. Sem texto extra.',
      data.texto,
    );
    return {
      cliente: (result?.cliente ?? {}) as Record<string, string>,
      instalacao: (result?.instalacao ?? {}) as Record<string, string>,
      equipamentos: (Array.isArray(result?.equipamentos) ? result.equipamentos : []) as EquipRow[],
    };
  });

export type PontoRgpd = { titulo: string; nivel: "ok" | "atencao" | "risco"; nota: string };
export type AvaliacaoRgpd = {
  veredicto: "conforme" | "atencao" | "risco" | "indeterminado";
  resumo: string;
  pontos: PontoRgpd[];
  recomendacoes: string[];
};

const NIVEIS = ["ok", "atencao", "risco"] as const;

export const avaliarFoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fotoDataUrl: string }) => {
    if (!data?.fotoDataUrl?.startsWith("data:image")) throw new Error("Foto inválida");
    return data;
  })
  .handler(async ({ data }): Promise<AvaliacaoRgpd> => {
    const bruto = await chamarIAComImagem(
      [
        "És um consultor de proteção de dados e videovigilância em Portugal (RGPD - Regulamento (UE) 2016/679, Lei n.º 58/2019, Lei n.º 34/2013 e deliberações da CNPD sobre videovigilância).",
        "Recebes uma fotografia do local ou do enquadramento captado por uma câmara e avalias APENAS o que é visível na imagem, na ótica da conformidade com o RGPD.",
        "Verifica em concreto: (1) se o campo de visão abrange via pública, passeios ou estradas; (2) se abrange propriedade de vizinhos, janelas, varandas ou logradouros de terceiros; (3) se abrange zonas comuns de condomínio ou acessos partilhados; (4) se capta zonas de expectativa reforçada de privacidade (interior de habitações, vestiários, sanitários, zonas de descanso ou de refeição de trabalhadores); (5) se capta postos de trabalho de forma a permitir controlo do desempenho dos trabalhadores; (6) se existe sinalética de videovigilância visível e legível; (7) se a captação parece exceder o mínimo necessário para a finalidade de proteção de pessoas e bens (princípio da minimização).",
        "Responde APENAS com JSON válido, sem texto fora do JSON, no formato:",
        '{"veredicto":"conforme|atencao|risco|indeterminado","resumo":"1 a 2 frases","pontos":[{"titulo":"","nivel":"ok|atencao|risco","nota":""}],"recomendacoes":[""]}',
        "Usa português de Portugal. Cria um ponto para cada um dos 7 aspetos que consigas avaliar; omite os que a imagem não permita avaliar. Se a imagem não permitir concluir nada de útil, devolve veredicto \"indeterminado\" e explica no resumo. Não inventes o que não é visível. O resumo deve terminar a lembrar que é uma apreciação de apoio e que o responsável pelo tratamento confirma no local.",
      ].join("\n"),
      "Avalia esta fotografia do enquadramento/local quanto ao cumprimento do RGPD.",
      data.fotoDataUrl,
    );

    const limpo = bruto.replace(/```json/gi, "").replace(/```/g, "").trim();
    const inicio = limpo.indexOf("{");
    let obj: Record<string, unknown> = {};
    try {
      obj = JSON.parse(inicio >= 0 ? limpo.slice(inicio) : limpo) as Record<string, unknown>;
    } catch {
      return {
        veredicto: "indeterminado",
        resumo: limpo || "A IA não devolveu uma avaliação utilizável.",
        pontos: [],
        recomendacoes: [],
      };
    }

    const vRaw = String(obj["veredicto"] ?? "indeterminado");
    const veredicto = (["conforme", "atencao", "risco", "indeterminado"] as const).includes(
      vRaw as AvaliacaoRgpd["veredicto"],
    )
      ? (vRaw as AvaliacaoRgpd["veredicto"])
      : "indeterminado";

    const pontos = (Array.isArray(obj["pontos"]) ? obj["pontos"] : [])
      .map((p) => {
        const r = (p ?? {}) as Record<string, unknown>;
        const nivelRaw = String(r["nivel"] ?? "atencao");
        return {
          titulo: String(r["titulo"] ?? "").trim(),
          nivel: (NIVEIS as readonly string[]).includes(nivelRaw)
            ? (nivelRaw as PontoRgpd["nivel"])
            : "atencao",
          nota: String(r["nota"] ?? "").trim(),
        };
      })
      .filter((p) => p.titulo || p.nota);

    const recomendacoes = (Array.isArray(obj["recomendacoes"]) ? obj["recomendacoes"] : [])
      .map((r) => String(r ?? "").trim())
      .filter(Boolean);

    return { veredicto, resumo: String(obj["resumo"] ?? "").trim(), pontos, recomendacoes };
  });


export const verificarCertificacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { equipamentos: { equip: string; marca: string }[] }) => {
    if (!Array.isArray(data?.equipamentos) || !data.equipamentos.length) {
      throw new Error("Sem equipamento para verificar");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const lista = data.equipamentos
      .map((e, n) => `${n + 1}. ${e.equip || "(sem tipo)"} — ${e.marca || "(sem marca/modelo)"}`)
      .join("\n");
    const result = await chamarIA(
      'Não tens acesso à internet em tempo real — respondes apenas com base no teu conhecimento geral de treino, que pode estar desatualizado ou incompleto. Para cada equipamento de segurança privada listado, diz se reconheces referência às normas técnicas aplicáveis em Portugal (CLC/TS 50131-7 para centrais/alarme de intrusão, EN 62676-4 para videovigilância, EN 60839-11-2 para controlo de acessos). Se não tiveres confiança razoável na informação para aquele modelo específico, marca "situacao":"nao_confirmado" em vez de arriscar uma resposta positiva sem certeza — mais vale admitir que não sabes. Devolve APENAS um array JSON, na mesma ordem da lista de entrada, no formato [{"equip":"","situacao":"confirmado"|"nao_confirmado","nota":""}]. "nota" é uma frase curta em português a explicar a situação. Sem texto fora do JSON.',
      lista,
    );
    const arr = Array.isArray(result) ? result : [];
    return arr as { equip: string; situacao: string; nota: string }[];
  });
