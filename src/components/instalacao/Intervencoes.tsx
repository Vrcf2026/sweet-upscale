import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/lib/data";
import { dataPT } from "@/lib/docs";

export type IntervRow = {
  id: string;
  data: string;
  hora: string | null;
  tipo: string | null;
  modo?: string | null;
  causa: string | null;
  trabalhos: string | null;
  tecnico: string | null;
  num_relatorio: string | null;
};

const hoje = () => new Date().toISOString().slice(0, 10);

export function Intervencoes({
  instalacaoId,
  lista,
  periodicidadeMeses,
}: {
  instalacaoId: string;
  lista: IntervRow[];
  periodicidadeMeses?: number | null | undefined;
}) {
  const queryClient = useQueryClient();
  const [nova, setNova] = useState({
    data: hoje(),
    hora: "",
    tipo: "",
    modo: "",
    causa: "",
    trabalhos: "",
    tecnico: "",
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["intervencoes", instalacaoId] });
    queryClient.invalidateQueries({ queryKey: ["instalacao", instalacaoId] });
    queryClient.invalidateQueries({ queryKey: ["instalacoes"] });
  };

  const criar = useMutation({
    mutationFn: async () => {
      const user_id = await getUserId();
      const { error } = await supabase
        .from("intervencoes")
        .insert({ ...nova, instalacao_id: instalacaoId, user_id });
      if (error) throw new Error(error.message);

      /** Manutenção efetuada: recalcula a próxima data automaticamente. */
      if (/manut/i.test(nova.tipo)) {
        const proxima = new Date(`${nova.data}T00:00:00`);
        proxima.setMonth(proxima.getMonth() + (periodicidadeMeses || 12));
        const { error: erroProx } = await supabase
          .from("instalacoes")
          .update({
            proxima_manutencao: proxima.toISOString().slice(0, 10),
            lembrete_enviado_em: null,
          })
          .eq("id", instalacaoId);
        if (erroProx) throw new Error(erroProx.message);
      }
    },
    onSuccess: () => {
      const foiManutencao = /manut/i.test(nova.tipo);
      toast.success(
        foiManutencao
          ? "Intervenção registada — próxima manutenção recalculada automaticamente"
          : "Intervenção registada",
      );
      setNova({ ...nova, causa: "", trabalhos: "", hora: "" });
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("intervencoes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidar,
  });

  /** Copia uma intervenção anterior para o formulário, já com a data de hoje. */
  function duplicar(r: IntervRow) {
    setNova({
      data: hoje(),
      hora: r.hora ?? "",
      tipo: r.tipo ?? "",
      modo: r.modo ?? "",
      causa: r.causa ?? "",
      trabalhos: r.trabalhos ?? "",
      tecnico: r.tecnico ?? "",
    });
    toast.success("Intervenção copiada — revê e regista");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Registar intervenção</CardTitle>
          <CardDescription>Alimenta o Livro de Registos do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input
            type="date"
            value={nova.data}
            onChange={(e) => setNova({ ...nova, data: e.target.value })}
          />
          <Input
            type="time"
            value={nova.hora}
            onChange={(e) => setNova({ ...nova, hora: e.target.value })}
          />
          <Input
            placeholder="Tipo (manutenção, avaria, falso alarme…)"
            value={nova.tipo}
            onChange={(e) => setNova({ ...nova, tipo: e.target.value })}
          />
          <p className="text-xs text-muted-foreground sm:col-span-2 sm:-mt-2">
            Se o tipo contiver "manutenção", a próxima data de manutenção é recalculada
            automaticamente a partir desta data.
          </p>
          <Input
            placeholder="Modo de deteção"
            value={nova.modo}
            onChange={(e) => setNova({ ...nova, modo: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Causa"
            value={nova.causa}
            onChange={(e) => setNova({ ...nova, causa: e.target.value })}
          />
          <Textarea
            className="sm:col-span-2"
            placeholder="Trabalhos efetuados"
            value={nova.trabalhos}
            onChange={(e) => setNova({ ...nova, trabalhos: e.target.value })}
          />
          <Input
            placeholder="Técnico"
            value={nova.tecnico}
            onChange={(e) => setNova({ ...nova, tecnico: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
              <Plus className="h-4 w-4" /> Registar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {lista.map((r) => (
          <div key={r.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">
                {dataPT(r.data)} {r.hora} · {r.tipo}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => duplicar(r)} title="Duplicar">
                  <Copy className="h-4 w-4" /> Duplicar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => apagar.mutate(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {r.causa && <p className="text-sm text-muted-foreground">Causa: {r.causa}</p>}
            {r.trabalhos && (
              <p className="text-sm text-muted-foreground">Trabalhos: {r.trabalhos}</p>
            )}
          </div>
        ))}
        {!lista.length && (
          <p className="text-sm text-muted-foreground">Sem intervenções registadas.</p>
        )}
      </div>
    </div>
  );
}
