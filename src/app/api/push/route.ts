import { currentUser } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { removeSubscription, saveSubscription, sendPush } from "@/lib/push";

// Activer (POST) ou désactiver (DELETE) les notifications sur cet appareil.
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return new Response("Non autorisé", { status: 401 });
  await ensureSchema();
  try {
    await saveSubscription(me.id, await req.json());
  } catch {
    return new Response("Abonnement invalide", { status: 400 });
  }
  // Une première notification, pour vérifier que tout marche
  await sendPush(me.id, { title: "Dreams", body: "Les notifications sont activées : tu seras prévenu quand tes films passent au cinéma.", url: "/alertes", tag: "bienvenue" });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await currentUser();
  if (!me) return new Response("Non autorisé", { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await removeSubscription(me.id, endpoint);
  return Response.json({ ok: true });
}
