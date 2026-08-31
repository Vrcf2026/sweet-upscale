import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { comprimirImagem } from "@/lib/ficheiros";
import { fetchBrasao, guardarBrasao } from "@/lib/brasoes";
import { AUTORIDADES } from "@/lib/model";
import { useRole } from "@/hooks/useRole";

const OPCOES: [string, string][] = [
  ["sirene", "Alarme com sirene audível do exterior"],
  ["panico", "Botão de pânico"],
  ["juntaDeclaracao", "Junta cópia da declaração de instalação"],
];

/** Autoridade da zona, brasão oficial partilhado e características do alarme. */
export function BlocoComunicacao({
  form,
  setForm,
  onLogo,
}: {
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onLogo: (logo: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const { isSuperadmin } = useRole();
  const autoridade = form["autoridade"] ?? "psp";

  const brasao = useQuery({
    queryKey: ["brasao", autoridade],
    queryFn: () => fetchBrasao(autoridade),
  });

  useEffect(() => {
    onLogo(brasao.data ?? null);
  }, [brasao.data, onLogo]);

  const carregar = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await comprimirImagem(file, 400, 0.9);
      await guardarBrasao(autoridade, dataUrl);
      return dataUrl;
    },
    onSuccess: () => {
      toast.success("Brasão guardado para toda a equipa");
      queryClient.invalidateQueries({ queryKey: ["brasao", autoridade] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autoridade e características</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="autoridade">Autoridade da zona</Label>
          <Select
            value={autoridade}
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
          <Label htmlFor="brasao">Brasão oficial da autoridade</Label>
          <div className="flex items-center gap-3">
            {brasao.data && (
              <img
                src={brasao.data}
                alt={`Brasão oficial da autoridade ${autoridade.toUpperCase()}`}
                className="h-12 w-12 rounded border border-border object-contain"
              />
            )}
            {isSuperadmin ? (
              <Input
                id="brasao"
                type="file"
                accept="image/*"
                disabled={carregar.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) carregar.mutate(file);
                  e.target.value = "";
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {brasao.data
                  ? "Brasão definido pelo administrador."
                  : "Sem brasão definido — pede ao administrador para o carregar."}
              </p>
            )}
          </div>
          {isSuperadmin && (
            <p className="text-xs text-muted-foreground">
              A imagem fica guardada no sistema e é usada por todos os técnicos, em qualquer
              dispositivo.
            </p>
          )}
        </div>

        {OPCOES.map(([campo, label]) => (
          <label key={campo} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form[campo] === "sim"}
              onCheckedChange={(v) => setForm((f) => ({ ...f, [campo]: v === true ? "sim" : "" }))}
            />
            {label}
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
