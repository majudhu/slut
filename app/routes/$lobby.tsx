import { json, redirect } from '@remix-run/node';
import { Form, Link, useLoaderData, useNavigate, useParams } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { db } from '~/utils/db.server';
import { emitter } from '~/utils/lobby-events.server';
import { createSession, getSession } from '~/utils/session.server';

import type { ActionArgs, LoaderArgs } from "@remix-run/node";

type Data = { lobby?: { name: string }; sluts?: string[] } | null;

export async function loader({ params, request }: LoaderArgs) {
  const session = await getSession(request);
  const playerId = session.get("id");
  if (playerId) {
    const [player, lobby] = await Promise.all([
      db.player.findUnique({
        where: { id: playerId },
        select: { name: true, lobby: true },
      }),
      db.lobby.findUnique({
        where: { name: params.lobby },
        include: { players: true },
      }),
    ]);
    if (player && lobby) {
      if (request.headers.get("accept") != "text/event-stream") {
        return json({
          ...player,
          sluts: lobby?.players
            .filter((p) => p.id != playerId)
            .map((p) => p.name),
        } as Data);
      }

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
                  lobby?.players
                    .filter((p) => p.id != playerId)
                    .map((p) => p.name) ?? []
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
  }
  return json(null as Data);
}

export async function action({ params, request }: ActionArgs) {
  const [session, formData, lobby] = await Promise.all([
    getSession(request),
    request.formData(),
    db.lobby.findUnique({
      where: { name: params.lobby },
      include: { players: true },
    }),
  ]);
  const name = formData.get("name");
  const playerId = session.get("id");
  if (playerId && lobby) {
    const player = await db.player.findUnique({ where: { id: playerId } });
    if (player) {
      await db.player.update({
        where: { id: player.id },
        data: { lobbyId: player.lobbyId == lobby.id ? null : lobby.id },
      });
      emitter.emit(lobby.name);
      if (player.lobbyId == lobby.id && lobby.players.length < 2) {
        await db.lobby.delete({ where: { id: lobby.id } });
        return redirect("/");
      }
      return redirect(lobby.name);
    }
  } else if (lobby && name && typeof name == "string") {
    const [player] = await Promise.all([
      db.player.create({ data: { name, lobbyId: lobby.id } }),
      db.player.deleteMany({
        where: {
          updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    emitter.emit(lobby.name);
    return createSession({
      request,
      playerId: player.id,
      redirectTo: `/${params.lobby}`,
    });
  }
  return redirect("/");
}

export default function Index() {
  const navigate = useNavigate();
  const { lobby } = useParams();
  const user: Data = useLoaderData();
  const [sluts, setSluts] = useState(user?.sluts);

  useEffect(() => {
    setSluts(user?.sluts);
    if (user) {
      function handler(data: MessageEvent<string>) {
        if (data.data == "[]" && user?.lobby?.name != lobby) {
          navigate("/");
        } else {
          setSluts(JSON.parse(data.data));
        }
      }
      const eventSource = new EventSource(`/${lobby}?_data=routes/$lobby`);
      eventSource.addEventListener("message", handler);
      return () => {
        eventSource.removeEventListener("message", handler);
        eventSource.close();
      };
    }
  }, [user, lobby, navigate]);

  return (
    <Form method="post" className="text-center">
      <h1 className="text-4xl mb-8 text-center font-bold">
        <Link to="/">SLUT</Link>
      </h1>

      <Link to={`/${lobby}`} className="mb-4 font-bold block">
        {lobby}
      </Link>

      {sluts?.map((slut) => (
        <p key={slut} className="p-2 bg-gray-50 my-1">
          {slut}
        </p>
      ))}

      {!user && (
        <input
          required
          className="w-full text-center border rounded p-2 mb-1 text-lg"
          name="name"
          placeholder="Name"
        />
      )}

      <button
        className="w-full bg-gray-100 font-bold p-2 rounded my-2"
        type="submit"
      >
        {user?.lobby?.name == lobby ? "LEAVE" : "JOIN"}
      </button>
    </Form>
  );
}
