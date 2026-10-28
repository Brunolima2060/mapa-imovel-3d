// Mapa regional do alcance de caminhão (15/30/60 min): faixas na cor da marca, rodovias, água e cidades.
// Desenhado em SVG (nítido em qualquer tamanho). "progresso" (0..1) faz as faixas crescerem em sequência.

import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { FichaPublica } from "../ficha.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";

type Regiao = { rodovias: { pts: [number, number][] }[]; agua: [number, number][][]; cidades: { nome: string; lat: number; lon: number; classe: string; rank?: number }[] };

export const useRegiao = (): Regiao | null => {
  const [r, setR] = useState<Regiao | null>(null);
  const [h] = useState(() => delayRender("carregando regiao.json", { timeoutInMilliseconds: 60000 }));
  useEffect(() => {
    fetch(staticFile("regiao.json"))
      .then((x) => (x.ok ? x.json() : null))
      .then((d) => { setR(d ?? { rodovias: [], agua: [], cidades: [] }); continueRender(h); })
      .catch((e) => cancelRender(e));
  }, [h]);
  return r;
};

const ALFA = [0.42, 0.26, 0.14]; // 15, 30, 60 min (mais perto = mais forte)

export const MapaAlcance: React.FC<{ ficha: FichaPublica; regiao: Regiao; largura: number; altura: number; progresso?: number; titulo?: boolean }> = ({ ficha, regiao, largura, altura, progresso = 1, titulo = true }) => {
  const faixas = [...(ficha.logistica?.alcance ?? [])].sort((a, b) => a.minutos - b.minutos);
  const c = ficha.centro;
  const kx = Math.cos((c.lat * Math.PI) / 180);
  const maior = faixas[faixas.length - 1]?.poligono ?? [];
  let ext = 0.25;
  for (const [lat, lon] of maior) ext = Math.max(ext, Math.abs(lat - c.lat), Math.abs(lon - c.lon) * kx);
  ext *= 1.12;
  const s = Math.min(largura, altura) / 2 / ext; // px por grau
  const X = (lon: number) => largura / 2 + (lon - c.lon) * kx * s;
  const Y = (lat: number) => altura / 2 - (lat - c.lat) * s;
  const caminho = (pts: [number, number][], fechar = true) => pts.map(([lat, lon], i) => `${i ? "L" : "M"}${X(lon).toFixed(1)},${Y(lat).toFixed(1)}`).join("") + (fechar ? "Z" : "");
  const u = Math.min(largura, altura) / 1080;
  const cor = ficha.marca.cor;
  const dentro = new Set(faixas.flatMap((f) => f.cidades));
  const cidades = regiao.cidades
    .filter((x) => X(x.lon) > 40 * u && X(x.lon) < largura - 40 * u && Y(x.lat) > 40 * u && Y(x.lat) < altura - 40 * u)
    .sort((a, b) => (a.classe === "city" ? 0 : 1) - (b.classe === "city" ? 0 : 1) || (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 22);
  // nomes não podem se encostar: mantém a cidade mais importante e pula a que bateria nela
  const ocupados: [number, number, number, number][] = [[X(c.lon) - 140 * u, Y(c.lat) - 44 * u, X(c.lon) + 140 * u, Y(c.lat) + 16 * u]];
  const visiveis = cidades.filter((x) => {
    const t = (x.classe === "city" ? 22 : 17) * u;
    const r: [number, number, number, number] = [X(x.lon) - 8 * u, Y(x.lat) - t, X(x.lon) + 12 * u + x.nome.length * t * 0.56, Y(x.lat) + 8 * u];
    if (ocupados.some((o) => r[0] < o[2] && o[0] < r[2] && r[1] < o[3] && o[1] < r[3])) return false;
    ocupados.push(r);
    return true;
  }).slice(0, 16);
  // 10 km na escala do mapa
  const px10km = (10 / 111) * s;
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} style={{ position: "absolute", inset: 0, fontFamily: FONTE }}>
      <rect width={largura} height={altura} fill="#EEF0EC" />
      {regiao.agua.map((p, i) => <path key={"a" + i} d={caminho(p)} fill="#C4D8D8" />)}
      {[...faixas].reverse().map((f) => {
        const i = faixas.indexOf(f);
        const k = Math.min(1, Math.max(0, progresso * faixas.length - i));
        if (k <= 0) return null;
        return (
          <g key={f.minutos} opacity={k} transform={`translate(${largura / 2} ${altura / 2}) scale(${0.85 + 0.15 * k}) translate(${-largura / 2} ${-altura / 2})`}>
            <path d={caminho(f.poligono)} fill={cor} fillOpacity={ALFA[i] ?? 0.12} stroke={cor} strokeOpacity={0.9} strokeWidth={2.2 * u} strokeLinejoin="round" />
          </g>
        );
      })}
      {regiao.rodovias.map((r, i) => <path key={"r" + i} d={caminho(r.pts, false)} fill="none" stroke="#9C8E7A" strokeOpacity={0.7} strokeWidth={2.4 * u} strokeLinecap="round" strokeLinejoin="round" />)}
      {visiveis.map((x) => {
        const forte = dentro.has(x.nome);
        return (
          <g key={x.nome} opacity={forte ? 1 : 0.55}>
            <circle cx={X(x.lon)} cy={Y(x.lat)} r={(x.classe === "city" ? 6 : 4) * u} fill={forte ? ESTILO.texto : "#7d8684"} stroke="#fff" strokeWidth={1.6 * u} />
            <text x={X(x.lon) + 9 * u} y={Y(x.lat) + 5 * u} fontSize={(x.classe === "city" ? 22 : 17) * u} fontWeight={forte ? 700 : 500} fill={ESTILO.texto} stroke="#F4F2EE" strokeWidth={4 * u} paintOrder="stroke">{x.nome}</text>
          </g>
        );
      })}
      <g transform={`translate(${largura / 2} ${altura / 2})`}>
        <circle r={13 * u} fill={cor} stroke="#fff" strokeWidth={4 * u} />
        <text y={-22 * u} textAnchor="middle" fontSize={22 * u} fontWeight={700} fill={ESTILO.texto} stroke="#F4F2EE" strokeWidth={5 * u} paintOrder="stroke">{ficha.nome}</text>
      </g>
      {titulo && (
        <g transform={`translate(${36 * u} ${36 * u})`}>
          <rect width={360 * u} height={(70 + faixas.length * 34) * u} rx={16 * u} fill="rgba(252,250,246,0.94)" />
          <text x={20 * u} y={40 * u} fontSize={24 * u} fontWeight={700} fill={ESTILO.texto}>Alcance de caminhão</text>
          {faixas.map((f, i) => (
            <g key={f.minutos} transform={`translate(${20 * u} ${(62 + i * 34) * u})`}>
              <rect width={26 * u} height={18 * u} rx={4 * u} fill={cor} fillOpacity={(ALFA[i] ?? 0.12) + 0.15} stroke={cor} />
              <text x={38 * u} y={15 * u} fontSize={19 * u} fill={ESTILO.texto}>{`${f.minutos} min · ${f.cidades.length} cidade${f.cidades.length === 1 ? "" : "s"}`}</text>
            </g>
          ))}
        </g>
      )}
      <g transform={`translate(${largura - 36 * u - px10km} ${altura - 40 * u})`}>
        <rect x={0} y={-6 * u} width={px10km} height={6 * u} fill={ESTILO.texto} />
        <text x={px10km / 2} y={-14 * u} textAnchor="middle" fontSize={16 * u} fill={ESTILO.texto}>10 km</text>
      </g>
      <text x={36 * u} y={altura - 22 * u} fontSize={14 * u} fill="#6b7472">Tempo de caminhão estimado (Valhalla/OpenStreetMap) · © OpenStreetMap · OpenFreeMap</text>
    </svg>
  );
};

export const MapaAlcanceStill: React.FC<{ ficha: FichaPublica; largura: number; altura: number }> = ({ ficha, largura, altura }) => {
  const r = useRegiao();
  return r ? <MapaAlcance ficha={ficha} regiao={r} largura={largura} altura={altura} /> : null;
};
