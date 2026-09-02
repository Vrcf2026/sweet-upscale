import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { buildDocumentHtml, CHECKLIST_AUTO, CHECKLIST_VERIFICACAO } from "@/lib/docs";
import { DOC_LABEL, type DocTipo } from "@/lib/model";
import { CAMPOS_DOC } from "@/lib/campos";
import { arquivarDocumento } from "@/lib/arquivo";
import { registar } from "@/lib/auditoria";
import { BlocoAssinatura, CamposDocumento } from "@/components/gerar/CamposDocumento";
import { BlocoComunicacao } from "@/components/gerar/BlocoComunicacao";
import {
  BlocoCertificacoes,
  BlocoChecklist,
  BlocoFoto,
  BlocoPendencias,
  type Certificacao,
} from "@/components/gerar/BlocoAuto";

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

function Gerar() {
  const { instalacaoId, tipo } = Route.useParams();
  const docTipo = tipo as DocTipo;
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({
    data: new Date().toISOString().slice(0, 10),
  });
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [avaliacaoFoto, setAvaliacaoFoto] = useState<string | null>(null);
  const [certificacoes, setCertificacoes] = useState<Certificacao[]>([]);
  const [checklist, setChecklist] = useState(
    (tipo === "verificacao" ? CHECKLIST_VERIFICACAO : CHECKLIST_AUTO).map((label) => ({
      label,
      ok: true,
    })),
  );
  const [aGuardar, setAGuardar] = useState(false);
  const [logoAutoridade, setLogoAutoridade] = useState<string | null>(null);

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

  const dadosDoc = {
    empresa: empresa.data ?? null,
    cliente: cliente.data ?? null,
    instalacao: instalacao.data ?? null,
    equipamentos: equipamentos.data ?? [],
    intervencoes: intervencoes.data ?? [],
  };

  const html = useMemo(
    () =>
      buildDocumentHtml({
        tipo: docTipo,
        numero: "(atribuído ao guardar)",
        ...dadosDoc,
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

  const definirLogo = useCallback((v: string | null) => setLogoAutoridade(v), []);

  async function guardar(comoRascunho = false) {
    try {
      setAGuardar(true);
      const user_id = await getUserId();
      const numero = await proximoNumero();
      const finalHtml = buildDocumentHtml({
        tipo: docTipo,
        numero,
        ...dadosDoc,
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
      toast.success(comoRascunho ? `Rascunho ${numero} guardado` : `Documento ${numero} criado`);
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
            onClick={() => navigate({ to: "/instalacoes/$instalacaoId", params: { instalacaoId } })}
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
          <CamposDocumento campos={CAMPOS_DOC[docTipo] ?? []} form={form} setForm={setForm} />

          {docTipo === "comunicacao" && (
            <BlocoComunicacao form={form} setForm={setForm} onLogo={definirLogo} />
          )}

          {docTipo === "verificacao" && (
            <>
              <BlocoChecklist checklist={checklist} setChecklist={setChecklist} />
              {pendencias.length > 0 && <BlocoPendencias pendencias={pendencias} />}
            </>
          )}

          {docTipo === "auto" && (
            <>
              <BlocoChecklist checklist={checklist} setChecklist={setChecklist} />
              <BlocoFoto
                foto={foto}
                setFoto={setFoto}
                avaliacao={avaliacaoFoto}
                setAvaliacao={setAvaliacaoFoto}
              />
              {(equipamentos.data?.length ?? 0) > 0 && (
                <BlocoCertificacoes
                  equipamentos={equipamentos.data ?? []}
                  certificacoes={certificacoes}
                  setCertificacoes={setCertificacoes}
                />
              )}
              {pendencias.length > 0 && <BlocoPendencias pendencias={pendencias} />}
            </>
          )}

          <BlocoAssinatura
            form={form}
            setForm={setForm}
            assinatura={assinatura}
            setAssinatura={setAssinatura}
          />
        </div>

        <div className="hidden overflow-x-auto rounded-md bg-white p-4 lg:block">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <details className="rounded-md border border-border bg-card p-3 lg:hidden">
          <summary className="cursor-pointer text-sm font-medium">Pré-visualizar documento</summary>
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
