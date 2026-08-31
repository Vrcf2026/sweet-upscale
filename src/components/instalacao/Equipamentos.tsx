import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/data";
import { extrairTextoPdf, lerExcel } from "@/lib/ficheiros";
import { estruturarEquipamento } from "@/lib/ia.functions";

export type EquipRow = {
  id: string;
  equip: string;
  marca: string | null;
  serie: string | null;
  local: string | null;
};

export function Equipamentos({
  instalacaoId,
  lista,
}: {
  instalacaoId: string;
  lista: EquipRow[];
}) {
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState({ equip: "", marca: "", serie: "", local: "" });
  const [texto, setTexto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["equipamentos", instalacaoId] });

  const adicionar = useMutation({
    mutationFn: async (linhas: (typeof novo)[]) => {
      const user_id = await getUserId();
      const rows = linhas
        .filter((l) => l.equip.trim())
        .map((l, n) => ({ ...l, instalacao_id: instalacaoId, user_id, ordem: lista.length + n }));
      if (!rows.length) throw new Error("Nada para adicionar");
      const { error } = await supabase.from("equipamentos").insert(rows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNovo({ equip: "", marca: "", serie: "", local: "" });
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidar,
  });

  const importarIA = useMutation({
    mutationFn: async (conteudo: string) => {
      const linhas = await estruturarEquipamento({ data: { texto: conteudo } });
      if (!linhas.length) throw new Error("A IA não encontrou equipamento no texto");
      await adicionar.mutateAsync(linhas);
      return linhas.length;
    },
    onSuccess: (n) => {
      setTexto("");
      toast.success(`${n} equipamentos importados`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function aoCarregarFicheiro(file: File) {
    try {
      const lido = file.name.toLowerCase().endsWith(".pdf")
        ? await extrairTextoPdf(file)
        : await lerExcel(file);
      const conteudo = typeof lido === "string" ? lido : JSON.stringify(lido);
      if (!conteudo.trim()) throw new Error("Não foi possível ler o ficheiro");
      setTexto(conteudo.slice(0, 12000));
      toast.success("Ficheiro lido — confirma e importa com IA");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Importar com IA
          </CardTitle>
          <CardDescription>
            Cola o texto de uma fatura/orçamento ou carrega um PDF/Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cola aqui a lista de equipamento…"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => importarIA.mutate(texto)}
              disabled={importarIA.isPending || !texto.trim()}
            >
              {importarIA.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Estruturar e adicionar
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Carregar PDF/Excel
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void aoCarregarFicheiro(f);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipamento instalado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-5">
            <Input
              placeholder="Equipamento"
              value={novo.equip}
              onChange={(e) => setNovo({ ...novo, equip: e.target.value })}
            />
            <Input
              placeholder="Marca/Modelo"
              value={novo.marca}
              onChange={(e) => setNovo({ ...novo, marca: e.target.value })}
            />
            <Input
              placeholder="N.º série"
              value={novo.serie}
              onChange={(e) => setNovo({ ...novo, serie: e.target.value })}
            />
            <Input
              placeholder="Localização"
              value={novo.local}
              onChange={(e) => setNovo({ ...novo, local: e.target.value })}
            />
            <Button onClick={() => adicionar.mutate([novo])}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            {lista.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div className="text-sm">
                  <span className="font-medium">{r.equip}</span>{" "}
                  <span className="text-muted-foreground">
                    {[r.marca, r.serie, r.local].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => apagar.mutate(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!lista.length && (
              <p className="text-sm text-muted-foreground">Sem equipamento registado.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
