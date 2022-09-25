import { json, redirect } from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';
import { generateRandomSkin } from '~/utils/name-generator';
import { createSession, getSession } from '~/utils/session.server';

import type { ActionArgs, LoaderArgs } from "@remix-run/node";

export async function loader({ request }: LoaderArgs) {
  const session = await getSession(request);
  const playerId = session.get("id");
  if (playerId) {
    const player = await db.player.findUnique({
      where: { id: playerId },
      select: { name: true, lobby: true },
    });
    return json(player);
  }
  return json(null);
}

export async function action({ request }: ActionArgs) {
  const formData = await request.formData();
  const open = formData.get("open");
  const name = formData.get("name");
  const session = await getSession(request);
  const playerId = session.get("id");
  const player = playerId
    ? await db.player.findUnique({
        where: { id: playerId },
        include: { lobby: true },
      })
    : null;
  if (player && open !== null) {
    const name = generateRandomSkin();
    const [lobby, hasPlayer] = await Promise.all([
      db.lobby.create({ data: { name } }),
      player.lobby &&
        db.player.findFirst({
          where: { id: { not: player.id }, lobbyId: player.lobby.id },
        }),
    ]);
    await db.player.update({
      where: { id: player.id },
      data: { lobbyId: lobby.id },
    });
    await Promise.all([
      player.lobby &&
        !hasPlayer &&
        db.lobby.delete({ where: { id: player.lobby?.id } }),
      db.lobby.deleteMany({
        where: {
          updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return redirect(name);
  } else if (name && typeof name == "string") {
    if (player) {
      await db.player.update({ where: { id: player.id }, data: { name } });
      return redirect("/");
    } else {
      const [player] = await Promise.all([
        db.player.create({ data: { name } }),
        db.player.deleteMany({
          where: {
            updatedAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);
      return createSession({ request, playerId: player.id, redirectTo: "/" });
    }
  }
  return new Response(null, { status: 400 });
}

export default function Index() {
  const user = useLoaderData<typeof loader>();

  return (
    <Form method="post" className="text-center">
      <h1 className="text-4xl mb-8 text-center font-bold">SLUT</h1>

      {user && (
        <>
          <p className="my-2">Welcome, {user.name}</p>
          <button
            className="w-full bg-gray-100 font-bold p-2 rounded my-2"
            type="submit"
            name="open"
            value="slut"
          >
            OPEN SLUT
          </button>
        </>
      )}

      <input
        required
        className="w-full text-center border rounded p-2 mb-1 text-lg"
        name="name"
        placeholder="Name"
        defaultValue={user?.name}
      />
      <button
        type="submit"
        className="w-full bg-gray-100 font-bold p-2 rounded"
      >
        {user ? "RENAME" : "REGISTER"}
      </button>

      {user?.lobby && (
        <>
          <h1 className="my-2 text-center text-lg font-bold">My slut</h1>
          <Link to={user.lobby.name}>{user.lobby.name}</Link>
        </>
      )}
    </Form>
  );
}
