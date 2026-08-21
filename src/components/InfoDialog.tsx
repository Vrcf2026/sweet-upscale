import { ClipboardList, FileText, Info, ShieldCheck, Signature } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: FileText,
    titulo: "Quatro documentos oficiais",
    texto:
      "Relatório Técnico de Intervenção, Livro de Registos, Declaração e Auto de Instalação, sempre pré-preenchidos.",
  },
  {
    icon: ClipboardList,
    titulo: "Clientes e instalações",
    texto:
      "Cada cliente pode ter várias instalações, cada uma com o seu inventário, histórico e livro de registos.",
  },
  {
    icon: Signature,
    titulo: "Assinatura em obra",
    texto:
      "Assinatura no ecrã do telemóvel, foto do local e exportação para PDF descarregável.",
  },
  {
    icon: ShieldCheck,
    titulo: "Conformidade legal",
    texto:
      "Rodapé com registo prévio PSP, Lei 34/2013, conservação 5 anos e retenção de imagens de 30 dias no Auto.",
  },
];

export function InfoDialog({ trigger }: { trigger?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2">
            <Info className="h-4 w-4" /> Info
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <DialogTitle>Sobre a aplicação</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Documentos de Segurança Privada — para instaladores com registo prévio PSP. Gera, assina e
          arquiva os documentos de cada instalação, com preenchimento assistido por IA a partir de
          faturas, Excel ou orçamentos em PDF.
        </p>
        <div className="mt-4 grid gap-4">
          {FEATURES.map((f) => (
            <article key={f.titulo} className="rounded-lg border border-border bg-card p-4">
              <f.icon className="h-5 w-5 text-accent" />
              <h2 className="mt-2 text-sm font-semibold">{f.titulo}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{f.texto}</p>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
