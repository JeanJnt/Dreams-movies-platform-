import { geoCentroid, geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world110 from "world-atlas/countries-110m.json";
import world50 from "world-atlas/countries-50m.json";

/*
 * La carte du monde des statistiques, calculée côté serveur : les tracés SVG des pays (Natural Earth 1:110m)
 * et, pour les petits pays absents à cette échelle (Hong Kong, Malte, Singapour…), un point à leur centre.
 * Les noms de pays des films (TMDB, en anglais) sont rapprochés des noms de la carte.
 */
export const MAP_W = 960;
export const MAP_H = 470;

// Noms TMDB → noms de la carte (pays disparus rattachés à leur successeur principal)
const ALIASES: Record<string, string> = {
  "Soviet Union": "Russia",
  Czechoslovakia: "Czechia",
  "Palestinian Territory": "Palestine",
  "Serbia and Montenegro": "Serbia",
  Yugoslavia: "Serbia",
  "East Germany": "Germany",
  "West Germany": "Germany",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Dominican Republic": "Dominican Rep.",
  "Central African Republic": "Central African Rep.",
  "Congo, The Democratic Republic of the": "Dem. Rep. Congo",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Ivory Coast": "Côte d'Ivoire",
  "Cote D'Ivoire": "Côte d'Ivoire",
  "North Macedonia": "Macedonia",
  "Czech Republic": "Czechia",
  "Lao People's Democratic Republic": "Laos",
};
// Territoires absents des deux échelles : coordonnées [longitude, latitude]
const POINTS: Record<string, [number, number]> = {
  "French Polynesia": [-149.4, -17.6],
  Guadaloupe: [-61.55, 16.25],
  Guadeloupe: [-61.55, 16.25],
  Martinique: [-61.0, 14.65],
  "Netherlands Antilles": [-68.95, 12.17],
  Reunion: [55.5, -21.1],
};

type Shapes = { paths: Map<string, string>; small: Map<string, [number, number]>; outline: string };
let cache: Shapes | null = null;

function countries(topo: unknown) {
  const t = topo as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  return (feature(t, t.objects.countries) as FeatureCollection<Geometry, { name: string }>).features;
}

function shapes(): Shapes {
  if (cache) return cache;
  const big = countries(world110).filter((f) => f.properties.name !== "Antarctica");
  const projection = geoEqualEarth().fitExtent(
    [
      [4, 4],
      [MAP_W - 4, MAP_H - 4],
    ],
    { type: "FeatureCollection", features: big } as FeatureCollection,
  );
  const path = geoPath(projection).digits(1);
  const paths = new Map<string, string>();
  for (const f of big) paths.set(f.properties.name, path(f as Feature) ?? "");
  const small = new Map<string, [number, number]>();
  for (const f of countries(world50)) {
    if (paths.has(f.properties.name)) continue;
    const p = projection(geoCentroid(f as Feature));
    if (p) small.set(f.properties.name, [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
  }
  for (const [name, ll] of Object.entries(POINTS)) {
    const p = projection(ll);
    if (p) small.set(name, [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
  }
  cache = { paths, small, outline: path({ type: "Sphere" }) ?? "" };
  return cache;
}

export type MapCountry = { key: string; label: string; value: number; avg: number | null };
export type WorldMapData = {
  width: number;
  height: number;
  outline: string;
  shapes: { name: string; d: string; key: string | null }[];
  dots: { key: string; x: number; y: number }[];
  data: MapCountry[];
};

// Prépare la carte pour une liste de pays (nom TMDB, libellé français, nombre de films)
export function worldMap(data: MapCountry[]): WorldMapData {
  const s = shapes();
  const byShape = new Map<string, string>(); // nom sur la carte → clé de la donnée (le pays le plus vu l'emporte)
  const dots: WorldMapData["dots"] = [];
  for (const c of [...data].sort((a, b) => b.value - a.value)) {
    const name = ALIASES[c.key] ?? c.key;
    if (s.paths.has(name)) {
      if (!byShape.has(name)) byShape.set(name, c.key);
    } else {
      const p = s.small.get(name);
      if (p) dots.push({ key: c.key, x: p[0], y: p[1] });
    }
  }
  // les pays disparus et leur successeur partagent la même forme : on additionne leurs films
  const merged = new Map<string, MapCountry>(data.map((c) => [c.key, { ...c }]));
  for (const c of data) {
    const owner = byShape.get(ALIASES[c.key] ?? c.key);
    if (owner && owner !== c.key) {
      const o = merged.get(owner)!;
      o.value += c.value;
    }
  }
  return {
    width: MAP_W,
    height: MAP_H,
    outline: s.outline,
    shapes: [...s.paths].map(([name, d]) => ({ name, d, key: byShape.get(name) ?? null })),
    dots,
    data: [...merged.values()],
  };
}
