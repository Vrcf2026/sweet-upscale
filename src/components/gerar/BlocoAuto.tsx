import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { comprimirImagem } from "@/lib/ficheiros";
import { avaliarFoto, verificarCertificacoes } from "@/lib/ia.functions";

export type ItemChecklist = { label: string; ok: boolean };
export type Certificacao = { equip: string; situacao: string; nota: string };

export function BlocoChecklist({
  checklist,
  setChecklist,
}: {
  checklist: ItemChecklist[];
  setChecklist: React.Dispatch<React.SetStateAction<ItemChecklist[]>>;
}) {
  return (
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
                setChecklist((prev) => prev.map((x, n) => (n === i ? { ...x, ok: v === true } : x)))
              }
            />
            {c.label}
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

export function BlocoFoto({
  foto,
  setFoto,
  avaliacao,
  setAvaliacao,
}: {
  foto: string | null;
  setFoto: (v: string | null) => void;
  avaliacao: string | null;
  setAvaliacao: (v: string | null) => void;
}) {
  const [aComprimir, setAComprimir] = useState(false);
  const [aAvaliar, setAAvaliar] = useState(false);

  async function escolher(file: File) {
    try {
      setAComprimir(true);
      setFoto(await comprimirImagem(file));
      setAvaliacao(null);
      toast.success("Foto pronta");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAComprimir(false);
    }
  }

  async function pedirAvaliacao() {
    if (!foto) return;
    try {
      setAAvaliar(true);
      const { texto } = await avaliarFoto({ data: { fotoDataUrl: foto } });
      setAvaliacao(texto);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAAvaliar(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotografia do local / sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="file"
          accept="image/*"
          disabled={aComprimir}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void escolher(f);
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
              <Button variant="secondary" size="sm" disabled={aAvaliar} onClick={pedirAvaliacao}>
                {aAvaliar ? "A avaliar…" : "Pedir avaliação à IA"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFoto(null);
                  setAvaliacao(null);
                }}
              >
                Remover foto
              </Button>
            </div>
            {avaliacao && (
              <p className="rounded-md border border-border bg-muted p-3 text-sm">{avaliacao}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BlocoCertificacoes({
  equipamentos,
  certificacoes,
  setCertificacoes,
}: {
  equipamentos: { equip: string; marca: string | null }[];
  certificacoes: Certificacao[];
  setCertificacoes: (v: Certificacao[]) => void;
}) {
  const [aVerificar, setAVerificar] = useState(false);

  async function verificar() {
    if (!equipamentos.length) {
      toast.error("Sem equipamento para verificar");
      return;
    }
    try {
      setAVerificar(true);
      setCertificacoes(
        await verificarCertificacoes({
          data: { equipamentos: equipamentos.map((e) => ({ equip: e.equip, marca: e.marca ?? "" })) },
        }),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAVerificar(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificações do equipamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A IA verifica com base no seu conhecimento geral (sem acesso à internet em tempo real) —
          confirma sempre com a ficha técnica do fabricante.
        </p>
        <Button variant="secondary" size="sm" disabled={aVerificar} onClick={verificar}>
          {aVerificar ? "A verificar…" : "Verificar certificações (IA)"}
        </Button>
        {certificacoes.length > 0 && (
          <ul className="space-y-1 text-sm">
            {certificacoes.map((c) => (
              <li
                key={c.equip}
                className={c.situacao === "confirmado" ? "text-green-700" : "text-destructive"}
              >
                {c.situacao === "confirmado" ? "✔" : "✘"} {c.equip} — {c.nota}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function BlocoPendencias({ pendencias }: { pendencias: string[] }) {
  return (
    <Card className="border-accent">
      <CardHeader>
        <CardTitle>⚠ Por confirmar antes de entregar</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {pendencias.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
