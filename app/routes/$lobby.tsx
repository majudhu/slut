import { json, redirect } from '@remix-run/node';
import { Form, Link, useLoaderData, useParams } from '@remix-run/react';
import { db } from '~/utils/db.server';
import { getSession } from '~/utils/session.server';

import type { ActionArgs, LoaderArgs } from "@remix-run/node";

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
      return json({
        ...player,
        sluts: lobby.players
          .filter((player) => player.id != playerId)
          .map((player) => player.name),
      });
    }
  }
  return redirect("/");
}

export async function action({ params, request }: ActionArgs) {
  const session = await getSession(request);
  const playerId = session.get("id");
  if (playerId) {
    const [player, lobby] = await Promise.all([
      db.player.findUnique({ where: { id: playerId } }),
      db.lobby.findUnique({
        where: { name: params.lobby },
        include: { players: true },
      }),
    ]);
    if (player && lobby) {
      await db.player.update({
        where: { id: player.id },
        data: { lobbyId: player.lobbyId == lobby.id ? null : lobby.id },
      });

      if (player.lobbyId == lobby.id && lobby.players.length < 2) {
        await db.lobby.delete({ where: { id: lobby.id } });
        return redirect("/");
      }

      return redirect(lobby.name);
    }
  }
  return redirect("/");
}

export default function Index() {
  const user = useLoaderData<typeof loader>();
  const { lobby } = useParams();

  return (
    <Form method="post" className="text-center">
      <h1 className="text-4xl mb-8 text-center font-bold">SLUT</h1>

      <Link to={`/${lobby}`} className="my-2 font-bold">
        {lobby}
      </Link>

      {user.sluts.map((slut) => (
        <p key={slut}>{slut}</p>
      ))}

      <button
        className="w-full bg-gray-100 font-bold p-2 rounded my-2"
        type="submit"
      >
        {user.lobby?.name == lobby ? "LEAVE" : "JOIN"}
      </button>
    </Form>
  );
}
