import { MapPin } from "lucide-react";

export function mapsUrl(...partes: (string | null | undefined)[]) {
  const q = partes.filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function MoradaLink({
  partes,
  className,
  children,
}: {
  partes: (string | null | undefined)[];
  className?: string;
  children?: React.ReactNode;
}) {
  const texto = partes.filter(Boolean).join(", ");
  if (!texto.trim()) return null;
  return (
    <a
      href={mapsUrl(...partes)}
      target="_blank"
      rel="noreferrer"
      className={
        className ??
        "inline-flex items-center gap-1 text-sm text-accent hover:underline"
      }
      onClick={(e) => e.stopPropagation()}
    >
      <MapPin className="h-4 w-4" />
      {children ?? "Abrir no Google Maps"}
    </a>
  );
}
