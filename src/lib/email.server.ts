/** Envio de email transacional (não marketing) através da API do Resend. */
export async function enviarEmail(opcoes: { para: string; assunto: string; html: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) throw new Error("Envio de email indisponível: falta a configuração do servidor.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env["RESEND_FROM"] || "onboarding@resend.dev",
      to: [opcoes.para],
      subject: opcoes.assunto,
      html: opcoes.html,
    }),
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`Resend respondeu ${res.status}: ${texto}`);
  }
  return (await res.json()) as { id: string };
}
