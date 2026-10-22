import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { MAX_SIZE, MIME } from "@/lib/media";

/*
 * Envoi direct des fichiers du navigateur vers Vercel Blob (en ligne seulement).
 * Une requête vers le serveur est limitée à ~4,5 Mo sur Vercel : pour les vidéos, le navigateur envoie donc le
 * fichier directement au stockage, avec une autorisation à usage unique que délivre cette route.
 * L'autorisation n'est donnée qu'à un membre connecté, et seulement pour SON dossier (media/<son id>/…).
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const me = await currentUser();
        if (!me) throw new Error("Connexion requise");
        const m = pathname.match(/^media\/(\d+)\/(\d+)\/[\w-]+(\.\w+)$/);
        if (!m || Number(m[1]) !== me.id) throw new Error("Chemin non autorisé");
        const mime = MIME[m[3].toLowerCase()];
        if (!mime) throw new Error("Format non pris en charge");
        return { allowedContentTypes: [mime], maximumSizeInBytes: MAX_SIZE, addRandomSuffix: false, allowOverwrite: false };
      },
      // Rien à faire ici : le navigateur enregistre ensuite le fichier via une action (registerUploaded).
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
