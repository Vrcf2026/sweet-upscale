import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova palavra-passe — Documentos de Segurança Privada" },
      {
        name: "description",
        content: "Define uma nova palavra-passe para a tua conta de acesso à documentação.",
      },
      { property: "og:title", content: "Nova palavra-passe — Documentos de Segurança Privada" },
      {
        property: "og:description",
        content: "Define uma nova palavra-passe para a tua conta.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aguarda, setAguarda] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmar) {
      toast.error("As palavras-passe não coincidem");
      return;
    }
    setAguarda(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Palavra-passe atualizada");
      navigate({ to: "/painel", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar");
    } finally {
      setAguarda(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <KeyRound className="h-7 w-7 text-accent" />
          <CardTitle>Definir nova palavra-passe</CardTitle>
          <CardDescription>Escolhe uma palavra-passe com pelo menos 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submeter} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova palavra-passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar</Label>
              <Input
                id="confirmar"
                type="password"
                required
                minLength={8}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={aguarda}>
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
