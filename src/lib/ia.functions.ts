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
  const limpo = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = limpo.search(/[[{]/);
  try {
    return JSON.parse(inicio >= 0 ? limpo.slice(inicio) : limpo);
  } catch {
    throw new Error("Resposta da IA em formato inesperado.");
  }
}

export const estruturarEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { texto: string }) => {
    if (!data?.texto?.trim()) throw new Error("Texto vazio");
    return data;
  })
  .handler(async ({ data }) => {
    const result = await chamarIA(
      "És um assistente de um instalador de sistemas de segurança em Portugal. Recebes texto solto de faturas, packing lists ou orçamentos e devolves APENAS um array JSON de equipamentos, no formato [{\"equip\":\"\",\"marca\":\"\",\"serie\":\"\",\"local\":\"\"}]. equip = designação do equipamento, marca = marca/modelo, serie = número de série se existir, local = localização se indicada. Sem texto extra.",
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
