// Pontos para galpões: acesso às rodovias mais próximas, aeroporto e centro da cidade.
// Fonte: ladrilhos do OpenFreeMap (nomes e códigos das vias: camada transportation_name; aeroportos; cidades).

import { baixarLadrilhos, latLonDoTile } from "./ladrilhos.ts";
import { deMetros, metrosEntre, paraMetros, type LatLon } from "./geo.ts";
import type { Ponto } from "../../src/ficha.ts";
import { trecho } from "./rotas.ts";

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
