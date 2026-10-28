import type { TipoPonto } from "./ficha.ts";

export const NOME_TIPO: Record<TipoPonto, string> = {
  praia: "Praia", metro: "Metrô", trem: "Trem", onibus: "Ônibus", rodoviaria: "Rodoviária", aeroporto: "Aeroporto",
  mercado: "Mercado", padaria: "Padaria", farmacia: "Farmácia", hospital: "Hospital", restaurante: "Restaurante",
  parque: "Parque", shopping: "Shopping", atracao: "Passeio", rodovia: "Rodovia", porto: "Porto", centro: "Centro", carga: "Centro de cargas", outro: "Ponto",
};
