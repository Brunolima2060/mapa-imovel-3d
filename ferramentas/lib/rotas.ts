// Distância e tempo reais pelas ruas (OSRM do openstreetmap.de, perfis a pé e de carro). Grátis, sem chave.

import { buscar } from "./http.ts";
import { deMetros, metrosEntre, type LatLon } from "./geo.ts";
import type { Ponto, Trecho } from "../../src/ficha.ts";
import { minutosDe } from "../../src/tempo.ts";

const BASE = "https://routing.openstreetmap.de";
type Perfil = "foot" | "car";

const par = (a: LatLon, b: LatLon) => `${a.lon.toFixed(6)},${a.lat.toFixed(6)};${b.lon.toFixed(6)},${b.lat.toFixed(6)}`;

export const trecho = async (a: LatLon, b: LatLon, perfil: Perfil, cacheDir: string): Promise<Trecho | undefined> => {
  const r = await buscar(`${BASE}/routed-${perfil}/route/v1/driving/${par(a, b)}?overview=false`, { cacheDir, aceitarStatus: [400] });
  const rota = r.code === "Ok" ? r.routes?.[0] : undefined;
  if (!rota) return undefined;
  return { metros: Math.round(rota.distance), minutos: minutosDe(rota.duration) };
};

export const rotaCompleta = async (a: LatLon, b: LatLon, cacheDir: string) => {
  const r = await buscar(`${BASE}/routed-car/route/v1/driving/${par(a, b)}?overview=full&geometries=geojson&steps=true`, { cacheDir, aceitarStatus: [400] });
  const rota = r.code === "Ok" ? r.routes?.[0] : undefined;
  if (!rota) throw new Error("Não achei caminho de carro entre a origem e o imóvel.");
  return {
    pontos: rota.geometry.coordinates.map(([lon, lat]: [number, number]) => [+lat.toFixed(6), +lon.toFixed(6)] as [number, number]),
    metros: Math.round(rota.distance),
    minutos: minutosDe(rota.duration),
    passos: rota.legs[0].steps.map((s: any) => ({ via: s.name as string, metros: Math.round(s.distance), manobra: `${s.maneuver.type}${s.maneuver.modifier ? " " + s.maneuver.modifier : ""}` })),
  };
};

export const calcularTrechos = async (local: LatLon, pontos: Ponto[], cacheDir: string, somenteCarro = false): Promise<Ponto[]> => {
  const saida: Ponto[] = [];
  for (const p of pontos) {
    let ape = somenteCarro ? undefined : await trecho(local, p, "foot", cacheDir);
    const reta = metrosEntre(local, p);
    if (ape && trechoSuspeito(reta, ape)) {
      const DESVIO = 30;
      const saidas = [[DESVIO, 0], [-DESVIO, 0], [0, DESVIO], [0, -DESVIO]].map(([x, z]) => deMetros(local, [x, z]));
      const alternativas = [];
      for (const s of saidas) alternativas.push(await trecho(s, p, "foot", cacheDir));
      ape = melhorTrecho(ape, alternativas, DESVIO, reta);
    }
    const carro = await trecho(local, p, "car", cacheDir);
    saida.push({ ...p, ...(ape ? { ape } : {}), ...(carro ? { carro } : {}) });
  }
  return saida;
};

// A porta pode "grudar" na rua errada (túnel embaixo do prédio, via interna) e a rota sai enorme.
// Rota mais de 2,2x maior que a reta, para ponto a menos de 800 m, é suspeita.
export const trechoSuspeito = (retaM: number, t: Trecho | undefined) => !!t && retaM < 800 && t.metros > 2.2 * Math.max(retaM, 60);

// Fica com a menor rota alternativa (saindo a alguns metros da porta) e soma esse desvio de volta.
export const melhorTrecho = (original: Trecho, alternativas: (Trecho | undefined)[], desvioM: number, retaM: number): Trecho => {
  const validas = alternativas.filter((t): t is Trecho => !!t).sort((a, b) => a.metros - b.metros);
  const m = validas[0];
  if (!m || m.metros + desvioM >= original.metros) return original;
  const metros = Math.max(Math.round(retaM), m.metros + desvioM);
  return { metros, minutos: Math.max(1, Math.ceil((m.minutos * metros) / Math.max(1, m.metros))) };
};
