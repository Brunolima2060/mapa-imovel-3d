// Trajeto do guia de chegada: recorte do fim da rota dentro da maquete e câmera que segue o caminho.

import type { Quadro } from "./camera.ts";

export type XZ = [number, number];

// Fica só com o fim da rota (os últimos `alcanceM` metros em linha reta até o destino em 0,0).
export const recorteFinal = (pts: XZ[], alcanceM = 1300): XZ[] => {
  let i = pts.length - 1;
  while (i > 0 && Math.hypot(pts[i - 1][0], pts[i - 1][1]) <= alcanceM) i--;
  return pts.slice(i);
};

const comprimentos = (pts: XZ[]) => {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return acc;
};

export const pontoEm = (pts: XZ[], t: number): XZ => {
  const acc = comprimentos(pts);
  const alvo = Math.min(1, Math.max(0, t)) * acc[acc.length - 1];
  let i = 1;
  while (i < acc.length - 1 && acc[i] < alvo) i++;
  const k = (alvo - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]);
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
};

// Câmera de perseguição: atrás e acima do ponto, olhando para frente no caminho; rumo suavizado.
export const cameraNoTrajeto = (pts: XZ[], t: number, vertical: boolean): Quadro => {
  const aqui = pontoEm(pts, t);
  const frente = pontoEm(pts, Math.min(1, t + 0.12));
  const tras = pontoEm(pts, Math.max(0, t - 0.12));
  let dx = frente[0] - tras[0], dz = frente[1] - tras[1];
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  const dist = vertical ? 520 : 440;
  const elev = (48 * Math.PI) / 180;
  const h = Math.cos(elev) * dist;
  const adiante = 60 * (1 - t); // olha um pouco à frente; no fim, para na porta
  const alvo: [number, number, number] = [aqui[0] + dx * adiante, 0, aqui[1] + dz * adiante];
  return { pos: [alvo[0] - dx * h, Math.sin(elev) * dist, alvo[2] - dz * h], alvo, fov: vertical ? 50 : 38 };
};
