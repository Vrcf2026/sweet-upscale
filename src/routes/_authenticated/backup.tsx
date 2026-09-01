import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudUpload, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { enviarBackupDrive, listarBackups, type RegistoBackup } from "@/lib/backup.functions";
import {
  fetchClientes,
  fetchDocumentos,
  fetchEmpresa,
  fetchInstalacoes,
} from "@/lib/data";


export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({
    meta: [
      { title: "Backup — Documentos de Segurança Privada" },
      {
        name: "description",
        content: "Exporta todos os teus clientes, instalações e documentos num único ficheiro.",
      },
      { property: "og:title", content: "Backup e exportação" },
      { property: "og:description", content: "Cópia integral dos dados e documentos gerados." },
    ],
  }),
  component: BackupPage,
});

function descarregar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function BackupPage() {
  const [aExportar, setAExportar] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [historico, setHistorico] = useState<RegistoBackup[]>([]);

  async function carregarHistorico() {
    try {
      setHistorico(await listarBackups());
    } catch {
      setHistorico([]);
    }
  }

  useEffect(() => {
    void carregarHistorico();
  }, []);

  async function paraDrive() {
    try {
      setAEnviar(true);
      const r = await enviarBackupDrive({ data: undefined });
      toast.success(`Backup enviado para a Google Drive: ${r.ficheiro}`);
      await carregarHistorico();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAEnviar(false);
    }
  }


  async function recolher() {
    const [empresa, clientes, instalacoes, documentos] = await Promise.all([
      fetchEmpresa(),
      fetchClientes(),
      fetchInstalacoes(),
      fetchDocumentos(),
    ]);
    const [equipamentos, intervencoes] = await Promise.all([
      supabase.from("equipamentos").select("*"),
      supabase.from("intervencoes").select("*"),
    ]);
    return {
      exportado_em: new Date().toISOString(),
      empresa,
      clientes,
      instalacoes,
      equipamentos: equipamentos.data ?? [],
      intervencoes: intervencoes.data ?? [],
      documentos,
    };
  }

  async function exportar() {
    try {
      setAExportar(true);
      const dados = await recolher();
      const hoje = new Date().toISOString().slice(0, 10);
      descarregar(`backup-${hoje}.json`, JSON.stringify(dados, null, 2), "application/json");
      toast.success("Backup descarregado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAExportar(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backup e exportação</h1>
        <p className="text-muted-foreground">
          Cópia integral dos teus dados — útil para o dever de conservação de 5 anos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Exportar tudo</CardTitle>
          <CardDescription>
            Inclui empresa, clientes, instalações, equipamento, intervenções e documentos gerados
            (o JSON contém o HTML completo de cada documento).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => exportar()} disabled={aExportar}>
            <Download className="h-4 w-4" /> Backup completo (JSON)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <CardDescription>
            Os backups são enviados para a pasta <strong>Backups Registo Prévio</strong> da conta
            Google da empresa. Além do envio manual, corre automaticamente todos os dias às 03:00.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={paraDrive} disabled={aEnviar}>
            <CloudUpload className="h-4 w-4" /> {aEnviar ? "A enviar…" : "Enviar agora para a Drive"}
          </Button>

          {historico.length > 0 && (
            <ul className="divide-y rounded-md border text-sm">
              {historico.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.ficheiro}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString("pt-PT")} · {b.origem} ·{" "}
                      {b.estado === "ok"
                        ? `${Math.max(1, Math.round(b.tamanho_bytes / 1024))} KB`
                        : (b.erro ?? "erro")}
                    </p>
                  </div>
                  {b.drive_link && (
                    <a
                      className="shrink-0 text-primary"
                      href={b.drive_link}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Abrir na Google Drive"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );

}
