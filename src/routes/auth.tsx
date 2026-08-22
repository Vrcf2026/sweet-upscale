import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { arrancarSuperadmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Documentos de Segurança Privada" },
      {
        name: "description",
        content: "Acede à tua conta para gerir clientes, instalações e documentos.",
      },
      { property: "og:title", content: "Entrar — Documentos de Segurança Privada" },
      { property: "og:description", content: "Acesso à gestão de documentos de segurança privada." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aguarda, setAguarda] = useState(false);
  const [recuperar, setRecuperar] = useState(false);

  useEffect(() => {
    void arrancarSuperadmin().catch(() => undefined);
  }, []);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setAguarda(true);
    try {
      if (recuperar) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Se a conta existir, enviámos um email para redefinir a palavra-passe.");
        setRecuperar(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/painel", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível autenticar");
    } finally {
      setAguarda(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <ShieldCheck className="h-7 w-7 text-accent" />
          <CardTitle>{recuperar ? "Recuperar palavra-passe" : "Entrar"}</CardTitle>
          <CardDescription>
            {recuperar
              ? "Indica o teu email e recebes uma ligação para definir nova palavra-passe."
              : "As contas são criadas pelo administrador. Usa as credenciais que te foram atribuídas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submeter} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {!recuperar && (
              <div className="space-y-2">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={aguarda}>
              {recuperar ? "Enviar email de recuperação" : "Entrar"}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setRecuperar((v) => !v)}
          >
            {recuperar ? "Voltar ao início de sessão" : "Esqueci-me da palavra-passe"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
