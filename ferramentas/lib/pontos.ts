// Pontos de interesse em volta do imóvel, direto do OpenStreetMap (Overpass). Uma consulta só por imóvel.

import { buscar, consultarOverpass } from "./http.ts";
import { baixarLadrilhos, latLonDoTile } from "./ladrilhos.ts";
import { metrosEntre, type LatLon } from "./geo.ts";
import type { Ponto, TipoPonto } from "../../src/ficha.ts";

export const PRIORIDADE: TipoPonto[] = [
  "praia", "metro", "mercado", "atracao", "parque", "padaria", "farmacia", "restaurante", "shopping", "hospital",
  "trem", "onibus", "aeroporto", "rodoviaria", "outro",
];
const ATE_DOIS: TipoPonto[] = ["restaurante", "atracao"];
const MAXIMO = 12;
const NO_VIDEO = 5;

type Tags = Record<string, string>;

export const tipoDeTags = (t: Tags): TipoPonto | null => {
  if (t.natural === "beach") return "praia";
  if (t.station === "subway" || (t.railway === "station" && t.subway === "yes")) return "metro";
  if (t.railway === "station" || t.railway === "halt") return "trem";
  if (t.amenity === "bus_station") return /rodovi/i.test(t.name ?? "") ? "rodoviaria" : "onibus";
  if (t.aeroway === "aerodrome") return "aeroporto";
  if (t.shop === "supermarket") return "mercado";
  if (t.shop === "bakery") return "padaria";
  if (t.amenity === "pharmacy") return "farmacia";
  if (t.amenity === "hospital") return "hospital";
  if (t.amenity === "restaurant") return "restaurante";
  if (t.leisure === "park") return "parque";
  if (t.shop === "mall") return "shopping";
  if (t.tourism === "attraction" || t.tourism === "viewpoint" || t.tourism === "museum") return "atracao";
  return null;
};

export const escolherPontos = (candidatos: Ponto[], local: LatLon): Ponto[] => {
  const porTipo = new Map<TipoPonto, Ponto[]>();
  const ordenados = [...candidatos].sort((a, b) => metrosEntre(local, a) - metrosEntre(local, b));
  for (const p of ordenados) {
    const lista = porTipo.get(p.tipo) ?? [];
    if (lista.length < (ATE_DOIS.includes(p.tipo) ? 2 : 1) && !lista.some((q) => q.nome === p.nome)) lista.push(p);
    porTipo.set(p.tipo, lista);
  }
  return PRIORIDADE.flatMap((t) => porTipo.get(t) ?? [])
    .slice(0, MAXIMO)
    .map((p, i) => ({ ...p, noVideo: i < NO_VIDEO }));
};

// Raios por tipo: comércio do dia a dia perto; praia, aeroporto e rodoviária podem ficar longe.
// Raio grande em capital deixa a consulta pesada e o Overpass desiste.
export const consultaOverpass = ({ lat, lon }: LatLon): string => {
  const r = (m: number) => `(around:${m},${lat},${lon})`;
  return `[out:json][timeout:90];(
nwr["natural"="beach"]["name"]${r(6000)};
nwr["aeroway"="aerodrome"]["iata"]${r(15000)};
nwr["amenity"="bus_station"]["name"]${r(6000)};
nwr["station"="subway"]["name"]${r(2000)};
nwr["railway"~"^(station|halt)$"]["name"]${r(2000)};
nwr["shop"~"^(supermarket|bakery)$"]["name"]${r(1200)};
nwr["shop"="mall"]["name"]${r(2500)};
nwr["amenity"~"^(pharmacy|restaurant)$"]["name"]${r(800)};
nwr["amenity"="hospital"]["name"]${r(3000)};
nwr["leisure"="park"]["name"]${r(2000)};
nwr["tourism"~"^(attraction|viewpoint|museum)$"]["name"]${r(2000)};
);out center tags;`;
};

export const buscarPontos = async (local: LatLon, cacheDir: string): Promise<Ponto[]> => {
  let r: any;
  try {
    r = await consultarOverpass(consultaOverpass(local), cacheDir);
  } catch {
    console.log("  (Overpass fora do ar: usando os pontos do OpenFreeMap; nomes de praia podem faltar)");
    return pontosDeLadrilhos(local, cacheDir);
  }
  const candidatos: Ponto[] = [];
  for (const e of r.elements ?? []) {
    const t: Tags = e.tags ?? {};
    const tipo = tipoDeTags(t);
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (!tipo || !t.name || lat === undefined) continue;
    candidatos.push({ id: `${e.type[0]}${e.id}`, nome: t.name, tipo, lat, lon, noVideo: false });
  }
  return escolherPontos(candidatos, local);
};

// Tradução das classes do OpenFreeMap (esquema OpenMapTiles) para os tipos da ficha.
export const tipoDePoi = (t: Record<string, unknown>): TipoPonto | null => {
  const c = String(t.class ?? ""), s = String(t.subclass ?? ""), nome = String(t.name ?? "");
  if (s === "beach") return "praia";
  if (c === "railway") return s === "subway" ? "metro" : s === "station" || s === "halt" ? "trem" : null;
  if (s === "bus_station") return /rodovi/i.test(nome) ? "rodoviaria" : "onibus";
  if (s === "supermarket") return "mercado";
  if (s === "bakery") return "padaria";
  if (s === "pharmacy") return "farmacia";
  if (s === "hospital") return "hospital";
  if (s === "restaurant") return "restaurante";
  if (c === "park" && s === "park") return "parque";
  if (s === "mall") return "shopping";
  if (c === "attraction" || c === "museum" || s === "viewpoint") return "atracao";
  return null;
};

// Reserva quando o Overpass está fora do ar: pontos tirados dos ladrilhos do OpenFreeMap.
export const pontosDeLadrilhos = async (local: LatLon, cacheDir: string): Promise<Ponto[]> => {
  const ladrilhos = await baixarLadrilhos(local, 2000, cacheDir);
  const candidatos: Ponto[] = [];
  for (const l of ladrilhos) {
    const poi = l.camadas.poi;
    if (!poi) continue;
    for (const f of poi.features) {
      const tipo = tipoDePoi(f.tags);
      const nome = f.tags["name:pt"] ?? f.tags.name;
      if (!tipo || !nome || f.type !== 1) continue;
      const [px, py] = f.geometry[0][0];
      const p = latLonDoTile(l.x, l.y, px, py, poi.extent);
      if (metrosEntre(local, p) > (tipo === "praia" ? 6000 : 2500)) continue;
      candidatos.push({ id: `t${f.id ?? candidatos.length}`, nome: String(nome), tipo, lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), noVideo: false });
    }
  }
  candidatos.push(...(await praiasPeloNominatim(local, cacheDir)));
  return escolherPontos(candidatos, local);
};

// Os ladrilhos têm a areia da praia, mas sem nome: o nome vem do Nominatim (busca "praia" perto do imóvel).
export const praiasPeloNominatim = async (local: LatLon, cacheDir: string): Promise<Ponto[]> => {
  const d = 0.05; // ~5 km
  const vb = `${local.lon - d},${local.lat + d},${local.lon + d},${local.lat - d}`;
  try {
    const r = await buscar(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&bounded=1&viewbox=${vb}&q=praia`, { cacheDir });
    return (Array.isArray(r) ? r : [])
      .filter((e: any) => e.type === "beach" || /^praia/i.test(e.name ?? ""))
      .map((e: any) => ({ id: `n${e.osm_id}`, nome: e.name, tipo: "praia" as const, lat: +(+e.lat).toFixed(6), lon: +(+e.lon).toFixed(6), noVideo: false }));
  } catch {
    return [];
  }
};
