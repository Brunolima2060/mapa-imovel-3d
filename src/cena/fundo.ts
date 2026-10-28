// Câmera do vídeo de fundo para site: uma volta lenta e completa em volta do imóvel. O último quadro é igual ao
// primeiro, então o vídeo pode tocar em loop sem pulo.

import type { Quadro } from "./camera.ts";

export const DURACAO_FUNDO = 24; // segundos por volta

export const cameraFundo = (frame: number, total: number, vertical: boolean): Quadro => {
  const t = frame / total;
  const azim = (-18 * Math.PI) / 180 + t * Math.PI * 2;
  const elev = ((40 + 4 * Math.sin(t * Math.PI * 2)) * Math.PI) / 180;
  const dist = 1150;
  const h = Math.cos(elev) * dist;
  return { pos: [-Math.sin(azim) * h, Math.sin(elev) * dist, Math.cos(azim) * h], alvo: [0, 0, 0], fov: vertical ? 50 : 36 };
};
