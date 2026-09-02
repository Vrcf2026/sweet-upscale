import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/manutencoes-diario")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const segredo = process.env["BACKUP_CRON_SECRET"];
        const auth = request.headers.get("authorization") ?? "";
        if (!segredo || auth !== `Bearer ${segredo}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { enviarLembretesManutencao } = await import("@/lib/manutencao.server");
          const r = await enviarLembretesManutencao();
          return Response.json(r);
        } catch (e) {
          return Response.json({ ok: false, erro: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
