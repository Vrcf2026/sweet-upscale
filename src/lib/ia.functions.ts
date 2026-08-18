import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type EquipRow = { equip: string; marca: string; serie: string; local: string };

async function chamarIA(system: string, user: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("IA indisponível: falta a configuração do servidor.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user.slice(0, 24000) },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Limite de pedidos de IA atingido. Tenta daqui a pouco.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados.");
  if (!res.ok) throw new Error("A IA não conseguiu processar o texto.");

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  const limpo = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const inicio = limpo.search(/[[{]/);
  try {
    return JSON.parse(inicio >= 0 ? limpo.slice(inicio) : limpo);
  } catch {
    throw new Error("Resposta da IA em formato inesperado.");
  }
}

async function chamarIAComImagem(system: string, textoUser: string, imagemDataUrl: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("IA indisponível: falta a configuração do servidor.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: textoUser },
            { type: "image_url", image_url: { url: imagemDataUrl } },
          ],
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Limite de pedidos de IA atingido. Tenta daqui a pouco.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados.");
  if (!res.ok) throw new Error("A IA não conseguiu processar a imagem.");

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

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

export const avaliarFoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fotoDataUrl: string }) => {
    if (!data?.fotoDataUrl?.startsWith("data:image")) throw new Error("Foto inválida");
    return data;
  })
  .handler(async ({ data }) => {
    const texto = await chamarIAComImagem(
      "És um consultor técnico que apoia um instalador certificado de sistemas de videovigilância em Portugal (Registo Prévio PSP, Lei n.º 34/2013). Olha para a foto do local/enquadramento das câmaras e dá uma opinião curta (máximo 4 frases, português de Portugal) sobre possíveis pontos de atenção de conformidade: se o enquadramento parece incidir sobre via pública, entradas comuns a terceiros ou propriedades vizinhas, se falta sinalética de videovigilância visível, ou outros pontos relevantes que seja possível avaliar apenas pela imagem. É uma SUGESTÃO de apoio de um consultor, não uma validação legal nem uma certificação — o técnico responsável decide e confirma no local. Termina sempre a lembrar isso claramente. Se a foto não permitir avaliar nada com utilidade, diz isso mesmo em vez de inventar.",
      "Analisa esta foto do local/instalação e dá a tua opinião de apoio.",
      data.fotoDataUrl,
    );
    return { texto };
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
