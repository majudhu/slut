import { db } from '~/utils/db.server';

export async function loader() {
  try {
    await Promise.all([db.lobby.count(), db.player.count()]);
    return new Response("OK");
  } catch (error: unknown) {
    console.log("healthcheck ❌", { error });
    return new Response("ERROR", { status: 500 });
  }
}
