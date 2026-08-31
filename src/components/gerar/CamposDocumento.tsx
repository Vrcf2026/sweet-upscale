import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/SignaturePad";
import { CAMPOS_ASSINANTE, agrupar, type Campo } from "@/lib/campos";

type Props = {
  campos: Campo[];
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

/** Campos declarativos do documento, agrupados por secção. */
export function CamposDocumento({ campos, form, setForm }: Props) {
  return (
    <>
      {agrupar(campos).map(({ grupo, campos: lista }) => (
        <Card key={grupo}>
          <CardHeader>
            <CardTitle>{grupo}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {lista.map((c) => (
              <div
                key={c.nome}
                className={`space-y-2 ${c.tipo === "area" ? "sm:col-span-2" : ""}`}
              >
                <Label htmlFor={c.nome}>{c.label}</Label>
                {c.tipo === "area" ? (
                  <Textarea
                    id={c.nome}
                    rows={3}
                    value={form[c.nome] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [c.nome]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={c.nome}
                    type={c.tipo === "date" ? "date" : c.tipo === "time" ? "time" : "text"}
                    value={form[c.nome] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [c.nome]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/** Identificação de quem assina + assinatura manuscrita. */
export function BlocoAssinatura({
  form,
  setForm,
  assinatura,
  setAssinatura,
}: {
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  assinatura: string | null;
  setAssinatura: (v: string | null) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identificação de quem assina</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {CAMPOS_ASSINANTE.map(({ nome, label }) => (
          <div key={nome} className="space-y-2">
            <Label htmlFor={nome}>{label}</Label>
            <Input
              id={nome}
              value={form[nome] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [nome]: e.target.value }))}
            />
          </div>
        ))}
        <SignaturePad value={assinatura} onChange={setAssinatura} />
      </CardContent>
    </Card>
  );
}
