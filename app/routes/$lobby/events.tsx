// https://twitter.com/ryanflorence/status/1533437211714080768
import { db } from '~/utils/db.server';
import { emitter } from '~/utils/lobby-events.server';

import type { LoaderArgs } from "@remix-run/node";

export async function loader({ params, request }: LoaderArgs) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      async function send() {
        const lobby = await db.lobby.findUnique({
          where: { name: params.lobby },
          include: { players: true },
        });
        controller.enqueue(
          encoder.encode(
            `event: message\ndata: ${JSON.stringify(
              lobby?.players?.map((p) => p.name) ?? []
            )}\n\n`
          )
        );
      }
      let closed = false;
      function close() {
        if (closed) return;
        closed = true;
        emitter.removeListener(params.lobby as string, send);
        request.signal.removeEventListener("abort", close);
        controller.close();
      }
      request.signal.addEventListener("abort", close);
      if (request.signal.aborted) {
        return close();
      }
      emitter.addListener(params.lobby as string, send);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
