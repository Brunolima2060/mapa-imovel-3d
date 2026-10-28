// Alcance logístico: até onde um caminhão chega em 15, 30 e 60 minutos (isócronas do Valhalla do
// openstreetmap.de, grátis e sem chave; o servidor público limita a 60 min) e quais cidades ficam dentro.
// Mapa regional (rodovias, água, cidades) vem dos ladrilhos do OpenFreeMap em zoom 8.

import { buscar } from "./http.ts";
import { baixarLadrilhos, latLonDoTile } from "./ladrilhos.ts";
import { metrosEntre, type LatLon } from "./geo.ts";
import { pontoNoPoligono } from "./reserva.ts";

export const MINUTOS_ALCANCE = [15, 30, 60];

export type Faixa = { minutos: number; poligono: [number, number][] }; // [lat, lon]
export type Cidade = { nome: string; lat: number; lon: number; classe: string; rank?: number };

export const buscarAlcance = async (origem: LatLon, cacheDir: string): Promise<Faixa[]> => {
  const pedido = {
    locations: [{ lat: +origem.lat.toFixed(5), lon: +origem.lon.toFixed(5) }],
    costing: "truck",
    contours: MINUTOS_ALCANCE.map((time) => ({ time })),
    polygons: true,
    generalize: 120,
  };
  const r = await buscar(`https://valhalla1.openstreetmap.de/isochrone?json=${encodeURIComponent(JSON.stringify(pedido))}`, { cacheDir, tempoLimite: 90000 });
  return (r.features ?? [])
    .map((f: any) => {
      const anel = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates.flat(1)[0];
      return { minutos: f.properties.contour, poligono: anel.map(([lon, lat]: [number, number]) => [+lat.toFixed(5), +lon.toFixed(5)] as [number, number]) };
    })
    .sort((a: Faixa, b: Faixa) => a.minutos - b.minutos);
};

const pesoClasse = (c: string) => (c === "city" ? 0 : c === "town" ? 1 : 2);

// Cidades dentro de cada faixa (cumulativo: a de 60 min inclui as de 15). Cidade grande primeiro; no máximo 8.
export const cidadesNoAlcance = (faixas: Faixa[], cidades: Cidade[], maximo = 8) =>
  faixas.map((f) => {
    const pol = f.poligono.map(([lat, lon]) => [lon, lat] as [number, number]);
    const dentro = cidades
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => pontoNoPoligono([c.lon, c.lat], pol))
      .sort((a, b) => pesoClasse(a.c.classe) - pesoClasse(b.c.classe) || (a.c.rank ?? 99) - (b.c.rank ?? 99) || a.i - b.i)
      .map(({ c }) => c.nome);
    return { ...f, cidades: [...new Set(dentro)].slice(0, maximo) };
  });

export type Regiao = {
  rodovias: { ref: string; pts: [number, number][] }[]; // [lat, lon]
  agua: [number, number][][];
  cidades: Cidade[];
};

// Base do mapa regional: rodovias principais, mar/represas e cidades num raio de ~130 km.
export const buscarRegiao = async (origem: LatLon, cacheDir: string): Promise<Regiao> => {
  const rodovias: Regiao["rodovias"] = [];
  const agua: Regiao["agua"] = [];
  const cidades: Cidade[] = [];
  const vistos = new Set<string>();
  for (const l of await baixarLadrilhos(origem, 130000, cacheDir, 8)) {
    const conv = (ext: number) => ([x, y]: [number, number]) => { const p = latLonDoTile(l.x, l.y, x, y, ext, 8); return [+p.lat.toFixed(4), +p.lon.toFixed(4)] as [number, number]; };
    const t = l.camadas.transportation;
    for (const f of t?.features ?? []) {
      if (f.type !== 2 || !/^(motorway|trunk)$/.test(String(f.tags.class))) continue;
      for (const g of f.geometry) rodovias.push({ ref: "", pts: g.map(conv(t.extent)) });
    }
    const w = l.camadas.water;
    for (const f of w?.features ?? []) if (f.type === 3) for (const g of f.geometry) if (g.length > 3) agua.push(g.map(conv(w.extent)));
  }
  // cidades: zoom 9 traz também as cidades médias e pequenas (no 8 só aparecem as grandes)
  for (const l of await baixarLadrilhos(origem, 130000, cacheDir, 9)) {
    const p = l.camadas.place;
    for (const f of p?.features ?? []) {
      if (!/^(city|town)$/.test(String(f.tags.class))) continue;
      const nome = String(f.tags["name:pt"] ?? f.tags.name ?? "");
      if (!nome || vistos.has(nome)) continue;
      vistos.add(nome);
      const q = latLonDoTile(l.x, l.y, f.geometry[0][0][0], f.geometry[0][0][1], p.extent, 9);
      if (metrosEntre(origem, q) > 140000) continue;
      cidades.push({ nome, lat: +q.lat.toFixed(4), lon: +q.lon.toFixed(4), classe: String(f.tags.class), rank: Number(f.tags.rank ?? 99) });
    }
  }
  return { rodovias, agua, cidades };
};
