import type { Trecho } from "./ficha.ts";

// Tempo de rota sempre arredondado para cima: anúncio nunca promete menos do que é.
export const minutosDe = (segundos: number): number => Math.max(1, Math.ceil(segundos / 60));

export const LIMITE_APE_MIN = 20;

export const rotuloTempo = (p: { ape?: Trecho; carro?: Trecho }): string | null => {
  if (p.ape && p.ape.minutos <= LIMITE_APE_MIN) return `${p.ape.minutos} min a pé`;
  if (p.carro) return `${p.carro.minutos} min de carro`;
  return null;
};

export const rotuloDistancia = (p: { ape?: Trecho; carro?: Trecho }): string | null => {
  const m = p.ape?.metros ?? p.carro?.metros;
  if (m === undefined || m < 50) return null; // colado no imóvel: só o tempo
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
};
