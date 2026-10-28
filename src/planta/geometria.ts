// Planta isométrica "desmontável": cômodos -> lista de faces 2D já na ordem do pintor.
// Planta em metros: x para a direita, y para baixo (como no papel). Quem olha está na frente (x e y grandes),
// então de cada caixa aparecem o topo, a face da frente-esquerda (y máximo) e a da frente-direita (x máximo).
// Paredes do fundo inteiras e paredes da frente baixas (corte de maquete), divididas em pedaços de até 1 m para
// a ordem do pintor funcionar com móveis encostados.

import type { Comodo, Movel, Planta } from "../ficha.ts";

export type Tom = "chao" | "topo" | "esq" | "dir";
export type Face = {
  pts: [number, number][];
  tom: Tom;
  cor: string;
  prof: number;
  comodo?: string;
  parte?: "piso" | "parede-fundo" | "parede-frente" | "movel" | "laje" | "doca" | "pilar" | "caminhao" | "patio" | "escritorio" | "divisoria";
  canto?: "fundo" | "frente";
  rotulo?: { x: number; y: number; texto: string; sub: string };
  opacidade?: number;
};

export const ALTURA_PAREDE = 2.6;
export const ALTURA_CORTE = 0.9;
const ESPESSURA = 0.12;
const C = Math.cos(Math.PI / 6), S = 0.5;
export const projetarIso = (x: number, y: number, z: number): [number, number] => [(x - y) * C, (x + y) * S - z];

const PISO: Record<Comodo["tipo"], string> = {
  sala: "#D8B994", quarto: "#D2B08A", cozinha: "#E6E1D7", banheiro: "#DCE3E2", varanda: "#C7A27C", area: "#E2DDD2", outro: "#DDD6CA",
};
const PAREDE = "#F3EFE8";

type Dim = { w: number; d: number; h: number; cor: string };
export const MOVEIS: Record<Movel["tipo"], Dim> = {
  cama: { w: 1.6, d: 2.0, h: 0.55, cor: "#EDE8E0" },
  "cama-solteiro": { w: 0.9, d: 1.9, h: 0.55, cor: "#EDE8E0" },
  sofa: { w: 2.0, d: 0.9, h: 0.8, cor: "#8E9A8C" },
  mesa: { w: 1.2, d: 0.8, h: 0.75, cor: "#A9825E" },
  pia: { w: 1.2, d: 0.6, h: 0.9, cor: "#CFCAC2" },
  fogao: { w: 0.6, d: 0.6, h: 0.9, cor: "#6E7271" },
  geladeira: { w: 0.7, d: 0.7, h: 1.8, cor: "#E9ECEC" },
  vaso: { w: 0.4, d: 0.6, h: 0.42, cor: "#FAFAFA" },
  chuveiro: { w: 0.9, d: 0.9, h: 0.06, cor: "#B9C7C9" },
  tv: { w: 1.4, d: 0.4, h: 0.55, cor: "#4C4F50" },
  armario: { w: 1.6, d: 0.6, h: 2.0, cor: "#B99673" },
  planta: { w: 0.45, d: 0.45, h: 1.0, cor: "#7F9A6E" },
};

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const tonalizar = (c: string, f: number) => "#" + hex(c).map((v) => Math.round(Math.min(255, Math.max(0, f > 1 ? v + (255 - v) * (f - 1) : v * f))).toString(16).padStart(2, "0")).join("");
export const corDoTom = (base: string, tom: Tom) => (tom === "topo" ? tonalizar(base, 1.06) : tom === "esq" ? tonalizar(base, 0.9) : tom === "dir" ? tonalizar(base, 0.76) : base);

export const rotuloArea = (c: Comodo) => `${(c.w * c.h).toFixed(1).replace(".", ",")} m²`;

export type MovelPosto = { tipo: Movel["tipo"]; comodo: string; x: number; y: number; w: number; d: number; h: number; cor: string };

// Coloca os móveis: os com x/y (relativos ao cômodo) ficam onde estão; os outros vão encostados nas paredes
// (fundo, esquerda, direita, frente), sem sobrepor. O que não couber fica de fora.
export const posicionarMoveis = (planta: Planta): MovelPosto[] => {
  const postos: MovelPosto[] = [];
  const livre = (a: { x: number; y: number; w: number; d: number }) =>
    !postos.some((b) => a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.d - 1e-9 && b.y < a.y + a.d - 1e-9);
  for (const m of planta.moveis ?? []) {
    const c = planta.comodos.find((x) => x.nome === m.comodo);
    if (!c) continue;
    const base = MOVEIS[m.tipo];
    const girado = m.giro === 90 || m.giro === 270;
    const dim = { w: girado ? base.d : base.w, d: girado ? base.w : base.d };
    const m0 = ESPESSURA + 0.02;
    const ix0 = c.x + m0, iy0 = c.y + m0, ix1 = c.x + c.w - 0.02, iy1 = c.y + c.h - 0.02;
    if (m.x !== undefined && m.y !== undefined) {
      postos.push({ tipo: m.tipo, comodo: c.nome, x: c.x + m.x, y: c.y + m.y, ...dim, h: base.h, cor: base.cor });
      continue;
    }
    const candidatos: { x: number; y: number; w: number; d: number }[] = [];
    const passo = 0.1;
    const normal = { w: base.w, d: base.d }, deitado = { w: base.d, d: base.w };
    for (let x = ix0; x + normal.w <= ix1 + 1e-9; x += passo) candidatos.push({ x, y: iy0, ...normal }); // fundo
    for (let y = iy0; y + deitado.d <= iy1 + 1e-9; y += passo) candidatos.push({ x: ix0, y, ...deitado }); // esquerda
    for (let y = iy0; y + deitado.d <= iy1 + 1e-9; y += passo) candidatos.push({ x: ix1 - deitado.w, y, ...deitado }); // direita
    for (let x = ix0; x + normal.w <= ix1 + 1e-9; x += passo) candidatos.push({ x, y: iy1 - normal.d, ...normal }); // frente
    for (let y = iy0; y + normal.d <= iy1 + 1e-9; y += passo) for (let x = ix0; x + normal.w <= ix1 + 1e-9; x += passo) candidatos.push({ x, y, ...normal });
    const ok = candidatos.find(livre);
    if (ok) postos.push({ tipo: m.tipo, comodo: c.nome, ...ok, h: base.h, cor: base.cor });
  }
  return postos;
};

export type Caixa = { x: number; y: number; z: number; w: number; d: number; h: number; cor: string; comodo?: string; parte: Face["parte"]; canto?: Face["canto"]; opacidade?: number };

export const facesDaCaixa = (b: Caixa): Face[] => {
  const { x, y, z, w, d, h } = b;
  const P = projetarIso;
  const prof = x + w / 2 + (y + d / 2) + (z + h / 2) * 0.02;
  const meta = { comodo: b.comodo, parte: b.parte, canto: b.canto, prof, opacidade: b.opacidade };
  return [
    { pts: [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], tom: "esq", cor: corDoTom(b.cor, "esq"), ...meta },
    { pts: [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], tom: "dir", cor: corDoTom(b.cor, "dir"), ...meta },
    { pts: [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], tom: "topo", cor: corDoTom(b.cor, "topo"), ...meta },
  ];
};

// Parede ao longo de x ou de y, dividida em pedaços de até 1 m.
const parede = (x: number, y: number, comp: number, aoLongoX: boolean, h: number, base: Omit<Caixa, "x" | "y" | "w" | "d" | "h">): Caixa[] => {
  const n = Math.max(1, Math.ceil(comp / 1));
  return Array.from({ length: n }, (_, i) => {
    const a = (comp / n) * i, l = comp / n;
    return aoLongoX ? { ...base, x: x + a, y, w: l, d: ESPESSURA, h } : { ...base, x, y: y + a, w: ESPESSURA, d: l, h };
  });
};

export const montarPlanta = (planta: Planta, { explosao, laje = true }: { explosao: number; laje?: boolean }): Face[] => {
  const e = Math.min(1, Math.max(0, explosao));
  const cs = planta.comodos;
  const minX = Math.min(...cs.map((c) => c.x)), maxX = Math.max(...cs.map((c) => c.x + c.w));
  const minY = Math.min(...cs.map((c) => c.y)), maxY = Math.max(...cs.map((c) => c.y + c.h));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const desloc = new Map<string, { dx: number; dy: number; dz: number }>();
  for (const c of cs) {
    const vx = c.x + c.w / 2 - cx, vy = c.y + c.h / 2 - cy;
    const l = Math.hypot(vx, vy) || 1;
    desloc.set(c.nome, { dx: (vx / l) * e * 1.2, dy: (vy / l) * e * 1.2, dz: e * 0.35 });
  }
  const pisos: Face[] = [];
  const caixas: Caixa[] = [];
  for (const c of cs) {
    const { dx, dy, dz } = desloc.get(c.nome)!;
    const x = c.x + dx, y = c.y + dy;
    const P = projetarIso;
    const centro = P(x + c.w / 2, y + c.h / 2, dz);
    pisos.push({
      pts: [P(x, y, dz), P(x + c.w, y, dz), P(x + c.w, y + c.h, dz), P(x, y + c.h, dz)],
      tom: "chao", cor: PISO[c.tipo], prof: -1e6 + x + y + c.w / 2 + c.h / 2, comodo: c.nome, parte: "piso",
      rotulo: { x: centro[0], y: centro[1], texto: c.nome, sub: rotuloArea(c) },
    });
    const base = { z: dz, cor: PAREDE, comodo: c.nome };
    caixas.push(...parede(x, y, c.w, true, ALTURA_PAREDE, { ...base, parte: "parede-fundo", canto: "fundo" }));
    caixas.push(...parede(x, y + ESPESSURA, c.h - ESPESSURA, false, ALTURA_PAREDE, { ...base, parte: "parede-fundo", canto: "fundo" }));
    caixas.push(...parede(x, y + c.h - ESPESSURA, c.w, true, ALTURA_CORTE, { ...base, parte: "parede-frente", canto: "frente" }));
    caixas.push(...parede(x + c.w - ESPESSURA, y + ESPESSURA, c.h - 2 * ESPESSURA, false, ALTURA_CORTE, { ...base, parte: "parede-frente", canto: "frente" }));
  }
  for (const m of posicionarMoveis(planta)) {
    const { dx, dy, dz } = desloc.get(m.comodo)!;
    caixas.push({ x: m.x + dx, y: m.y + dy, z: dz, w: m.w, d: m.d, h: m.h, cor: m.cor, comodo: m.comodo, parte: "movel" });
  }
  if (laje && e < 0.98) {
    caixas.push({ x: minX, y: minY, z: ALTURA_PAREDE + e * 3, w: maxX - minX, d: maxY - minY, h: 0.15, cor: "#EEE9E1", parte: "laje", opacidade: 1 - e });
  }
  const faces = caixas.flatMap(facesDaCaixa);
  // a laje é sempre a última (fica por cima de tudo)
  for (const f of faces) if (f.parte === "laje") f.prof = 1e6;
  return [...pisos, ...faces].sort((a, b) => a.prof - b.prof);
};

export const limitesPlanta = (faces: Face[]) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of faces) for (const [x, y] of f.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};
