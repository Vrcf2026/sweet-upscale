import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props<T> = {
  itens: T[] | undefined;
  texto: (item: T) => string;
  render: (item: T) => ReactNode;
  chave: (item: T) => string;
  placeholder?: string;
  porPagina?: number;
  vazio?: string;
  extras?: ReactNode;
};

/** Lista com pesquisa e paginação — usada nas listagens grandes. */
export function ListaFiltrada<T>({
  itens,
  texto,
  render,
  chave,
  placeholder = "Pesquisar…",
  porPagina = 20,
  vazio = "Sem registos.",
  extras,
}: Props<T>) {
  const [termo, setTermo] = useState("");
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    const t = termo.trim().toLowerCase();
    const base = itens ?? [];
    if (!t) return base;
    return base.filter((i) => texto(i).toLowerCase().includes(t));
  }, [itens, termo, texto]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const atual = Math.min(pagina, paginas);
  const visiveis = filtrados.slice((atual - 1) * porPagina, atual * porPagina);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={placeholder}
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        {extras}
      </div>

      <div className="space-y-2">
        {visiveis.map((item) => (
          <div key={chave(item)}>{render(item)}</div>
        ))}
        {!filtrados.length && <p className="text-sm text-muted-foreground">{vazio}</p>}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            {filtrados.length} registos · página {atual} de {paginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={atual <= 1}
              onClick={() => setPagina(atual - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={atual >= paginas}
              onClick={() => setPagina(atual + 1)}
            >
              Seguinte
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
