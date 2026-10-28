// Volumes de reserva: onde o OpenStreetMap quase não tem prédios desenhados (litoral, interior), enche os lados
// das ruas com casinhas baixas para a maquete não ficar com quarteirões vazios. Marcados com r=1.

import { sorteador } from "../../src/ficha.ts";
import type { Predio, Rua, XZ } from "../../src/cidade.ts";

export const pontoNoPoligono = ([x, z]: XZ, pol: XZ[]): boolean => {
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, zi] = pol[i];
    const [xj, zj] = pol[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
  }
  return dentro;
};

const caixa = (pts: XZ[]) => {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { x0, z0, x1, z1 };
};

const distSegmento = ([px, pz]: XZ, [ax, az]: XZ, [bx, bz]: XZ) => {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
};

// Grade espacial simples para consultas de vizinhança.
class Grade<T> {
  private m = new Map<string, T[]>();
  private lado: number;
  constructor(lado: number) { this.lado = lado; }
  private k(i: number, j: number) { return i + "," + j; }
  inserir(x0: number, z0: number, x1: number, z1: number, v: T) {
    for (let i = Math.floor(x0 / this.lado); i <= Math.floor(x1 / this.lado); i++)
      for (let j = Math.floor(z0 / this.lado); j <= Math.floor(z1 / this.lado); j++) {
        const c = this.k(i, j);
        const l = this.m.get(c);
        if (l) l.push(v); else this.m.set(c, [v]);
      }
  }
  perto(x0: number, z0: number, x1: number, z1: number): Set<T> {
    const s = new Set<T>();
    for (let i = Math.floor(x0 / this.lado); i <= Math.floor(x1 / this.lado); i++)
      for (let j = Math.floor(z0 / this.lado); j <= Math.floor(z1 / this.lado); j++) for (const v of this.m.get(this.k(i, j)) ?? []) s.add(v);
    return s;
  }
}

const PASSO = 11; // um lote a cada 11 m de rua
const RECUO = 9; // centro do lote a 9 m do eixo da rua
const FRENTE = 8, FUNDO = 9;
const ESPACO_MIN = 8; // distância mínima entre centros de lotes
const LONGE_DE_RUA = 7; // centro do lote a pelo menos 7 m de qualquer rua

type Entrada = { ruas: Rua[]; predios: Predio[]; agua: XZ[][]; terra: (p: XZ) => boolean; semente: string };

export const gerarReserva = ({ ruas, predios, agua, terra, semente }: Entrada): Predio[] => {
  const rnd = sorteador(semente);
  const gPredios = new Grade<ReturnType<typeof caixa>>(40);
  for (const p of predios) { const c = caixa(p.p); gPredios.inserir(c.x0, c.z0, c.x1, c.z1, c); }
  const gAgua = new Grade<XZ[]>(80);
  for (const a of agua) { const c = caixa(a); gAgua.inserir(c.x0, c.z0, c.x1, c.z1, a); }
  const gRuas = new Grade<[XZ, XZ]>(30);
  for (const r of ruas) for (let i = 0; i < r.p.length - 1; i++) {
    const s: [XZ, XZ] = [r.p[i], r.p[i + 1]];
    const c = caixa(s);
    gRuas.inserir(c.x0, c.z0, c.x1, c.z1, s);
  }
  const gLotes = new Grade<XZ>(ESPACO_MIN);
  const saida: Predio[] = [];

  for (const r of ruas) {
    for (let i = 0; i < r.p.length - 1; i++) {
      const [ax, az] = r.p[i];
      const [bx, bz] = r.p[i + 1];
      const comp = Math.hypot(bx - ax, bz - az);
      if (comp < 1) continue;
      const ux = (bx - ax) / comp, uz = (bz - az) / comp; // ao longo da rua
      const nx = -uz, nz = ux; // normal
      for (let s = PASSO / 2; s < comp; s += PASSO) {
        for (const lado of [1, -1]) {
          const c: XZ = [ax + ux * s + nx * RECUO * lado, az + uz * s + nz * RECUO * lado];
          const f = FRENTE / 2, d = FUNDO / 2;
          const cantos: XZ[] = [[-f, -d], [f, -d], [f, d], [-f, d]].map(([a, b]) => [c[0] + ux * a + nx * b, c[1] + uz * a + nz * b]);
          const cx = caixa(cantos);
          if (!terra(c) || !cantos.every(terra)) continue;
          if ([...gAgua.perto(cx.x0, cx.z0, cx.x1, cx.z1)].some((a) => pontoNoPoligono(c, a) || cantos.some((k) => pontoNoPoligono(k, a)))) continue;
          if ([...gPredios.perto(cx.x0, cx.z0, cx.x1, cx.z1)].some((b) => b.x0 < cx.x1 && b.x1 > cx.x0 && b.z0 < cx.z1 && b.z1 > cx.z0)) continue;
          if ([...gLotes.perto(c[0] - ESPACO_MIN, c[1] - ESPACO_MIN, c[0] + ESPACO_MIN, c[1] + ESPACO_MIN)].some(([x, z]) => Math.hypot(x - c[0], z - c[1]) < ESPACO_MIN)) continue;
          if ([...gRuas.perto(c[0] - LONGE_DE_RUA, c[1] - LONGE_DE_RUA, c[0] + LONGE_DE_RUA, c[1] + LONGE_DE_RUA)].some(([p, q]) => distSegmento(c, p, q) < LONGE_DE_RUA)) continue;
          gLotes.inserir(c[0], c[1], c[0], c[1], c);
          const h = 3 + Math.round(rnd() * 5 * 10) / 10;
          saida.push({ p: cantos.map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)] as XZ), h, b: 0, r: 1 });
        }
      }
    }
  }
  return saida;
};
