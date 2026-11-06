"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  designStateAction,
  discardDesignImagesAction,
  resetDesignAction,
  revertDesignAction,
  saveDesignAction,
  uploadDesignImageAction,
} from "@/app/actions";
import {
  BACK_SIZE,
  DISC_CONTENTS,
  DISC_FONTS,
  DISC_IMAGE,
  DISC_ZONE,
  FRONT_SIZE,
  type CaseDesign,
  type DiscDesign,
  type DiscText,
  type JacketStyleKey,
  type ObjectDesign,
} from "@/lib/design-types";
import { filmPalette, jacketStyle } from "@/lib/jacket-palette";
import { sendFile } from "@/lib/upload-client";
import { LogoLoader } from "../loading/LogoLoader";
import type { CaseFilmInfo } from "../three/dreams/CaseObject";
import { discPresets } from "../three/models/discDesign";
import { ImageCropper } from "./ImageCropper";

const FilmStage = dynamic(
  () => import("../three/dreams/FilmStage").then((m) => m.FilmStage),
  { ssr: false, loading: () => <Loading /> },
);
const DiscPreview = dynamic(() => import("./DiscPreview"), {
  ssr: false,
  loading: () => <Loading />,
});
function Loading() {
  return (
    <div className="grid h-full place-items-center">
      <LogoLoader size={90} label="Préparation de l'aperçu" />
    </div>
  );
}

const STYLES: { key: JacketStyleKey; label: string }[] = [
  { key: "cadre", label: "Cadre" },
  { key: "plein", label: "Plein cadre" },
  { key: "typo", label: "Typographique" },
  { key: "affiche", label: "Affiche" },
  { key: "bande", label: "Bande" },
  { key: "bichromie", label: "Bichromie" },
];
type Part = "face" | "dos" | "tranche" | "disque";
const PARTS: { key: Part; label: string }[] = [
  { key: "face", label: "Face" },
  { key: "dos", label: "Dos" },
  { key: "tranche", label: "Tranche" },
  { key: "disque", label: "Disque" },
];

const toHex = (c: string) => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = c.match(/\d+/g);
  return m
    ? `#${m
        .slice(0, 3)
        .map((v) => Number(v).toString(16).padStart(2, "0"))
        .join("")}`
    : "#222222";
};
let uidN = 0;
const newId = () => `t${Date.now().toString(36)}${uidN++}`;

/*
 * L'atelier : on habille le boîtier (face, dos, tranche) et le disque de son film, avec l'aperçu 3D en direct.
 * Rien n'est enregistré avant « Enregistrer » ; on peut revenir à la version précédente ou repartir de l'habillage d'origine.
 */
export function DesignEditor({
  film,
  onClose,
}: {
  film: CaseFilmInfo;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<ObjectDesign>(film.design ?? {});
  const [draft, setDraft] = useState<ObjectDesign>(film.design ?? {});
  const [hasPrev, setHasPrev] = useState(false);
  const [part, setPart] = useState<Part>("face");
  const [crop, setCrop] = useState<{
    file: File;
    target: "front" | "back" | "disc";
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [spin, setSpin] = useState(true);
  const uploaded = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<"front" | "back" | "disc">("front");

  useEffect(() => {
    designStateAction(film.id).then((s) => {
      setHasPrev(s.hasPrev);
      if (s.design) {
        setSaved(s.design);
        setDraft(s.design);
      }
    });
  }, [film.id]);
  // Échap ferme ; on bloque le défilement de la page derrière
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => e.key === "Escape" && !crop && close();
    window.addEventListener("keydown", k);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", k);
    };
  });

  // l'aperçu suit le brouillon, un court instant après chaque modification (l'impression d'une jaquette est lourde)
  const [shown, setShown] = useState(draft);
  useEffect(() => {
    const t = setTimeout(() => setShown(draft), 180);
    return () => clearTimeout(t);
  }, [draft]);
  const previewFilm = useMemo(
    () => ({ ...film, design: shown }),
    [film, shown],
  );

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const autoStyle = jacketStyle({ ...film, design: undefined });
  const style = draft.case?.style ?? autoStyle;
  const pal = filmPalette(film.color, style);
  const presets = useMemo(() => discPresets(film), [film]);

  const setCase = (fn: (c: CaseDesign) => CaseDesign) =>
    setDraft((d) => ({ ...d, case: fn(d.case ?? {}) }));
  const setFront = (o: Partial<NonNullable<CaseDesign["front"]>>) =>
    setCase((c) => ({ ...c, front: { ...c.front, ...o } }));
  const setBack = (o: Partial<NonNullable<CaseDesign["back"]>>) =>
    setCase((c) => ({ ...c, back: { ...c.back, ...o } }));
  const setSpine = (o: Partial<NonNullable<CaseDesign["spine"]>>) =>
    setCase((c) => ({ ...c, spine: { ...c.spine, ...o } }));
  const setDisc = (o: Partial<DiscDesign>) =>
    setDraft((d) => (d.disc ? { ...d, disc: { ...d.disc, ...o } } : d));
  const setText = (id: string, o: Partial<DiscText>) =>
    setDraft((d) =>
      d.disc
        ? {
            ...d,
            disc: {
              ...d.disc,
              texts: d.disc.texts.map((t) =>
                t.id === id ? { ...t, ...o } : t,
              ),
            },
          }
        : d,
    );

  const pick = (target: "front" | "back" | "disc") => {
    pickTarget.current = target;
    fileInput.current?.click();
  };
  const upload = async (file: File, target: "front" | "back" | "disc") => {
    setCrop(null);
    setMsg("Envoi de l'image…");
    const prefix =
      target === "front" ? "cover" : target === "back" ? "backdrop" : "disc";
    try {
      let url: string | undefined;
      const sent = await sendFile(file, film.id, prefix);
      if (sent) url = sent.url;
      else {
        const fd = new FormData();
        fd.set("image", file);
        const r = await uploadDesignImageAction(film.id, prefix, fd);
        if (r.error) throw new Error(r.error);
        url = r.url;
      }
      if (!url) throw new Error("Envoi impossible.");
      uploaded.current.push(url);
      if (target === "front") setFront({ image: url });
      else if (target === "back") setBack({ image: url });
      else setDisc({ image: url, bg: "image" });
      setMsg(null);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const save = () =>
    start(async () => {
      const s = await saveDesignAction(film.id, draft);
      setSaved(s.design ?? {});
      setDraft(s.design ?? {});
      setHasPrev(s.hasPrev);
      uploaded.current = [];
      setMsg(
        "Enregistré. Le boîtier et le disque sont à jour partout dans Dreams.",
      );
      router.refresh();
    });
  const revert = () =>
    start(async () => {
      const s = await revertDesignAction(film.id);
      setSaved(s.design ?? {});
      setDraft(s.design ?? {});
      setHasPrev(s.hasPrev);
      setMsg("Version précédente rétablie.");
      router.refresh();
    });
  const reset = (which: "case" | "disc" | "all") => {
    const label =
      which === "case"
        ? "le boîtier"
        : which === "disc"
          ? "le disque"
          : "le boîtier et le disque";
    if (
      !window.confirm(
        `Revenir à l'habillage d'origine pour ${label} ? La version actuelle restera disponible comme « version précédente ».`,
      )
    )
      return;
    start(async () => {
      const s = await resetDesignAction(film.id, which);
      setSaved(s.design ?? {});
      setDraft(s.design ?? {});
      setHasPrev(s.hasPrev);
      setMsg("Habillage d'origine rétabli.");
      router.refresh();
    });
  };
  const close = () => {
    if (dirty && !window.confirm("Fermer sans enregistrer les modifications ?"))
      return;
    const orphans = uploaded.current.filter(
      (u) => !JSON.stringify(saved).includes(u),
    );
    if (orphans.length) void discardDesignImagesAction(film.id, orphans);
    onClose();
  };

  const F = draft.case?.front ?? {},
    B = draft.case?.back ?? {},
    SP = draft.case?.spine ?? {};
  const D = draft.disc;

  return (
    <div
      className="fixed inset-0 z-[250] flex flex-col bg-[#030303]/[0.97] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atelier-titre"
    >
      <header className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3 md:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] tracking-[0.14em] text-muted uppercase">
            Atelier
          </p>
          <h2
            id="atelier-titre"
            className="truncate font-display text-[1.35rem] leading-tight md:text-[1.6rem]"
          >
            {film.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          className="btn btn-sm"
          aria-label="Fermer l'atelier"
        >
          Fermer
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,44svh)_minmax(0,1fr)] md:grid-cols-[minmax(0,1.25fr)_minmax(22rem,1fr)] md:grid-rows-1">
        {/* l'aperçu 3D, en direct */}
        <div className="relative min-h-0 border-[var(--line)] max-md:border-b md:border-r">
          {part === "disque" ? (
            D ? (
              <DiscPreview film={previewFilm} spin={spin} />
            ) : (
              <div className="grid h-full place-items-center px-8 text-center text-[14px] text-muted">
                Choisissez un modèle de départ pour composer le disque.
              </div>
            )
          ) : (
            <FilmStage
              film={previewFilm}
              focus={
                part === "dos" ? "dos" : part === "tranche" ? "tranche" : "face"
              }
              controls={false}
              className="h-full w-full"
            />
          )}
          {part === "disque" && D && (
            <button
              type="button"
              onClick={() => setSpin((s) => !s)}
              className="btn btn-sm absolute right-3 bottom-3"
              aria-pressed={!spin}
            >
              {spin ? "Arrêter la rotation" : "Faire tourner"}
            </button>
          )}
        </div>

        {/* les réglages */}
        <div className="flex min-h-0 flex-col">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-[var(--line)] px-3 py-2"
            aria-label="Partie à personnaliser"
          >
            {PARTS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPart(p.key)}
                aria-pressed={part === p.key}
                className={`min-h-10 rounded-full px-4 text-[14px] transition-colors ${part === p.key ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-4 py-5 md:px-6">
            {part === "face" && (
              <>
                <Field label="Maquette">
                  <Chips
                    value={style}
                    options={STYLES}
                    onChange={(v) =>
                      setCase((c) => ({
                        ...c,
                        style: v === autoStyle ? undefined : v,
                      }))
                    }
                  />
                </Field>
                <Field
                  label="Image de la face"
                  hint={
                    F.image
                      ? "Votre image remplace la maquette."
                      : "Importez votre image : vous la cadrerez au format exact de la jaquette."
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => pick("front")}
                    >
                      {F.image ? "Changer d'image" : "Importer une image"}
                    </button>
                    {F.image && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setFront({ image: undefined })}
                      >
                        Retirer l&apos;image
                      </button>
                    )}
                  </div>
                </Field>
                <Field label="Titre">
                  <Toggle
                    checked={F.showTitle !== false}
                    onChange={(v) =>
                      setFront({ showTitle: v ? undefined : false })
                    }
                    label="Afficher le titre"
                  />
                  {F.showTitle !== false && (
                    <>
                      <TextInput
                        value={F.title ?? ""}
                        placeholder={film.title}
                        onChange={(v) => setFront({ title: v || undefined })}
                        label="Titre affiché"
                      />
                      <TextInput
                        value={F.subtitle ?? ""}
                        placeholder={
                          film.originalTitle &&
                          film.originalTitle !== film.title
                            ? film.originalTitle
                            : "Sous-titre (facultatif)"
                        }
                        onChange={(v) =>
                          setFront({ subtitle: v === "" ? undefined : v })
                        }
                        label="Ligne sous le titre"
                      />
                    </>
                  )}
                </Field>
                <Field label="Mentions">
                  <Toggle
                    checked={F.showHead !== false}
                    onChange={(v) =>
                      setFront({ showHead: v ? undefined : false })
                    }
                    label="« Un film de … » en tête"
                  />
                  <Toggle
                    checked={F.showFoot !== false}
                    onChange={(v) =>
                      setFront({ showFoot: v ? undefined : false })
                    }
                    label="L'étoile et le numéro de collection"
                  />
                </Field>
              </>
            )}

            {part === "dos" && (
              <>
                <Field label="Photogramme" hint="Format 2:1, cadré par vous.">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => pick("back")}
                    >
                      {B.image ? "Changer d'image" : "Importer une image"}
                    </button>
                    {B.image && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setBack({ image: undefined })}
                      >
                        Image du film
                      </button>
                    )}
                  </div>
                </Field>
                <Field label="Texte du dos">
                  <textarea
                    value={B.text ?? ""}
                    placeholder={film.overview ?? "Le synopsis du film"}
                    onChange={(e) =>
                      setBack({ text: e.target.value || undefined })
                    }
                    rows={6}
                    maxLength={1400}
                    className="field w-full resize-y text-[14px]"
                    aria-label="Texte du dos"
                  />
                </Field>
                <Field label="Informations">
                  <Toggle
                    checked={B.showCredits !== false}
                    onChange={(v) =>
                      setBack({ showCredits: v ? undefined : false })
                    }
                    label="Générique, caractéristiques et code-barres"
                  />
                </Field>
                <Field label="Couleur du dos">
                  <ColorRow
                    value={B.bg ?? toHex(pal.back)}
                    auto={!B.bg}
                    onChange={(c) => setBack({ bg: c })}
                    onAuto={() => setBack({ bg: undefined })}
                  />
                </Field>
              </>
            )}

            {part === "tranche" && (
              <>
                <Field label="Texte de la tranche">
                  <TextInput
                    value={SP.title ?? ""}
                    placeholder={F.title || film.title}
                    onChange={(v) => setSpine({ title: v || undefined })}
                    label="Texte de la tranche"
                  />
                </Field>
                <Field label="Couleurs">
                  <p className="text-[13px] text-muted">Fond</p>
                  <ColorRow
                    value={SP.bg ?? toHex(pal.spine)}
                    auto={!SP.bg}
                    onChange={(c) => setSpine({ bg: c })}
                    onAuto={() => setSpine({ bg: undefined })}
                  />
                  <p className="mt-2 text-[13px] text-muted">Texte</p>
                  <ColorRow
                    value={SP.ink ?? toHex(pal.spineInk)}
                    auto={!SP.ink}
                    onChange={(c) => setSpine({ ink: c })}
                    onAuto={() => setSpine({ ink: undefined })}
                  />
                </Field>
                <Field label="Informations">
                  <Toggle
                    checked={SP.showDirector !== false}
                    onChange={(v) =>
                      setSpine({ showDirector: v ? undefined : false })
                    }
                    label="Réalisateur"
                  />
                  <Toggle
                    checked={SP.showNumber !== false}
                    onChange={(v) =>
                      setSpine({ showNumber: v ? undefined : false })
                    }
                    label="Numéro de collection"
                  />
                </Field>
              </>
            )}

            {part === "disque" && (
              <>
                <Field
                  label={D ? "Repartir d'un modèle" : "Modèle de départ"}
                  hint={
                    D
                      ? undefined
                      : "Le disque actuel suit la maquette de la jaquette. Choisissez un modèle : tout y sera modifiable."
                  }
                >
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {presets.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            disc: {
                              ...p.design,
                              image: d.disc?.image,
                              texts: p.design.texts.map((t) => ({
                                ...t,
                                id: newId(),
                              })),
                            },
                          }))
                        }
                        className="chip justify-center !text-[13px]"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </Field>
                {D && (
                  <>
                    <Field label="Fond">
                      <Chips
                        value={D.bg}
                        options={[
                          { key: "silver", label: "Argent (miroir)" },
                          { key: "color", label: "Couleur" },
                          { key: "image", label: "Image" },
                        ]}
                        onChange={(v) =>
                          setDisc({
                            bg: v,
                            useFilmImage:
                              v === "image" && !D.image && !D.useFilmImage
                                ? film.backdrop
                                  ? "backdrop"
                                  : "poster"
                                : D.useFilmImage,
                          })
                        }
                      />
                      {D.bg !== "silver" && (
                        <ColorRow
                          value={D.bgColor}
                          onChange={(c) => setDisc({ bgColor: c })}
                        />
                      )}
                      <p className="mt-2 text-[13px] text-muted">Encre</p>
                      <ColorRow
                        value={D.ink}
                        onChange={(c) => setDisc({ ink: c })}
                      />
                    </Field>
                    <Field label="Image">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => pick("disc")}
                        >
                          {D.image ? "Changer mon image" : "Importer une image"}
                        </button>
                        <Chips
                          value={D.image ? "mine" : (D.useFilmImage ?? "none")}
                          options={[
                            ...(D.image
                              ? [{ key: "mine", label: "La mienne" }]
                              : []),
                            ...(film.backdrop
                              ? [{ key: "backdrop", label: "Image du film" }]
                              : []),
                            ...(film.poster
                              ? [{ key: "poster", label: "Affiche" }]
                              : []),
                            { key: "none", label: "Aucune" },
                          ]}
                          onChange={(v) =>
                            setDisc(
                              v === "mine"
                                ? {}
                                : {
                                    image: undefined,
                                    useFilmImage:
                                      v === "none"
                                        ? null
                                        : (v as "backdrop" | "poster"),
                                    bg:
                                      v === "none" && D.bg === "image"
                                        ? "color"
                                        : D.bg,
                                  },
                            )
                          }
                        />
                      </div>
                      {(D.image || D.useFilmImage) && (
                        <>
                          <Chips
                            value={D.imageFit}
                            options={[
                              { key: "full", label: "Tout le disque" },
                              { key: "half", label: "Moitié haute" },
                            ]}
                            onChange={(v) => setDisc({ imageFit: v })}
                          />
                          <Chips
                            value={D.imageFilter}
                            options={[
                              { key: "none", label: "Couleur" },
                              { key: "mono", label: "Noir et blanc" },
                              { key: "duo", label: "Bichromie" },
                            ]}
                            onChange={(v) => setDisc({ imageFilter: v })}
                          />
                          <Range
                            label="Opacité"
                            value={D.imageOpacity}
                            min={0.1}
                            max={1}
                            step={0.05}
                            onChange={(v) => setDisc({ imageOpacity: v })}
                            format={(v) => `${Math.round(v * 100)} %`}
                          />
                        </>
                      )}
                    </Field>
                    <Field
                      label="Zone imprimée"
                      hint="Hors de cette zone, le disque reste nu : polycarbonate et miroir."
                    >
                      <Range
                        label="Bord intérieur"
                        value={D.inner}
                        min={DISC_ZONE.min}
                        max={D.outer - 6}
                        step={0.5}
                        onChange={(v) => setDisc({ inner: v })}
                        format={(v) => `${v} mm`}
                      />
                      <Range
                        label="Bord extérieur"
                        value={D.outer}
                        min={D.inner + 6}
                        max={DISC_ZONE.max}
                        step={0.5}
                        onChange={(v) => setDisc({ outer: v })}
                        format={(v) => `${v} mm`}
                      />
                    </Field>
                    <Field label="Motif">
                      <Chips
                        value={D.graphic}
                        options={[
                          { key: "none", label: "Aucun" },
                          { key: "rings", label: "Cercles" },
                          { key: "grooves", label: "Sillons" },
                          { key: "bands", label: "Bandes" },
                          { key: "edge", label: "Filets" },
                        ]}
                        onChange={(v) => setDisc({ graphic: v })}
                      />
                    </Field>
                    <Field label={`Textes (${D.texts.length})`}>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={D.texts.length >= 8}
                          onClick={() =>
                            setDisc({
                              texts: [
                                ...D.texts,
                                {
                                  id: newId(),
                                  content: "title",
                                  mode: "arc",
                                  radius: 50,
                                  angle: 0,
                                  size: 4,
                                  spacing: 0.1,
                                  direction: "out",
                                  font: "sans",
                                  upper: true,
                                },
                              ],
                            })
                          }
                        >
                          Ajouter un texte
                        </button>
                        {D.texts.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setDisc({ texts: [] })}
                          >
                            Retirer tous les textes
                          </button>
                        )}
                      </div>
                      {D.texts.map((t, i) => (
                        <TextItem
                          key={t.id}
                          n={i + 1}
                          t={t}
                          set={(o) => setText(t.id, o)}
                          remove={() =>
                            setDisc({
                              texts: D.texts.filter((x) => x.id !== t.id),
                            })
                          }
                          inner={D.inner}
                          outer={D.outer}
                        />
                      ))}
                    </Field>
                  </>
                )}
              </>
            )}
          </div>

          <footer className="space-y-2 border-t border-[var(--line)] px-4 py-3 md:px-6">
            {msg && (
              <p className="text-[13px] text-muted" role="status">
                {msg}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={save}
                disabled={!dirty || pending}
              >
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
              {dirty && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDraft(saved)}
                  disabled={pending}
                >
                  Annuler les modifications
                </button>
              )}
              {hasPrev && !dirty && (
                <button
                  type="button"
                  className="btn"
                  onClick={revert}
                  disabled={pending}
                >
                  Version précédente
                </button>
              )}
              <details className="relative ml-auto">
                <summary className="btn btn-sm cursor-pointer list-none">
                  Réinitialiser
                </summary>
                <div className="card absolute right-0 bottom-[calc(100%+6px)] z-10 w-60 p-1.5">
                  {(
                    [
                      ["case", "Le boîtier"],
                      ["disc", "Le disque"],
                      ["all", "Tout"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => reset(k)}
                      className="block w-full rounded-[10px] px-3 py-2 text-left text-[14px] hover:bg-[var(--surface-3)]"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </footer>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) setCrop({ file: f, target: pickTarget.current });
        }}
      />
      {crop && (
        <ImageCropper
          file={crop.file}
          title={
            crop.target === "front"
              ? "Cadrer la face"
              : crop.target === "back"
                ? "Cadrer le photogramme"
                : "Cadrer l'image du disque"
          }
          width={
            crop.target === "front"
              ? FRONT_SIZE.w
              : crop.target === "back"
                ? BACK_SIZE.w
                : DISC_IMAGE
          }
          height={
            crop.target === "front"
              ? FRONT_SIZE.h
              : crop.target === "back"
                ? BACK_SIZE.h
                : DISC_IMAGE
          }
          shape={crop.target === "disc" ? "disc" : "rect"}
          onCancel={() => setCrop(null)}
          onDone={(f) => upload(f, crop.target)}
        />
      )}
    </div>
  );
}

/* --- petites commandes --- */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-1 text-[12px] font-medium tracking-[0.14em] uppercase">
        {label}
      </legend>
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}
function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={`min-h-9 rounded-full px-3.5 text-[13px] ring-1 transition-colors ${value === o.key ? "bg-accent text-on-accent ring-transparent" : "text-[var(--text-2)] ring-[var(--line-2)] hover:ring-[var(--line-3)]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-4 text-[14px]">
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--accent)]"
      />
    </label>
  );
}
function TextInput({
  value,
  placeholder,
  onChange,
  label,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      maxLength={120}
      className="field w-full text-[14px]"
      aria-label={label}
    />
  );
}
function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.6rem] items-center gap-3 text-[13px]">
      <span className="text-[var(--text-2)]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--accent)]"
      />
      <span className="text-right text-muted tabular">
        {format ? format(value) : value}
      </span>
    </label>
  );
}
const SWATCHES = [
  "#0d0c0b",
  "#f3f1ec",
  "#e9e4d8",
  "#b3131b",
  "#d9a441",
  "#1f3a5f",
  "#2f5d50",
  "#c0c4cc",
];
function ColorRow({
  value,
  onChange,
  auto,
  onAuto,
}: {
  value: string;
  onChange: (c: string) => void;
  auto?: boolean;
  onAuto?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {onAuto && (
        <button
          type="button"
          onClick={onAuto}
          aria-pressed={auto}
          className={`min-h-8 rounded-full px-3 text-[12.5px] ring-1 ${auto ? "bg-accent text-on-accent ring-transparent" : "text-muted ring-[var(--line-2)]"}`}
        >
          D&apos;après le film
        </button>
      )}
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Couleur ${c}`}
          aria-pressed={!auto && value.toLowerCase() === c}
          className="size-8 rounded-full ring-1 ring-[var(--line-3)] aria-pressed:ring-2 aria-pressed:ring-[var(--accent)]"
          style={{ background: c }}
        />
      ))}
      <label
        className="relative size-8 overflow-hidden rounded-full ring-1 ring-[var(--line-3)]"
        title="Autre couleur"
      >
        <span className="sr-only">Autre couleur</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-2 size-12 cursor-pointer"
        />
      </label>
    </div>
  );
}
function TextItem({
  n,
  t,
  set,
  remove,
  inner,
  outer,
}: {
  n: number;
  t: DiscText;
  set: (o: Partial<DiscText>) => void;
  remove: () => void;
  inner: number;
  outer: number;
}) {
  return (
    <div className="space-y-2.5 rounded-[14px] p-3 ring-1 ring-[var(--line-2)]">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-muted tabular">{n}</span>
        <select
          value={t.content}
          onChange={(e) =>
            set({ content: e.target.value as DiscText["content"] })
          }
          className="field flex-1 !py-1.5 text-[13.5px]"
          aria-label="Contenu du texte"
        >
          {DISC_CONTENTS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={remove}
          className="btn btn-sm"
          aria-label={`Supprimer le texte ${n}`}
        >
          Retirer
        </button>
      </div>
      {t.content === "custom" && (
        <TextInput
          value={t.custom ?? ""}
          placeholder="Votre texte"
          onChange={(v) => set({ custom: v })}
          label="Texte libre"
        />
      )}
      <div className="flex flex-wrap gap-1.5">
        <Chips
          value={t.mode}
          options={[
            { key: "arc", label: "Courbé" },
            { key: "straight", label: "Droit" },
          ]}
          onChange={(v) => set({ mode: v })}
        />
        {t.mode === "arc" && (
          <Chips
            value={t.direction}
            options={[
              { key: "out", label: "Lecture en haut" },
              { key: "in", label: "Lecture en bas" },
            ]}
            onChange={(v) =>
              set({
                direction: v,
                angle:
                  v === "in" && t.angle === 0
                    ? 180
                    : v === "out" && t.angle === 180
                      ? 0
                      : t.angle,
              })
            }
          />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <select
          value={t.font}
          onChange={(e) => set({ font: e.target.value as DiscText["font"] })}
          className="field !py-1.5 text-[13.5px]"
          aria-label="Police"
        >
          {DISC_FONTS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={Boolean(t.upper)}
            onChange={(e) => set({ upper: e.target.checked })}
            className="accent-[var(--accent)]"
          />
          Majuscules
        </label>
        <label
          className="relative ml-auto size-8 overflow-hidden rounded-full ring-1 ring-[var(--line-3)]"
          title="Couleur du texte"
        >
          <span className="sr-only">Couleur du texte</span>
          <span
            className="absolute inset-0"
            style={{ background: t.color ?? "transparent" }}
          />
          <input
            type="color"
            value={t.color ?? "#f2efe8"}
            onChange={(e) => set({ color: e.target.value })}
            className="absolute -inset-2 size-12 cursor-pointer opacity-0"
          />
        </label>
      </div>
      <Range
        label={t.mode === "arc" ? "Rayon" : "Distance au centre"}
        value={t.radius}
        min={t.mode === "arc" ? inner + 1 : 0}
        max={outer - 1}
        step={0.5}
        onChange={(v) => set({ radius: v })}
        format={(v) => `${v} mm`}
      />
      <Range
        label="Position"
        value={t.angle}
        min={-180}
        max={180}
        step={1}
        onChange={(v) => set({ angle: v })}
        format={(v) => `${v}°`}
      />
      <Range
        label="Taille"
        value={t.size}
        min={1.5}
        max={14}
        step={0.1}
        onChange={(v) => set({ size: v })}
        format={(v) => `${v.toFixed(1)} mm`}
      />
      <Range
        label="Espacement"
        value={t.spacing}
        min={0}
        max={0.8}
        step={0.01}
        onChange={(v) => set({ spacing: v })}
        format={(v) => `${Math.round(v * 100)} %`}
      />
    </div>
  );
}
