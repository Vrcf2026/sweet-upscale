import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad } from "@/components/SignaturePad";
import { comprimirImagem } from "@/lib/ficheiros";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCliente,
  fetchEmpresa,
  fetchEquipamentos,
  fetchInstalacao,
  fetchIntervencoes,
  getUserId,
  proximoNumero,
} from "@/lib/data";
import { buildDocumentHtml, CHECKLIST_AUTO } from "@/lib/docs";
import { avaliarFoto, verificarCertificacoes } from "@/lib/ia.functions";
import { AUTORIDADES, DOC_LABEL, type DocTipo } from "@/lib/model";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/gerar/$instalacaoId/$tipo")({
  head: () => ({
    meta: [
      { title: "Gerar documento — Documentos de Segurança Privada" },
      { name: "description", content: "Preenche, assina e gera o documento oficial." },
      { property: "og:title", content: "Gerar documento" },
      { property: "og:description", content: "Preenche, assina e gera o documento oficial." },
    ],
  }),
  component: Gerar,
});

// Os campos de cada documento vivem no esquema declarativo em src/lib/campos.ts


function Gerar() {
  const { instalacaoId, tipo } = Route.useParams();
  const docTipo = tipo as DocTipo;
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({
    data: new Date().toISOString().slice(0, 10),
  });
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [aComprimirFoto, setAComprimirFoto] = useState(false);
  const [avaliacaoFoto, setAvaliacaoFoto] = useState<string | null>(null);
  const [aAvaliarFoto, setAAvaliarFoto] = useState(false);
  const [certificacoes, setCertificacoes] = useState<
    { equip: string; situacao: string; nota: string }[]
  >([]);
  const [aVerificarCert, setAVerificarCert] = useState(false);
  const [checklist, setChecklist] = useState(CHECKLIST_AUTO.map((label) => ({ label, ok: true })));
  const [aGuardar, setAGuardar] = useState(false);
  const [logoAutoridade, setLogoAutoridade] = useState<string | null>(null);

  const autoridadeSel = form["autoridade"] ?? "psp";

  useEffect(() => {
    if (docTipo !== "comunicacao") return;
    try {
      setLogoAutoridade(localStorage.getItem(`brasao:${autoridadeSel}`));
    } catch {
      setLogoAutoridade(null);
    }
  }, [docTipo, autoridadeSel]);

  async function aoEscolherBrasao(file: File) {
    try {
      const dataUrl = await comprimirImagem(file, 400, 0.9);
      setLogoAutoridade(dataUrl);
      try {
        localStorage.setItem(`brasao:${autoridadeSel}`, dataUrl);
      } catch {
        /* espaço local cheio — brasão fica só nesta sessão */
      }
      toast.success("Brasão carregado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function aoEscolherFoto(file: File) {
    try {
      setAComprimirFoto(true);
      const dataUrl = await comprimirImagem(file);
      setFoto(dataUrl);
      setAvaliacaoFoto(null);
      toast.success("Foto pronta");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAComprimirFoto(false);
    }
  }

  async function pedirAvaliacaoFoto() {
    if (!foto) return;
    try {
      setAAvaliarFoto(true);
      const { texto } = await avaliarFoto({ data: { fotoDataUrl: foto } });
      setAvaliacaoFoto(texto);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAAvaliarFoto(false);
    }
  }

  async function pedirVerificacaoCertificacoes() {
    const lista = equipamentos.data ?? [];
    if (!lista.length) {
      toast.error("Sem equipamento para verificar");
      return;
    }
    try {
      setAVerificarCert(true);
      const res = await verificarCertificacoes({
        data: { equipamentos: lista.map((e) => ({ equip: e.equip, marca: e.marca ?? "" })) },
      });
      setCertificacoes(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAVerificarCert(false);
    }
  }

  const empresa = useQuery({ queryKey: ["empresa"], queryFn: fetchEmpresa });
  const instalacao = useQuery({
    queryKey: ["instalacao", instalacaoId],
    queryFn: () => fetchInstalacao(instalacaoId),
  });
  const cliente = useQuery({
    queryKey: ["cliente", instalacao.data?.cliente_id],
    queryFn: () => fetchCliente(instalacao.data!.cliente_id),
    enabled: !!instalacao.data?.cliente_id,
  });
  const equipamentos = useQuery({
    queryKey: ["equipamentos", instalacaoId],
    queryFn: () => fetchEquipamentos(instalacaoId),
  });
  const intervencoes = useQuery({
    queryKey: ["intervencoes", instalacaoId],
    queryFn: () => fetchIntervencoes(instalacaoId),
  });

  const prefeito = useRef(false);
  useEffect(() => {
    if (docTipo !== "comunicacao") return;
    if (prefeito.current) return;
    const i = instalacao.data;
    const c = cliente.data;
    if (!i || !c) return;
    prefeito.current = true;
    const eq = (equipamentos.data ?? [])[0];
    setForm((f) => ({
      ...f,
      subunidade: f["subunidade"] || i.autoridade_subunidade || "",
      decNome: f["decNome"] || c.nome || "",
      decMorada: f["decMorada"] || c.morada || "",
      decLocalidade: f["decLocalidade"] || c.localidade || "",
      decCp: f["decCp"] || c.cp || "",
      decNumDoc: f["decNumDoc"] || c.nif || "",
      decTipoDoc: f["decTipoDoc"] || (c.nif ? "NIF" : ""),
      decTlf: f["decTlf"] || c.tel || "",
      decTlm: f["decTlm"] || c.tlm || "",
      decEmail: f["decEmail"] || c.email || "",
      localMorada: f["localMorada"] || i.morada || c.morada || "",
      localLocalidade: f["localLocalidade"] || i.localidade || c.localidade || "",
      localCp: f["localCp"] || c.cp || "",
      marca: f["marca"] || eq?.marca || "",
      instaladoPor: f["instaladoPor"] || i.instalado_por || empresa.data?.nome || "",
      contacto1Nome: f["contacto1Nome"] || i.responsavel || "",
      contacto1Tlm: f["contacto1Tlm"] || i.contacto_resp || "",
      autoridade: f["autoridade"] || i.autoridade || "psp",
      sirene: f["sirene"] ?? "sim",
      juntaDeclaracao: f["juntaDeclaracao"] ?? "sim",
    }));
  }, [docTipo, instalacao.data, cliente.data, equipamentos.data, empresa.data]);

  const pendencias = useMemo(() => {
    const lista: string[] = [];
    checklist.forEach((c) => {
      if (!c.ok) lista.push(`Item da checklist por confirmar: ${c.label}`);
    });
    certificacoes.forEach((c) => {
      if (c.situacao !== "confirmado") {
        lista.push(`Certificação não confirmada — ${c.equip}: ${c.nota}`);
      }
    });
    if (foto && !avaliacaoFoto) {
      lista.push("Foto carregada mas ainda sem avaliação da IA — considera pedir antes de gerar");
    }
    if (avaliacaoFoto) {
      lista.push("Rever a avaliação da IA sobre a foto do local antes de entregar");
    }
    return lista;
  }, [checklist, certificacoes, foto, avaliacaoFoto]);

  const html = useMemo(
    () =>
      buildDocumentHtml({
        tipo: docTipo,
        numero: "(atribuído ao guardar)",
        empresa: empresa.data ?? null,
        cliente: cliente.data ?? null,
        instalacao: instalacao.data ?? null,
        equipamentos: equipamentos.data ?? [],
        intervencoes: intervencoes.data ?? [],
        form,
        checklist,
        assinatura,
        foto,
        avaliacaoFoto,
        certificacoes,
        pendencias,
        logoAutoridade,
      }),
    [
      docTipo,
      empresa.data,
      cliente.data,
      instalacao.data,
      equipamentos.data,
      intervencoes.data,
      form,
      checklist,
      assinatura,
      foto,
      avaliacaoFoto,
      certificacoes,
      pendencias,
      logoAutoridade,
    ],
  );

  async function guardar(comoRascunho = false) {
    try {
      setAGuardar(true);
      const user_id = await getUserId();
      const numero = await proximoNumero();
      const finalHtml = buildDocumentHtml({
        tipo: docTipo,
        numero,
        empresa: empresa.data ?? null,
        cliente: cliente.data ?? null,
        instalacao: instalacao.data ?? null,
        equipamentos: equipamentos.data ?? [],
        intervencoes: intervencoes.data ?? [],
        form,
        checklist,
        assinatura,
        foto,
        avaliacaoFoto,
        certificacoes,
        pendencias,
        logoAutoridade,
      });
      const { data, error } = await supabase
        .from("documentos")
        .insert({
          user_id,
          instalacao_id: instalacaoId,
          cliente_id: instalacao.data?.cliente_id ?? null,
          tipo: docTipo,
          numero,
          resumo: form["tipo"] ?? form["testes"] ?? null,
          estado: comoRascunho ? "rascunho" : assinatura ? "assinado" : "rascunho",
          html: finalHtml,
          dados: form,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await registar(
        "documento",
        "criou",
        data.id,
        `${DOC_LABEL[docTipo]} ${numero} ${comoRascunho ? "guardado como rascunho" : "gerado"}`,
      );
      if (!comoRascunho && assinatura) {
        try {
          await arquivarDocumento({ id: data.id, numero, html: finalHtml });
        } catch {
          /* o arquivo é complementar; o documento já ficou guardado */
        }
      }
      toast.success(
        comoRascunho ? `Rascunho ${numero} guardado` : `Documento ${numero} criado`,
      );
      navigate({ to: "/documentos/$documentoId", params: { documentoId: data.id } });

    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{DOC_LABEL[docTipo]}</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate({ to: "/instalacoes/$instalacaoId", params: { instalacaoId } })
            }
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button variant="secondary" size="sm" disabled={aGuardar} onClick={() => guardar(true)}>
            <Save className="h-4 w-4" /> Guardar rascunho
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {agrupar(CAMPOS_DOC[docTipo] ?? []).map(({ grupo, campos }) => (
            <Card key={grupo}>
              <CardHeader>
                <CardTitle>{grupo}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">

                {campos.map((c) => (
                  <div
                    key={c.nome}
                    className={`space-y-2 ${c.tipo === "area" ? "sm:col-span-2" : ""}`}
                  >
                    <Label htmlFor={c.nome}>{c.label}</Label>
                    {c.tipo === "area" ? (
                      <Textarea
                        id={c.nome}
                        rows={3}
                        value={form[c.nome] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [c.nome]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        id={c.nome}
                        type={c.tipo === "date" ? "date" : c.tipo === "time" ? "time" : "text"}
                        value={form[c.nome] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [c.nome]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}


          {docTipo === "comunicacao" && (
            <Card>
              <CardHeader>
                <CardTitle>Autoridade e características</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="autoridade">Autoridade da zona</Label>
                  <Select
                    value={form["autoridade"] ?? "psp"}
                    onValueChange={(v) => setForm((f) => ({ ...f, autoridade: v }))}
                  >
                    <SelectTrigger id="autoridade">
                      <SelectValue placeholder="Escolhe a autoridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTORIDADES.map((a) => (
                        <SelectItem key={a.valor} value={a.valor}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brasao">Brasão oficial da autoridade (opcional)</Label>
                  <div className="flex items-center gap-3">
                    {logoAutoridade && (
                      <img
                        src={logoAutoridade}
                        alt="Brasão da autoridade"
                        className="h-12 w-12 rounded border border-border object-contain"
                      />
                    )}
                    <Input
                      id="brasao"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void aoEscolherBrasao(file);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Carrega a imagem do brasão oficial (PSP ou GNR) para aparecer no cabeçalho. Fica
                    guardada neste dispositivo e é reutilizada nos próximos formulários.
                  </p>
                </div>
                {([
                  ["sirene", "Alarme com sirene audível do exterior"],
                  ["panico", "Botão de pânico"],
                  ["juntaDeclaracao", "Junta cópia da declaração de instalação"],
                ] as [string, string][]).map(([campo, label]) => (
                  <label key={campo} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form[campo] === "sim"}
                      onCheckedChange={(v) =>
                        setForm((f) => ({ ...f, [campo]: v === true ? "sim" : "" }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          {docTipo === "auto" && (
            <Card>
              <CardHeader>
                <CardTitle>Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {checklist.map((c, i) => (
                  <label key={c.label} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={c.ok}
                      onCheckedChange={(v) =>
                        setChecklist((prev) =>
                          prev.map((x, n) => (n === i ? { ...x, ok: v === true } : x)),
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </CardContent>
            </Card>
          )}

          {docTipo === "auto" && (
            <Card>
              <CardHeader>
                <CardTitle>Fotografia do local / sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={aComprimirFoto}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void aoEscolherFoto(f);
                    e.target.value = "";
                  }}
                />
                {foto && (
                  <div className="space-y-2">
                    <img
                      src={foto}
                      alt="Pré-visualização da foto do local"
                      className="max-h-48 rounded-md border border-border"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={aAvaliarFoto}
                        onClick={pedirAvaliacaoFoto}
                      >
                        {aAvaliarFoto ? "A avaliar…" : "Pedir avaliação à IA"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFoto(null);
                          setAvaliacaoFoto(null);
                        }}
                      >
                        Remover foto
                      </Button>
                    </div>
                    {avaliacaoFoto && (
                      <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        {avaliacaoFoto}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {docTipo === "auto" && (equipamentos.data?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Certificações do equipamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  A IA verifica com base no seu conhecimento geral (sem acesso à internet em tempo
                  real) — confirma sempre com a ficha técnica do fabricante.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={aVerificarCert}
                  onClick={pedirVerificacaoCertificacoes}
                >
                  {aVerificarCert ? "A verificar…" : "Verificar certificações (IA)"}
                </Button>
                {certificacoes.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {certificacoes.map((c) => (
                      <li
                        key={c.equip}
                        className={c.situacao === "confirmado" ? "text-green-700" : "text-red-700"}
                      >
                        {c.situacao === "confirmado" ? "✔" : "✘"} {c.equip} — {c.nota}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {docTipo === "auto" && pendencias.length > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">⚠ Por confirmar antes de entregar</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                  {pendencias.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Identificação de quem assina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CAMPOS_ASSINANTE.map(({ nome, label }) => (
                <div key={nome} className="space-y-2">
                  <Label htmlFor={nome}>{label}</Label>
                  <Input
                    id={nome}
                    value={form[nome] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [nome]: e.target.value }))}
                  />
                </div>
              ))}
              <SignaturePad value={assinatura} onChange={setAssinatura} />
            </CardContent>
          </Card>
        </div>

        <div className="hidden overflow-x-auto rounded-md bg-white p-4 lg:block">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <details className="rounded-md border border-border bg-card p-3 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium">
            Pré-visualizar documento
          </summary>
          <div className="mt-3 overflow-x-auto rounded-md bg-white p-2">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </details>
      </div>

      {/* barra de ações fixa — pensada para uso no terreno, no telemóvel */}
      <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={aGuardar}
          onClick={() => guardar(true)}
        >
          <Save className="h-4 w-4" /> Rascunho
        </Button>
        <Button className="flex-1" onClick={() => guardar(false)} disabled={aGuardar}>
          Gerar e guardar
        </Button>
      </div>
    </div>

  );
}
