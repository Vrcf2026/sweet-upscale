import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

function descarregarJson(nome: string, dados: unknown) {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function ApagarDialog({
  titulo,
  descricao,
  bloqueios,
  nomeBackup,
  recolherBackup,
  aoApagar,
  etiqueta = "Apagar",
}: {
  titulo: string;
  descricao: string;
  /** Motivos que impedem a eliminação (registos interligados, estado não final). */
  bloqueios: string[];
  nomeBackup: string;
  recolherBackup: () => Promise<unknown>;
  aoApagar: () => Promise<void>;
  etiqueta?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pass, setPass] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueado = bloqueios.length > 0;

  async function confirmar() {
    try {
      setOcupado(true);
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Sessão expirada");
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (authErr) throw new Error("Palavra-passe incorreta");

      const backup = await recolherBackup();
      descarregarJson(nomeBackup, {
        exportado_em: new Date().toISOString(),
        exportado_por: email,
        dados: backup,
      });

      await aoApagar();
      setAberto(false);
      setPass("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) setPass("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4" /> {etiqueta}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        {bloqueado ? (
          <div className="space-y-2 rounded-md border border-destructive/50 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" /> Não é possível apagar
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {bloqueios.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="h-4 w-4" /> Será descarregada uma cópia de segurança antes de
              apagar.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pass-apagar">Confirma com a tua palavra-passe</Label>
              <Input
                id="pass-apagar"
                type="password"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          {!bloqueado && (
            <Button variant="destructive" disabled={!pass || ocupado} onClick={confirmar}>
              {ocupado ? "A apagar…" : "Apagar definitivamente"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
