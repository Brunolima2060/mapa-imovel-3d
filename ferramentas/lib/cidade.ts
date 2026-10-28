// Monta a maquete em volta do imóvel: relevo (Terrarium/AWS, grátis) + prédios, ruas, água, verde e areia do
// OpenStreetMap. Grava dados/cidade.json na pasta do imóvel (lido pelo vídeo com staticFile).

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { buscar } from "./http.ts";
import { aneisLatLon, baixarLadrilhos } from "./ladrilhos.ts";
import { paraMetros, type LatLon } from "./geo.ts";
import { gerarReserva } from "./reserva.ts";
import { espalharArvores } from "./arvores.ts";
import { alturaEm, type DadosCidade, type Predio, type Rua, type XZ } from "../../src/cidade.ts";


export const RAIO_M = 1500;
const MARGEM = 200;
const PASSO = 15;
const ZOOM = 14;
export const COBERTURA_MINIMA = 900; // prédios reais por km²; abaixo disso entra a reserva

// ── relevo ─────────────────────────────────────────────────────────────────────────────────────
const tileDe = (lat: number, lon: number, z: number) => {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return { x, y };
};

export const decodificarTerrarium = (png: Buffer): Float32Array => {
  const img = PNG.sync.read(png);
  const out = new Float32Array(img.width * img.height);
  for (let i = 0; i < out.length; i++) {
    const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2];
    out[i] = r * 256 + g + b / 256 - 32768;
  }
  return out;
};

const montarRelevo = async (origem: LatLon, cacheDir: string): Promise<DadosCidade["relevo"]> => {
  const R = RAIO_M + MARGEM;
  const W = Math.round((2 * R) / PASSO) + 1;
  const H = W;
  const x0 = -R, z0 = -R;
  const tiles = new Map<string, Float32Array>();
  const amostra = async (lat: number, lon: number) => {
    const t = tileDe(lat, lon, ZOOM);
    const tx = Math.floor(t.x), ty = Math.floor(t.y);
    const k = `${tx}/${ty}`;
    if (!tiles.has(k)) {
      const png = await buscar(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`, { cacheDir, tipo: "binario" });
      tiles.set(k, decodificarTerrarium(png));
    }
    const d = tiles.get(k)!;
    const px = Math.min(255, Math.max(0, (t.x - tx) * 256 - 0.5));
    const py = Math.min(255, Math.max(0, (t.y - ty) * 256 - 0.5));
    const i = Math.min(254, Math.floor(px)), j = Math.min(254, Math.floor(py));
    const u = px - i, v = py - j;
    return (d[j * 256 + i] * (1 - u) + d[j * 256 + i + 1] * u) * (1 - v) + (d[(j + 1) * 256 + i] * (1 - u) + d[(j + 1) * 256 + i + 1] * u) * v;
  };
  const kx = 111320 * Math.cos((origem.lat * Math.PI) / 180);
  const y: number[] = new Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const x = x0 + i * PASSO, z = z0 + j * PASSO;
      y[j * W + i] = +(await amostra(origem.lat - z / 110950, origem.lon + x / kx)).toFixed(1);
    }
  // Relevo relativo: o ponto mais baixo em terra vira ~0 para a maquete não "flutuar" (o mar continua < 0).
  const terra = y.filter((v) => v > 0);
  const base = terra.length ? Math.min(...terra) : 0;
  const temMar = y.some((v) => v < 0);
  return { W, H, passo: PASSO, x0, z0, y: temMar ? y : y.map((v) => +(v - base + 0.5).toFixed(1)) };
};

// ── OpenStreetMap (ladrilhos do OpenFreeMap) ───────────────────────────────────────────────────
const PRINCIPAIS = /^(motorway|trunk|primary|secondary|tertiary)$/;
const VERDE = /^(grass|wood|wetland|farmland|scrub|park|garden|pitch|playground|forest|meadow|cemetery|golf_course)$/;

const arred = (v: number) => Math.round(v * 10) / 10;

export const gerarCidade = async (origem: LatLon, pontos: { id: string; lat: number; lon: number }[], cacheDir: string, semente: string): Promise<DadosCidade> => {
  console.log("  relevo (Terrarium)...");
  const relevo = await montarRelevo(origem, cacheDir);
  console.log("  prédios, ruas, água e verde (OpenStreetMap via OpenFreeMap)...");
  const ladrilhos = await baixarLadrilhos(origem, RAIO_M + MARGEM, cacheDir);
  const m = (p: { lat: number; lon: number }): XZ => { const [x, z] = paraMetros(origem, p); return [arred(x), arred(z)]; };
  const noQuadro = ([x, z]: XZ) => Math.abs(x) <= RAIO_M + MARGEM && Math.abs(z) <= RAIO_M + MARGEM;

  const predios: Predio[] = [];
  const ruas: Rua[] = [];
  const ruasReserva: Rua[] = [];
  const agua: XZ[][] = [];
  const verde: XZ[][] = [];
  const areia: XZ[][] = [];
  let reais = 0;
  for (const l of ladrilhos) {
    for (const [nome, camada] of Object.entries(l.camadas)) {
      for (const f of camada.features) {
        const t = f.tags;
        const aneis = aneisLatLon(l, camada.extent, f.geometry).map((a) => ({ ...a, xz: a.pts.map(m) }));
        if (nome === "building" && f.type === 3) {
          const h = Math.max(3, Number(t.render_height ?? 0) - Number(t.render_min_height ?? 0));
          const min = Number(t.render_min_height ?? 0);
          for (const a of aneis) {
            if (!a.externo || !a.dentro || a.xz.length < 3 || !a.xz.some(noQuadro)) continue;
            if (areaXZ(a.xz) < 15) continue;
            const cx = a.xz.reduce((s, q) => s + q[0], 0) / a.xz.length, cz = a.xz.reduce((s, q) => s + q[1], 0) / a.xz.length;
            predios.push({ p: a.xz, h: arred(h), b: arred(Math.max(0, alturaEm(relevo, cx, cz)) + min) });
            reais++;
          }
        } else if (nome === "transportation" && f.type === 2 && t.brunnel !== "tunnel") {
          const cls = String(t.class);
          for (const a of aneis) {
            if (!a.xz.some(noQuadro)) continue;
            if (PRINCIPAIS.test(cls)) {
              const r: Rua = /^(motorway|trunk)$/.test(cls) ? { p: a.xz, tipo: "principal", rodovia: 1 } : { p: a.xz, tipo: "principal" };
              ruas.push(r);
              ruasReserva.push(r);
            }
            else if (cls === "minor") { ruas.push({ p: a.xz, tipo: "local" }); ruasReserva.push({ p: a.xz, tipo: "local" }); }
            else if (cls === "service") ruas.push({ p: a.xz, tipo: "local" });
          }
        } else if (f.type === 3 && (nome === "water" || nome === "landcover" || nome === "landuse" || nome === "park")) {
          const alvo =
            nome === "water" ? (t.class === "swimming_pool" ? null : agua)
            : t.class === "sand" || t.subclass === "beach" ? areia
            : VERDE.test(String(t.class)) || VERDE.test(String(t.subclass)) || nome === "park" ? verde
            : null;
          if (!alvo) continue;
          for (const a of aneis) if (a.externo && a.xz.some(noQuadro)) alvo.push(a.xz);
        }
      }
    }
  }
  const kmq = (Math.PI * RAIO_M * RAIO_M) / 1e6;
  const cobertura = Math.round(reais / kmq);
  if (cobertura < COBERTURA_MINIMA) {
    const extra = gerarReserva({ ruas: ruasReserva, predios, agua, terra: ([x, z]) => alturaEm(relevo, x, z) >= 0.3, semente });
    for (const q of extra) {
      const [cx, cz] = q.p[0];
      q.b = arred(Math.max(0, alturaEm(relevo, cx, cz)));
    }
    predios.push(...extra);
    console.log(`  poucos prédios no mapa (${cobertura}/km²): +${extra.length} volumes de reserva`);
  }
  console.log("  árvores...");
  const arvores = espalharArvores({ verde, predios, agua, ruas, semente })
    .filter(([x, z]) => alturaEm(relevo, x, z) >= 0.3);
  return {
    origem,
    raioM: RAIO_M,
    arvores,
    relevo,
    predios,
    ruas,
    agua,
    verde,
    areia,
    pontos: pontos.map((p) => { const [x, z] = m(p); return { id: p.id, x, z }; }),
    imovel: { x: 0, z: 0 },
    cobertura,
  };
};

export const salvarCidade = (dados: DadosCidade, pastaDados: string) => {
  fs.mkdirSync(pastaDados, { recursive: true });
  const arq = path.join(pastaDados, "cidade.json");
  fs.writeFileSync(arq, JSON.stringify(dados));
  return arq;
};

const areaXZ = (p: XZ[]) => Math.abs(p.reduce((a, [x, z], k) => { const [x2, z2] = p[(k + 1) % p.length]; return a + x * z2 - x2 * z; }, 0)) / 2;
