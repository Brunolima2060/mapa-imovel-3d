// Ladrilhos vetoriais do OpenFreeMap (dados do OpenStreetMap, servidos por CDN, grátis e sem chave).
// Zoom 14: prédios com altura, ruas, água, verde, areia e pontos de interesse.

import { buscar } from "./http.ts";
import { lerTile, type Camada } from "./mvt.ts";
import type { LatLon } from "./geo.ts";

export const ZOOM_TILE = 14;

export const tileDe = (p: LatLon, z = ZOOM_TILE) => {
  const n = 2 ** z;
  const r = (p.lat * Math.PI) / 180;
  return { x: ((p.lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n };
};

export const latLonDoTile = (tx: number, ty: number, px: number, py: number, extent: number, z = ZOOM_TILE): LatLon => {
  const n = 2 ** z;
  const x = tx + px / extent, y = ty + py / extent;
  return { lon: (x / n) * 360 - 180, lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI };
};

export const tilesNoRaio = (centro: LatLon, raioM: number, z = ZOOM_TILE) => {
  const dLat = raioM / 110950;
  const dLon = raioM / (111320 * Math.cos((centro.lat * Math.PI) / 180));
  const a = tileDe({ lat: centro.lat + dLat, lon: centro.lon - dLon }, z);
  const b = tileDe({ lat: centro.lat - dLat, lon: centro.lon + dLon }, z);
  const lista: { x: number; y: number }[] = [];
  for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) for (let y = Math.floor(a.y); y <= Math.floor(b.y); y++) lista.push({ x, y });
  return lista;
};

// O endereço dos ladrilhos muda a cada versão do mapa: o TileJSON é guardado por dia.
const modeloUrl = async (cacheDir: string): Promise<string> => {
  const dia = new Date().toISOString().slice(0, 10);
  const tj = await buscar(`https://tiles.openfreemap.org/planet?dia=${dia}`, { cacheDir });
  return tj.tiles[0];
};

export type Ladrilho = { x: number; y: number; camadas: Record<string, Camada> };

export const baixarLadrilhos = async (centro: LatLon, raioM: number, cacheDir: string, z = ZOOM_TILE): Promise<Ladrilho[]> => {
  const modelo = await modeloUrl(cacheDir);
  const saida: Ladrilho[] = [];
  for (const t of tilesNoRaio(centro, raioM, z)) {
    const url = modelo.replace("{z}", String(z)).replace("{x}", String(t.x)).replace("{y}", String(t.y));
    const b = await buscar(url, { cacheDir, tipo: "binario" });
    saida.push({ ...t, camadas: lerTile(b) });
  }
  return saida;
};

// Converte cada anel/linha de uma feição para lat/lon. "dentro" diz se o centro do anel cai no próprio ladrilho
// (os ladrilhos repetem um pouco da vizinhança na borda; assim nada sai em dobro).
export const aneisLatLon = (l: Ladrilho, extent: number, geo: [number, number][][]) =>
  geo.map((anel) => {
    const cx = anel.reduce((a, p) => a + p[0], 0) / anel.length, cy = anel.reduce((a, p) => a + p[1], 0) / anel.length;
    const area = anel.reduce((a, p, i) => { const q = anel[(i + 1) % anel.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
    return {
      pts: anel.map(([px, py]) => latLonDoTile(l.x, l.y, px, py, extent)),
      dentro: cx >= 0 && cx < extent && cy >= 0 && cy < extent,
      externo: area > 0, // MVT: anel externo tem área positiva (y para baixo)
    };
  });
