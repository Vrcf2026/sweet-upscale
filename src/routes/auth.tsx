import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { arrancarSuperadmin } from "@/lib/admin.functions";


export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { modo?: "registo" | "entrar" } =>
    search["modo"] === "registo" ? { modo: "registo" } : {},
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
  const { modo } = Route.useSearch();
  const navigate = useNavigate();
  const [registo, setRegisto] = useState(modo === "registo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [aguarda, setAguarda] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setAguarda(true);
    try {
      if (registo) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada. Confirma o email para entrares.");
          return;
        }
        navigate({ to: "/painel", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/painel", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível autenticar");
    } finally {
      setAguarda(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/painel", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <ShieldCheck className="h-7 w-7 text-accent" />
          <CardTitle>{registo ? "Criar conta" : "Entrar"}</CardTitle>
          <CardDescription>
            Documentos de segurança privada — acesso à tua base de clientes e instalações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submeter} className="space-y-4">
            {registo && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
            )}
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
            <Button type="submit" className="w-full" disabled={aguarda}>
              {registo ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <Button type="button" variant="outline" className="w-full" onClick={google}>
            Continuar com Google
          </Button>

          <button
            type="button"
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setRegisto((v) => !v)}
          >
            {registo ? "Já tenho conta" : "Ainda não tenho conta"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
