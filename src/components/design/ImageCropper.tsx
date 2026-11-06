"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Le recadrage d'une image avant de l'appliquer sur une surface (face de jaquette, photogramme du dos, disque).
 *   — le cadre a les proportions exactes de la surface : l'image n'est jamais déformée, seulement cadrée ;
 *   — glisser pour déplacer ; molette, pincement, curseur ou boutons pour zoomer ;
 *   — le zoom minimal couvre tout le cadre (jamais de vide) ;
 *   — pour un disque : le trou central et le bord sont tracés, comme sur le disque imprimé ;
 *   — « Appliquer » produit une image aux dimensions exactes de la surface.
 */
type Props = {
  file: File;
  width: number;
  height: number;
  shape?: "rect" | "disc";
  title: string;
  onCancel: () => void;
  onDone: (file: File) => void;
};

export function ImageCropper({
  file,
  width,
  height,
  shape = "rect",
  title,
  onCancel,
  onDone,
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 }); // centre du cadre, en fraction de l'image
  const [busy, setBusy] = useState(false);
  const view = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(360);

  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(file);
    const i = new Image();
    setError(null);
    i.onload = () => alive && setImg(i);
    i.onerror = () =>
      alive &&
      setError(
        "Cette image ne peut pas être lue. Essayez un fichier JPG, PNG ou WebP.",
      );
    i.src = url;
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // la taille d'affichage suit la place disponible
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const maxH = window.innerHeight * 0.56;
      setVw(
        Math.max(200, Math.min(e.contentRect.width, (maxH * width) / height)),
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);
  const vh = (vw * height) / width;

  // la portion de l'image visible dans le cadre (en pixels de l'image), toujours entièrement dans l'image
  const region = useCallback(
    (z = zoom, c = center) => {
      if (!img) return null;
      const base = Math.max(width / img.width, height / img.height);
      const s = base * z;
      const sw = width / s,
        sh = height / s;
      const cx = Math.min(
        img.width - sw / 2,
        Math.max(sw / 2, c.x * img.width),
      );
      const cy = Math.min(
        img.height - sh / 2,
        Math.max(sh / 2, c.y * img.height),
      );
      return { sx: cx - sw / 2, sy: cy - sh / 2, sw, sh, cx, cy };
    },
    [img, zoom, center, width, height],
  );

  // dessin de l'aperçu
  useEffect(() => {
    const cv = view.current,
      r = region();
    if (!cv || !img || !r) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(vw * dpr);
    cv.height = Math.round(vh * dpr);
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, vw, vh);
    if (shape === "disc") {
      // hors du disque imprimé : assombri ; le trou central et la zone non imprimée tracés
      const C = vw / 2,
        mm = vw / 116;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.62)";
      ctx.beginPath();
      ctx.rect(0, 0, vw, vh);
      ctx.arc(C, C, 58 * mm, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(C, C, 21.5 * mm, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(C, C, 58 * mm, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(C, C, 21.5 * mm, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // repères des tiers
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth = 1;
      for (const f of [1 / 3, 2 / 3]) {
        ctx.beginPath();
        ctx.moveTo(vw * f, 0);
        ctx.lineTo(vw * f, vh);
        ctx.moveTo(0, vh * f);
        ctx.lineTo(vw, vh * f);
        ctx.stroke();
      }
    }
  }, [img, region, vw, vh, shape]);

  // glisser (un doigt / la souris) et pincer (deux doigts)
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const move = (dx: number, dy: number) => {
    const r = region();
    if (!r || !img) return;
    const k = r.sw / vw; // pixels d'image par pixel d'écran
    setCenter({
      x: (r.cx - dx * k) / img.width,
      y: (r.cy - dy * k) / img.height,
    });
  };
  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const p = pts.current.get(e.pointerId);
    if (!p) return;
    const prev = { ...p };
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2 && pinch.current) {
      const [a, b] = [...pts.current.values()];
      setZoom(
        Math.min(
          6,
          Math.max(
            1,
            (pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y)) /
              pinch.current.d,
          ),
        ),
      );
    } else if (pts.current.size === 1)
      move(e.clientX - prev.x, e.clientY - prev.y);
  };
  const onUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
  };
  useEffect(() => {
    const cv = view.current;
    if (!cv) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) =>
        Math.min(6, Math.max(1, z * Math.exp(-e.deltaY * 0.0015))),
      );
    };
    cv.addEventListener("wheel", wheel, { passive: false });
    return () => cv.removeEventListener("wheel", wheel);
  }, [img]);
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const k: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (k[e.key]) {
      e.preventDefault();
      move(...k[e.key]);
    } else if (e.key === "+" || e.key === "=")
      setZoom((z) => Math.min(6, z * 1.1));
    else if (e.key === "-") setZoom((z) => Math.max(1, z / 1.1));
  };

  const apply = async () => {
    const r = region();
    if (!img || !r) return;
    setBusy(true);
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) =>
      out.toBlob(res, "image/jpeg", 0.9),
    );
    setBusy(false);
    if (!blob) return setError("Le recadrage a échoué.");
    onDone(
      new File([blob], `${shape === "disc" ? "disque" : "image"}.jpg`, {
        type: "image/jpeg",
      }),
    );
  };

  const lowRes = img && region() && region()!.sw < width * 0.6;

  return (
    <div
      className="fixed inset-0 z-[260] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="card w-full max-w-[34rem] p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[1.5rem] leading-none">{title}</h2>
          <span className="text-[12.5px] text-muted tabular">
            {width} × {height} px
          </span>
        </div>
        <p className="mt-2 text-[13.5px] text-muted">
          Glissez pour déplacer, pincez ou utilisez la molette pour zoomer.
          L&apos;image garde ses proportions.
        </p>
        <div ref={box} className="mt-4 flex justify-center">
          {error ? (
            <p className="py-16 text-center text-[14px]">{error}</p>
          ) : (
            <canvas
              ref={view}
              tabIndex={0}
              onKeyDown={onKey}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              style={{ width: vw, height: vh }}
              className={`cursor-grab touch-none bg-[var(--surface-2)] active:cursor-grabbing ${shape === "disc" ? "rounded-full" : "rounded-[3px]"}`}
              aria-label="Cadrage de l'image : flèches pour déplacer, + et − pour zoomer"
            />
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn btn-sm !px-3"
            onClick={() => setZoom((z) => Math.max(1, z / 1.2))}
            aria-label="Dézoomer"
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={6}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--accent)]"
            aria-label="Zoom"
          />
          <button
            type="button"
            className="btn btn-sm !px-3"
            onClick={() => setZoom((z) => Math.min(6, z * 1.2))}
            aria-label="Zoomer"
          >
            +
          </button>
          <button
            type="button"
            className="text-[13px] text-muted underline-offset-2 hover:underline"
            onClick={() => (setZoom(1), setCenter({ x: 0.5, y: 0.5 }))}
          >
            Recentrer
          </button>
        </div>
        {lowRes && (
          <p className="mt-2 text-[12.5px] text-muted">
            Zoom élevé : l&apos;image sera moins nette à l&apos;impression.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={apply}
            disabled={!img || busy}
          >
            {busy ? "Préparation…" : "Appliquer"}
          </button>
        </div>
      </div>
    </div>
  );
}
