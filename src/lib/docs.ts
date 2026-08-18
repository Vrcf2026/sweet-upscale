import type { Cliente, DocTipo, Empresa, Equipamento, Instalacao, Intervencao } from "./model";

export function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dataPT(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pt-PT");
}

export type DocContext = {
  tipo: DocTipo;
  numero: string;
  empresa: Empresa | null;
  cliente: Cliente | null;
  instalacao: Instalacao | null;
  equipamentos: Equipamento[];
  intervencoes: Intervencao[];
  form: Record<string, string>;
  checklist?: { label: string; ok: boolean }[];
  assinatura?: string | null;
  foto?: string | null;
  avaliacaoFoto?: string | null;
  certificacoes?: { equip: string; situacao: string; nota: string }[];
  pendencias?: string[];
};

const CSS = `
  .doc { font-family: "IBM Plex Sans", Arial, sans-serif; color:#111; background:#fff; width:190mm; padding:10mm; font-size:11px; line-height:1.45; }
  .doc h1 { font-size:15px; margin:0 0 2mm; text-transform:uppercase; letter-spacing:.5px; }
  .doc h2 { font-size:12px; margin:6mm 0 2mm; text-transform:uppercase; border-bottom:1px solid #999; padding-bottom:1mm; }
  .doc .hdr { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:3mm; }
  .doc .muted { color:#555; font-size:10px; }
  .doc table { width:100%; border-collapse:collapse; margin-top:2mm; }
  .doc th, .doc td { border:1px solid #999; padding:1.5mm 2mm; text-align:left; vertical-align:top; font-size:10px; }
  .doc th { background:#f0f0f0; }
  .doc .grid { display:grid; grid-template-columns:1fr 1fr; gap:1mm 6mm; }
  .doc .f { border-bottom:1px dotted #aaa; padding:1mm 0; }
  .doc .f b { display:inline-block; min-width:38mm; font-weight:600; }
  .doc .sign { margin-top:8mm; display:flex; gap:10mm; align-items:flex-end; }
  .doc .sign div { flex:1; border-top:1px solid #111; padding-top:1.5mm; text-align:center; font-size:10px; }
  .doc img.assin { max-height:22mm; display:block; margin:0 auto 1mm; }
  .doc img.foto { max-width:100%; max-height:70mm; border:1px solid #999; margin-top:2mm; }
  .doc ul.chk { list-style:none; padding:0; margin:2mm 0; columns:2; }
  .doc ul.chk li { padding:.5mm 0; font-size:10px; }
  .doc .legal { margin-top:8mm; border-top:1px solid #999; padding-top:2mm; font-size:8.5px; color:#444; line-height:1.4; }
  .doc .pendencias { margin:4mm 0; padding:3mm 4mm; background:#fff6dd; border:1px solid #e8c766; border-radius:2mm; }
  .doc .pendencias h3 { margin:0 0 1.5mm; font-size:11px; color:#7a5c00; }
  .doc .pendencias ul { margin:0; padding-left:4mm; font-size:10px; }
  .doc .nota-ia { margin-top:2mm; padding:2.5mm 3.5mm; background:#eef3fb; border:1px solid #b9cdea; border-radius:2mm; font-size:10px; }
  .doc .nota-ia b { color:#1d4d8f; }
  .doc .cert-ok { color:#1a7a3c; }
  .doc .cert-alerta { color:#a12f2f; }
`;

function header(ctx: DocContext, titulo: string) {
  const e = ctx.empresa;
  return `<div class="hdr">
    <div>
      <div style="font-size:13px;font-weight:700">${esc(e?.nome ?? "")}</div>
      <div class="muted">${esc(e?.morada ?? "")} ${esc(e?.localidade ?? "")}</div>
      <div class="muted">NIPC ${esc(e?.nipc ?? "")} &middot; Registo Prévio PSP n.º ${esc(e?.registo ?? "")}</div>
      <div class="muted">${esc(e?.contacto ?? "")}</div>
    </div>
    <div style="text-align:right">
      <h1>${esc(titulo)}</h1>
      <div class="muted">N.º ${esc(ctx.numero)}</div>
      <div class="muted">${dataPT(ctx.form["data"] ?? new Date().toISOString())}</div>
    </div>
  </div>`;
}

function blocoCliente(ctx: DocContext) {
  const c = ctx.cliente;
  const i = ctx.instalacao;
  return `<h2>Identificação</h2>
  <div class="grid">
    <div class="f"><b>Cliente</b> ${esc(c?.nome ?? "")}</div>
    <div class="f"><b>NIF</b> ${esc(c?.nif ?? "")}</div>
    <div class="f"><b>Morada da instalação</b> ${esc(i?.morada ?? c?.morada ?? "")}</div>
    <div class="f"><b>Localidade</b> ${esc(i?.localidade ?? c?.localidade ?? "")}</div>
    <div class="f"><b>Entidade / Local</b> ${esc(i?.entidade ?? "")}</div>
    <div class="f"><b>Tipo de sistema</b> ${esc(i?.tipo_sistema ?? "")}</div>
    <div class="f"><b>ID do sistema</b> ${esc(i?.sistema_id ?? "")}</div>
    <div class="f"><b>Responsável</b> ${esc(i?.responsavel ?? "")} ${esc(i?.contacto_resp ?? "")}</div>
    <div class="f"><b>Monitorizado por</b> ${esc(i?.monitorizado_por ?? "")}</div>
    <div class="f"><b>N.º registo instalação</b> ${esc(i?.num_registo ?? "")}</div>
  </div>`;
}

function blocoPendencias(ctx: DocContext) {
  const lista = (ctx.pendencias ?? []).filter(Boolean);
  if (!lista.length) return "";
  return `<div class="pendencias">
    <h3>⚠ Por confirmar antes de entregar ao cliente</h3>
    <ul>${lista.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
  </div>`;
}

function tabelaEquipamento(eq: Equipamento[], certificacoes?: DocContext["certificacoes"]) {
  if (!eq.length) return "";
  const certPorNome = new Map((certificacoes ?? []).map((c) => [c.equip, c]));
  return `<h2>Equipamento instalado</h2>
  <table><thead><tr><th style="width:6mm">#</th><th>Equipamento</th><th>Marca / Modelo</th><th>N.º de série</th><th>Localização</th>${
    certificacoes?.length ? "<th>Normas técnicas</th>" : ""
  }</tr></thead>
  <tbody>${eq
    .map((r, n) => {
      const cert = certPorNome.get(r.equip);
      const certCel = certificacoes?.length
        ? `<td class="${cert?.situacao === "confirmado" ? "cert-ok" : "cert-alerta"}">${
            cert
              ? cert.situacao === "confirmado"
                ? `✔ ${esc(cert.nota)}`
                : `✘ não confirmado — ${esc(cert.nota)}`
              : "—"
          }</td>`
        : "";
      return `<tr><td>${n + 1}</td><td>${esc(r.equip)}</td><td>${esc(r.marca)}</td><td>${esc(r.serie)}</td><td>${esc(r.local)}</td>${certCel}</tr>`;
    })
    .join("")}</tbody></table>${
    certificacoes?.length
      ? '<div class="muted" style="margin-top:1mm">Normas verificadas com base no conhecimento geral da IA, sem acesso à internet em tempo real — confirmar sempre com a ficha técnica do fabricante.</div>'
      : ""
  }`;
}

function assinaturas(ctx: DocContext, esquerda: string, direita: string) {
  const a = ctx.assinatura
    ? `<img class="assin" src="${ctx.assinatura}" alt="Assinatura do cliente" />`
    : "";
  const nome = ctx.form["nomeAssinante"] ?? ctx.cliente?.nome ?? "";
  const qualidade = ctx.form["qualidadeAssinante"] ?? "";
  const idDoc = ctx.form["docAssinante"] ?? "";
  const detalhes = [qualidade, idDoc].filter(Boolean).join(" &middot; ");
  return `<div class="sign">
    <div>${esc(ctx.empresa?.tecnico ?? "")}<br/><span class="muted">${esc(esquerda)}</span></div>
    <div>${a}${esc(nome)}<br/>${detalhes ? `<span class="muted">${detalhes}</span><br/>` : ""}<span class="muted">${esc(direita)}</span></div>
  </div>`;
}

function rodape(ctx: DocContext) {
  const e = ctx.empresa;
  const emissao = e?.data_emissao ? ` emitido em ${dataPT(e.data_emissao)}` : "";
  return `<div class="legal">
    ${esc(e?.nome ?? "")} — entidade titular do Registo Prévio n.º ${esc(e?.registo ?? "—")}${emissao},
    emitido pela Polícia de Segurança Pública nos termos da Lei n.º 34/2013, de 16 de maio, e da
    Portaria n.º 273/2013, de 20 de agosto. NIPC ${esc(e?.nipc ?? "—")}.
    Documento conservado pela entidade titular pelo prazo mínimo de 5 anos.
  </div>`;
}

export function buildDocumentHtml(ctx: DocContext): string {
  let body = "";

  if (ctx.tipo === "relatorio") {
    body = `${header(ctx, "Relatório Técnico de Intervenção")}
      <div class="muted" style="margin-top:2mm">Modelo oficial — Despacho 10/GDN/2022 &middot; verificação de falso alarme</div>
      ${blocoCliente(ctx)}
      <h2>Intervenção</h2>
      <div class="grid">
        <div class="f"><b>Data / hora</b> ${dataPT(ctx.form["data"])} ${esc(ctx.form["hora"] ?? "")}</div>
        <div class="f"><b>Tipo de intervenção</b> ${esc(ctx.form["tipo"] ?? "")}</div>
        <div class="f"><b>Modo de deteção</b> ${esc(ctx.form["modo"] ?? "")}</div>
        <div class="f"><b>Técnico</b> ${esc(ctx.form["tecnico"] ?? ctx.empresa?.tecnico ?? "")}</div>
      </div>
      <h2>Causa provável do alarme</h2>
      <div>${esc(ctx.form["causa"] ?? "")}</div>
      <h2>Trabalhos efetuados e medidas corretivas</h2>
      <div>${esc(ctx.form["trabalhos"] ?? "")}</div>
      <h2>Conclusão</h2>
      <div>${esc(ctx.form["conclusao"] ?? "")}</div>
      ${assinaturas(ctx, "O técnico responsável", "O cliente / responsável")}`;
  }

  if (ctx.tipo === "livro") {
    const linhas = ctx.intervencoes.length
      ? ctx.intervencoes
          .map(
            (r) =>
              `<tr><td>${dataPT(r.data)}</td><td>${esc(r.hora)}</td><td>${esc(r.tipo)}</td><td>${esc(r.modo)}</td><td>${esc(r.causa)}</td><td>${esc(r.trabalhos)}</td><td>${esc(r.num_relatorio)}</td><td>${esc(r.tecnico)}</td></tr>`,
          )
          .join("")
      : "";
    const linhasBrancas = Array.from({ length: 15 })
      .map(
        () =>
          `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`,
      )
      .join("");
    body = `${header(ctx, "Livro de Registos do Sistema")}
      ${blocoCliente(ctx)}
      ${tabelaEquipamento(ctx.equipamentos)}
      <h2>Registo de intervenções</h2>
      <div class="muted">Linhas em branco incluídas para continuar o registo manualmente após impressão.</div>
      <table><thead><tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Modo</th><th>Causa</th><th>Trabalhos</th><th>N.º relatório</th><th>Técnico</th></tr></thead>
      <tbody>${linhas}${linhasBrancas}</tbody></table>
      ${assinaturas(ctx, "O técnico responsável", "O responsável pelo sistema")}`;
  }

  if (ctx.tipo === "declaracao") {
    body = `${header(ctx, "Declaração de Instalação")}
      ${blocoCliente(ctx)}
      <h2>Declaração</h2>
      <div>${esc(
        ctx.form["texto"] ??
          `Declara-se que foi instalado no local acima identificado o sistema de segurança descrito neste documento, em conformidade com a legislação aplicável à atividade de segurança privada e com o registo prévio junto da PSP.`,
      )}</div>
      ${tabelaEquipamento(ctx.equipamentos)}
      ${ctx.form["servicos"] ? `<h2>Serviços contratados</h2><div>${esc(ctx.form["servicos"])}</div>` : ""}
      ${assinaturas(ctx, "O instalador", "O cliente")}`;
  }

  if (ctx.tipo === "auto") {
    const chk = (ctx.checklist ?? [])
      .map((c) => `<li>${c.ok ? "&#9745;" : "&#9744;"} ${esc(c.label)}</li>`)
      .join("");
    body = `${header(ctx, "Auto de Instalação")}
      <div class="muted" style="margin-top:2mm">Documento de boa prática (não oficial) — relatório final para o cliente</div>
      ${blocoPendencias(ctx)}
      ${blocoCliente(ctx)}
      ${tabelaEquipamento(ctx.equipamentos, ctx.certificacoes)}
      <h2>Checklist de configuração e privacidade</h2>
      <ul class="chk">${chk}</ul>
      <h2>Videovigilância — proteção de dados</h2>
      <div>Prazo de retenção das imagens: ${esc(ctx.form["retencao"] || "30")} dias, findo o qual são
      automaticamente destruídas, nos termos do artigo 31.º da Lei n.º 34/2013, de 16 de maio.
      O sistema não capta a via pública e encontra-se afixado, em local visível, o aviso de
      videovigilância exigido pelo RGPD.</div>
      <h2>Testes efetuados</h2>
      <div>${esc(ctx.form["testes"] ?? "")}</div>
      <h2>Observações</h2>
      <div>${esc(ctx.form["observacoes"] ?? "")}</div>
      ${ctx.foto ? `<h2>Foto do local</h2><img class="foto" src="${ctx.foto}" alt="Foto do local da instalação" />` : ""}
      ${
        ctx.avaliacaoFoto
          ? `<div class="nota-ia"><b>Avaliação de apoio (IA):</b> ${esc(ctx.avaliacaoFoto)}</div>`
          : ""
      }
      ${assinaturas(ctx, "O instalador", "O cliente")}`;
  }

  return `<style>${CSS}</style><div class="doc">${body}${rodape(ctx)}</div>`;
}

export const CHECKLIST_AUTO = [
  "Códigos de acesso alterados",
  "Utilizadores criados e formados",
  "Comunicação com central testada",
  "Bateria de reserva verificada",
  "Sirene interior/exterior testada",
  "Zonas parametrizadas e identificadas",
  "Câmaras sem captação de via pública",
  "Informação de videovigilância afixada",
  "Prazo de retenção de imagens configurado",
  "Manual entregue ao cliente",
];
