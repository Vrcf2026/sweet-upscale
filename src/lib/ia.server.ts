export type EquipRow = { equip: string; marca: string; serie: string; local: string };

export async function chamarIA(system: string, user: string) {
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

export async function chamarIAComImagem(system: string, textoUser: string, imagemDataUrl: string) {
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
