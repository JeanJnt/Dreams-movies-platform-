"use client";

import { upload } from "@vercel/blob/client";
import { uploadTargetAction } from "@/app/actions";

/*
 * Envoie un fichier dans le stockage de Dreams.
 * - En ligne : directement du navigateur vers Vercel Blob (pas de limite de 4,5 Mo), puis renvoie son adresse.
 * - En local : renvoie null, et l'appelant utilise l'envoi classique (formulaire vers le serveur).
 */
export async function sendFile(file: File, filmId: number, prefix: "media" | "cover" | "poster", onProgress?: (pct: number) => void) {
  const target = await uploadTargetAction(filmId, file.name, prefix);
  if (target.mode === "local") return null;
  await upload(target.pathname, file, {
    access: "private",
    handleUploadUrl: "/api/upload",
    contentType: target.contentType,
    multipart: file.size > 20 * 1024 * 1024, // gros fichiers : envoyés en plusieurs morceaux, avec reprise en cas d'erreur
    onUploadProgress: (p) => onProgress?.(Math.round(p.percentage)),
  });
  return target;
}
