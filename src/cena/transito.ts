// Trânsito da maquete: carros nas avenidas e caminhões nas rodovias, andando nas duas mãos.
// Tudo determinístico (mesmo quadro = mesma imagem), como o Remotion exige.

import { sorteador } from "../ficha.ts";
import type { Rua, XZ } from "../cidade.ts";

export type Veiculo = { rua: number; pts: XZ[]; acc: number[]; s0: number; sentido: 1 | -1; vel: number; tipo: "carro" | "caminhao"; cor: number };

const MAX = 1400;

export const veiculosNasRuas = (ruas: Rua[], semente = "transito"): Veiculo[] => {
  const rnd = sorteador(semente);
  const saida: Veiculo[] = [];
  ruas.forEach((r, i) => {
    if (r.tipo !== "principal" || r.p.length < 2) return;
    const acc = [0];
    for (let k = 1; k < r.p.length; k++) acc.push(acc[k - 1] + Math.hypot(r.p[k][0] - r.p[k - 1][0], r.p[k][1] - r.p[k - 1][1]));
    const comp = acc[acc.length - 1];
    if (comp < 30) return;
    const passo = r.rodovia ? 38 : 60;
    for (let s = rnd() * passo; s < comp; s += passo * (0.6 + rnd() * 0.8)) {
      if (saida.length >= MAX) return;
      const sentido = rnd() < 0.5 ? 1 : -1;
      const caminhao = !!r.rodovia && rnd() < 0.4;
      saida.push({ rua: i, pts: r.p, acc, s0: s, sentido, vel: caminhao ? 9 + rnd() * 2 : 11 + rnd() * 5, tipo: caminhao ? "caminhao" : "carro", cor: Math.floor(rnd() * 6) });
    }
  });
  return saida;
};

// Posição no instante t (segundos): [x, z, ângulo]. Ao chegar no fim da via, volta para o começo.
export const posicaoVeiculo = (v: Veiculo, t: number): [number, number, number] => {
  const comp = v.acc[v.acc.length - 1];
  let s = (v.s0 + v.sentido * v.vel * t) % comp;
  if (s < 0) s += comp;
  let i = 1;
  while (i < v.acc.length - 1 && v.acc[i] < s) i++;
  const [ax, az] = v.pts[i - 1], [bx, bz] = v.pts[i];
  const l = v.acc[i] - v.acc[i - 1] || 1;
  const k = (s - v.acc[i - 1]) / l;
  const dx = (bx - ax) / l, dz = (bz - az) / l;
  const faixa = (v.tipo === "caminhao" ? 3.2 : 2.6) * v.sentido; // mão direita
  return [ax + (bx - ax) * k - dz * faixa, az + (bz - az) * k + dx * faixa, Math.atan2(dx * v.sentido, dz * v.sentido)];
};
