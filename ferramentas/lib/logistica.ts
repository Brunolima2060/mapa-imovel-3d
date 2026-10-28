// Pontos para galpões: acesso às rodovias mais próximas, aeroporto e centro da cidade.
// Fonte: ladrilhos do OpenFreeMap (nomes e códigos das vias: camada transportation_name; aeroportos; cidades).

import { baixarLadrilhos, latLonDoTile } from "./ladrilhos.ts";
import { deMetros, metrosEntre, paraMetros, type LatLon } from "./geo.ts";
import type { Ponto } from "../../src/ficha.ts";
import { trecho } from "./rotas.ts";
import { buscar } from "./http.ts";

type Linha = { ref: string; name: string; classe: string; pts: LatLon[] };

const REF_RODOVIA = /^(BR|SP|RJ|MG|PR|SC|RS|BA|PE|CE|GO|MT|MS|ES|PA|AM|DF|PB|RN|AL|SE|PI|MA|TO|RO|AC|AP|RR)-\d+/i;

// Ponto da linha mais perto do galpão (projeção nos segmentos, em metros locais).
const maisPerto = (local: LatLon, pts: LatLon[]): LatLon => {
  let melhor: [number, number] = [Infinity, Infinity];
  let dMin = Infinity;
  const xz = pts.map((p) => paraMetros(local, p));
  for (let i = 0; i < xz.length - 1; i++) {
    const [ax, az] = xz[i], [bx, bz] = xz[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, -(ax * dx + az * dz) / (dx * dx + dz * dz || 1e-9)));
    const q: [number, number] = [ax + t * dx, az + t * dz];
    const d = Math.hypot(q[0], q[1]);
    if (d < dMin) { dMin = d; melhor = q; }
  }
  if (xz.length === 1) melhor = xz[0];
  return deMetros(local, melhor);
};

export const rodoviasDeLinhas = (linhas: Linha[], local: LatLon, maximo = 3): Ponto[] => {
  const porRef = new Map<string, { p: LatLon; d: number; name: string }>();
  for (const l of linhas) {
    const ref = l.ref.split(";")[0].trim().toUpperCase();
    if (!REF_RODOVIA.test(ref) || l.pts.length === 0) continue;
    const p = maisPerto(local, l.pts);
    const d = metrosEntre(local, p);
    const atual = porRef.get(ref);
    if (!atual || d < atual.d) porRef.set(ref, { p, d, name: l.name || atual?.name || "" });
  }
  return [...porRef.entries()]
    .sort((a, b) => a[1].d - b[1].d)
    .slice(0, maximo)
    .map(([ref, v]) => ({
      id: `rod-${ref.toLowerCase()}`,
      nome: v.name && !v.name.toUpperCase().startsWith(ref) ? `${ref} · ${v.name}` : ref,
      tipo: "rodovia" as const,
      lat: +v.p.lat.toFixed(6),
      lon: +v.p.lon.toFixed(6),
      noVideo: true,
    }));
};

// O ponto da pista mais perto do galpão nem sempre tem entrada: separa até 6 pontos da mesma rodovia (a pelo menos
// 800 m um do outro, os mais perto primeiro) para testar a rota de carro até cada um.
export const candidatosAcesso = (linhas: Linha[], ref: string, local: LatLon, maximo = 6): LatLon[] => {
  const vertices = linhas
    .filter((l) => l.ref.split(";")[0].trim().toUpperCase() === ref)
    .flatMap((l) => l.pts)
    .map((p) => ({ p, d: metrosEntre(local, p) }))
    .sort((a, b) => a.d - b.d);
  const escolhidos: LatLon[] = [];
  const limite = (vertices[0]?.d ?? 0) * 2 + 3000;
  for (const v of vertices) {
    if (v.d > limite || escolhidos.length >= maximo) break;
    if (escolhidos.every((q) => metrosEntre(q, v.p) >= 800)) escolhidos.push(v.p);
  }
  return escolhidos;
};

export const buscarPontosLogisticos = async (local: LatLon, cacheDir: string): Promise<Ponto[]> => {
  // rodovias num raio de ~15 km (zoom 12: poucos ladrilhos, com nome e código das vias)
  const linhas: Linha[] = [];
  for (const l of await baixarLadrilhos(local, 15000, cacheDir, 12)) {
    const c = l.camadas.transportation_name;
    if (!c) continue;
    for (const f of c.features) {
      if (f.type !== 2 || !/^(motorway|trunk|primary)$/.test(String(f.tags.class))) continue;
      const ref = String(f.tags.ref ?? "");
      if (!ref) continue;
      for (const g of f.geometry) linhas.push({ ref, name: String(f.tags["name:pt"] ?? f.tags.name ?? ""), classe: String(f.tags.class), pts: g.map(([x, y]) => latLonDoTile(l.x, l.y, x, y, c.extent, 12)) });
    }
  }
  const pontos: Ponto[] = [];
  for (const r of rodoviasDeLinhas(linhas, local)) {
    const ref = r.id.replace(/^rod-/, "").toUpperCase();
    let melhor: { p: LatLon; m: number } | undefined;
    for (const c of candidatosAcesso(linhas, ref, local)) {
      const t = await trecho(local, c, "car", cacheDir);
      if (t && (!melhor || t.metros < melhor.m)) melhor = { p: c, m: t.metros };
    }
    pontos.push(melhor ? { ...r, lat: +melhor.p.lat.toFixed(6), lon: +melhor.p.lon.toFixed(6) } : r);
  }
  // aeroporto (com código IATA) e centro da cidade, num raio maior (zoom 9)
  let aero: Ponto | undefined, centro: Ponto | undefined;
  for (const l of await baixarLadrilhos(local, 70000, cacheDir, 9)) {
    for (const f of l.camadas.aerodrome_label?.features ?? []) {
      if (!f.tags.iata) continue;
      const [x, y] = f.geometry[0][0];
      const p = latLonDoTile(l.x, l.y, x, y, l.camadas.aerodrome_label.extent, 9);
      if (!aero || metrosEntre(local, p) < metrosEntre(local, aero)) aero = { id: `aero-${f.tags.iata}`, nome: `${/^aeroporto/i.test(String(f.tags["name:pt"] ?? f.tags.name)) ? "" : "Aeroporto "}${String(f.tags["name:pt"] ?? f.tags.name)} (${f.tags.iata})`, tipo: "aeroporto", lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), noVideo: true };
    }
    for (const f of l.camadas.place?.features ?? []) {
      if (!/^(city|town)$/.test(String(f.tags.class))) continue;
      const [x, y] = f.geometry[0][0];
      const p = latLonDoTile(l.x, l.y, x, y, l.camadas.place.extent, 9);
      if (metrosEntre(local, p) < 800) continue; // o galpão já está no centro: não vale como ponto
      if (!centro || metrosEntre(local, p) < metrosEntre(local, centro)) centro = { id: "centro", nome: `Centro de ${String(f.tags["name:pt"] ?? f.tags.name)}`, tipo: "centro", lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), noVideo: true };
    }
  }
  return [...pontos, ...(aero ? [aero] : []), ...(centro ? [centro] : [])];
};

// Principais portos e aeroportos de carga do Brasil (posições aproximadas, públicas).
const PORTOS: [string, number, number][] = [
  ["Porto de Santos", -23.98, -46.3], ["Porto de São Sebastião", -23.8, -45.4], ["Porto de Paranaguá", -25.5, -48.52],
  ["Porto de Itapoá", -26.12, -48.61], ["Porto de São Francisco do Sul", -26.24, -48.64], ["Porto de Itajaí", -26.9, -48.66],
  ["Porto de Imbituba", -28.23, -48.65], ["Porto de Rio Grande", -32.07, -52.08], ["Porto do Rio de Janeiro", -22.89, -43.2],
  ["Porto de Itaguaí", -22.93, -43.84], ["Porto de Vitória", -20.32, -40.33], ["Porto de Salvador", -12.96, -38.51],
  ["Porto de Suape", -8.39, -34.96], ["Porto do Pecém", -3.54, -38.81], ["Porto do Itaqui", -2.57, -44.37],
  ["Porto de Vila do Conde", -1.54, -48.75], ["Porto de Manaus", -3.14, -60.02],
];
const AEROPORTOS_CARGA: [string, number, number][] = [
  ["Aeroporto de Guarulhos (GRU)", -23.4356, -46.4731], ["Aeroporto de Viracopos (VCP)", -23.0074, -47.1345],
  ["Aeroporto do Galeão (GIG)", -22.81, -43.2506], ["Aeroporto de Confins (CNF)", -19.6244, -43.9719],
  ["Aeroporto de Curitiba (CWB)", -25.5285, -49.1758], ["Aeroporto de Porto Alegre (POA)", -29.9944, -51.1714],
  ["Aeroporto de Recife (REC)", -8.1265, -34.9236], ["Aeroporto de Salvador (SSA)", -12.9086, -38.3225],
  ["Aeroporto de Manaus (MAO)", -3.0386, -60.0497], ["Aeroporto de Fortaleza (FOR)", -3.7763, -38.5326],
  ["Aeroporto de Brasília (BSB)", -15.8697, -47.9208], ["Aeroporto de Vitória (VIX)", -20.2581, -40.2864],
  ["Aeroporto de Florianópolis (FLN)", -27.6703, -48.5525], ["Aeroporto de Navegantes (NVT)", -26.88, -48.6514],
  ["Aeroporto de Belém (BEL)", -1.3792, -48.4763],
];

const maisPertoDaLista = (lista: [string, number, number][], local: LatLon, tipo: Ponto["tipo"], limiteM: number, quantos: number): Ponto[] =>
  lista
    .map(([nome, lat, lon]) => ({ nome, lat, lon, d: metrosEntre(local, { lat, lon }) }))
    .filter((p) => p.d <= limiteM)
    .sort((a, b) => a.d - b.d)
    .slice(0, quantos)
    .map((p) => ({ id: `${tipo}-${p.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, nome: p.nome, tipo, lat: p.lat, lon: p.lon, noVideo: false }));

export const portosProximos = (local: LatLon) => maisPertoDaLista(PORTOS, local, "porto", 500000, 2);
export const aeroportoDeCarga = (local: LatLon) => maisPertoDaLista(AEROPORTOS_CARGA, local, "aeroporto", 400000, 1);

// Resultados de busca (Nominatim) → vizinhos logísticos: até 6, sem nome repetido, nem o próprio terreno (< 150 m),
// nem longe demais (> 12 km), do mais perto para o mais longe.
export const vizinhosDeResultados = (res: { name?: string; display_name?: string; lat: string; lon: string }[], local: LatLon) => {
  const vistos = new Set<string>();
  return res
    .map((r) => ({ nome: (r.name || r.display_name?.split(",")[0] || "").trim(), lat: +(+r.lat).toFixed(6), lon: +(+r.lon).toFixed(6) }))
    .map((r) => ({ ...r, metros: Math.round(metrosEntre(local, r)) }))
    .filter((r) => r.nome && r.metros >= 150 && r.metros <= 12000 && !/garagem|estacionamento|posto|oficina|borracharia/i.test(r.nome))
    .sort((a, b) => a.metros - b.metros)
    .filter((r) => (vistos.has(r.nome.toLowerCase()) ? false : (vistos.add(r.nome.toLowerCase()), true)))
    .slice(0, 6);
};

const TERMOS_VIZINHOS = ["centro de distribuição", "condomínio logístico", "parque logístico", "Mercado Livre", "Amazon", "Magazine Luiza", "DHL", "FedEx", "Correios centro de tratamento", "transportadora"];

export const buscarVizinhos = async (local: LatLon, cacheDir: string) => {
  const d = 0.11; // ~12 km
  const vb = `${local.lon - d},${local.lat + d},${local.lon + d},${local.lat - d}`;
  const todos: { name?: string; display_name?: string; lat: string; lon: string }[] = [];
  for (const termo of TERMOS_VIZINHOS) {
    try {
      const r = await buscar(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&bounded=1&viewbox=${vb}&q=${encodeURIComponent(termo)}`, { cacheDir });
      if (Array.isArray(r)) todos.push(...r);
    } catch {
      // um termo sem resposta não derruba os outros
    }
  }
  return vizinhosDeResultados(todos, local);
};

export const buscarCeasa = async (local: LatLon, cacheDir: string): Promise<Ponto[]> => {
  const d = 0.6; // ~60 km
  const vb = `${local.lon - d},${local.lat + d},${local.lon + d},${local.lat - d}`;
  try {
    const r = await buscar(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&bounded=1&viewbox=${vb}&q=CEASA`, { cacheDir });
    const c = (Array.isArray(r) ? r : []).sort((a: any, b: any) => metrosEntre(local, { lat: +a.lat, lon: +a.lon }) - metrosEntre(local, { lat: +b.lat, lon: +b.lon }))[0];
    return c ? [{ id: "carga-ceasa", nome: (c.name || "CEASA").replace(/^ceasa$/i, "CEASA"), tipo: "carga", lat: +(+c.lat).toFixed(6), lon: +(+c.lon).toFixed(6), noVideo: false }] : [];
  } catch {
    return [];
  }
};
