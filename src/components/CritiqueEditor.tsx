"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteCritiqueAction, saveCritiqueAction, type CritiqueInput } from "@/app/actions";
import { Markdown } from "./Markdown";

type Props = {
  filmId: number;
  filmTitle: string;
  initial: Omit<CritiqueInput, "filmId"> | null;
  defaultRating: number | null;
};

const TOOLS: { label: string; title: string; before: string; after?: string; line?: boolean }[] = [
  { label: "G", title: "Gras", before: "**", after: "**" },
  { label: "I", title: "Italique", before: "*", after: "*" },
  { label: "Titre", title: "Intertitre", before: "## ", line: true },
  { label: "❝", title: "Citation", before: "> ", line: true },
  { label: "•", title: "Liste", before: "- ", line: true },
  { label: "✦", title: "Séparateur", before: "\n---\n", line: true },
];

export function CritiqueEditor({ filmId, filmTitle, initial, defaultRating }: Props) {
  const [id, setId] = useState(initial?.id);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [lede, setLede] = useState(initial?.lede ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [rating, setRating] = useState<number | null>(initial?.rating ?? defaultRating);
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [visibility, setVisibility] = useState<"membres" | "prive">(initial?.visibility ?? "membres");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const idRef = useRef(id);

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  // Les sauvegardes passent l'une après l'autre, pour ne jamais créer la critique en double.
  const save = (nextStatus = status) => {
    saving.current = saving.current.then(async () => {
      const res = await saveCritiqueAction({ id: idRef.current, filmId, title, lede, body, rating, status: nextStatus, visibility });
      idRef.current = res.id;
      setId(res.id);
      setSavedAt(res.savedAt);
      setDirty(false);
    });
    return saving.current;
  };

  // Sauvegarde automatique 1,5 s après la dernière modification.
  useEffect(() => {
    if (!dirty || (!title && !lede && !body)) return;
    const t = setTimeout(() => save(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, lede, body, rating, visibility, dirty]);

  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const applyTool = (tool: (typeof TOOLS)[number]) => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    let next: string, cursor: number;
    if (tool.line) {
      const lineStart = body.lastIndexOf("\n", s - 1) + 1;
      next = body.slice(0, lineStart) + tool.before + body.slice(lineStart);
      cursor = e + tool.before.length;
    } else {
      const selected = body.slice(s, e) || "texte";
      next = body.slice(0, s) + tool.before + selected + (tool.after ?? "") + body.slice(e);
      cursor = s + tool.before.length + selected.length;
    }
    edit(setBody)(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const togglePublish = () => {
    const next = status === "published" ? "draft" : "published";
    setStatus(next);
    startTransition(() => save(next));
  };

  return (
    <div className="space-y-6">
      {/* Barre d'état, toujours visible */}
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-16 md:-mx-8 md:px-8">
        <Link href={`/film/${filmId}`} className="text-sm text-muted hover:text-foreground">← {filmTitle}</Link>
        <span className="ml-auto text-xs text-muted">
          {dirty ? "Modifications non enregistrées…" : savedAt ? `Enregistré à ${new Date(savedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </span>
        {id && status === "published" && (
          <Link href={`/critiques/${id}`} className="hidden rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent sm:block">Lire</Link>
        )}
        <button
          onClick={togglePublish}
          disabled={pending || (!title && !body)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
            status === "published" ? "border border-border text-muted hover:text-foreground" : "bg-accent text-on-accent hover:brightness-110"
          }`}
        >
          {status === "published" ? "Repasser en brouillon" : "Publier"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${status === "published" ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>
          {status === "published" ? "Publiée" : "Brouillon"}
        </span>
        {/* Qui peut lire cette critique une fois publiée */}
        <div className="flex rounded-full border border-border bg-surface p-0.5 text-xs">
          {(["membres", "prive"] as const).map((v) => (
            <button
              key={v}
              onClick={() => edit(setVisibility)(v)}
              title={v === "membres" ? "Les autres membres de Dreams peuvent la lire" : "Toi seul peux la lire"}
              className={`rounded-full px-2.5 py-1 ${visibility === v ? "bg-foreground text-background" : "text-muted"}`}
            >
              {v === "membres" ? "Membres" : "Privée"}
            </button>
          ))}
        </div>
        <RatingPicker value={rating} onChange={edit(setRating)} />
      </div>

      <input
        value={title}
        onChange={(e) => edit(setTitle)(e.target.value)}
        placeholder="Titre de la critique"
        className="w-full bg-transparent font-display text-4xl leading-tight outline-none placeholder:text-muted/50 md:text-5xl"
      />
      <textarea
        value={lede}
        onChange={(e) => edit(setLede)(e.target.value)}
        placeholder="Chapô : en deux ou trois phrases, ce que tu as pensé du film."
        rows={2}
        className="field-sizing-content w-full resize-none bg-transparent text-lg leading-relaxed text-foreground/80 outline-none placeholder:text-muted/50"
      />

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-1 border-b border-border p-2">
          {(["write", "preview"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1 text-sm ${tab === t ? "bg-surface-2 text-foreground" : "text-muted"}`}>
              {t === "write" ? "Écrire" : "Aperçu"}
            </button>
          ))}
          {tab === "write" && (
            <div className="ml-auto flex gap-0.5">
              {TOOLS.map((tool) => (
                <button key={tool.title} title={tool.title} onClick={() => applyTool(tool)} className="min-w-8 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-foreground">
                  {tool.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {tab === "write" ? (
          <textarea
            ref={textarea}
            value={body}
            onChange={(e) => edit(setBody)(e.target.value)}
            placeholder={"Écris ta critique ici…\n\nMise en forme : **gras**, *italique*, ## Intertitre, > Citation"}
            className="field-sizing-content block min-h-[50vh] w-full resize-none bg-transparent p-5 leading-relaxed outline-none placeholder:text-muted/50"
          />
        ) : (
          <div className="min-h-[50vh] p-5">{body ? <Markdown dropCap>{body}</Markdown> : <p className="text-muted">Rien à afficher pour l&apos;instant.</p>}</div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>{words.toLocaleString("fr-FR")} mots · {Math.max(1, Math.round(words / 220))} min de lecture</span>
        {id && (
          <button
            onClick={() => confirm("Supprimer définitivement cette critique ?") && startTransition(() => deleteCritiqueAction(id, filmId))}
            className="hover:text-heart"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

function RatingPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="ml-auto flex items-center gap-2">
      <div className="flex text-2xl" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="relative cursor-pointer select-none text-surface-2">
            ★
            <span className="pointer-events-none absolute inset-0 overflow-hidden text-accent" style={{ width: shown >= star ? "100%" : shown >= star - 0.5 ? "50%" : "0%" }}>★</span>
            {/* Chaque étoile a deux moitiés cliquables, pour les demi-notes */}
            <button aria-label={`${star - 0.5} étoiles`} className="absolute inset-y-0 left-0 w-1/2" onMouseEnter={() => setHover(star - 0.5)} onClick={() => onChange(value === star - 0.5 ? null : star - 0.5)} />
            <button aria-label={`${star} étoiles`} className="absolute inset-y-0 right-0 w-1/2" onMouseEnter={() => setHover(star)} onClick={() => onChange(value === star ? null : star)} />
          </span>
        ))}
      </div>
    </div>
  );
}
