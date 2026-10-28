import type { TipoPonto } from "../ficha.ts";

// Ícones de traço simples (24x24), desenhados aqui para não depender de fonte de ícones nem de emoji.
const TRACOS: Record<TipoPonto, string> = {
  praia: "M3 18c2 0 2-1.5 4.5-1.5S9.5 18 12 18s2.5-1.5 4.5-1.5S19 18 21 18M3 14c2 0 2-1.5 4.5-1.5S9.5 14 12 14s2.5-1.5 4.5-1.5S19 14 21 14M17 4a3 3 0 1 1 0 6a3 3 0 0 1 0-6",
  metro: "M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 10h16M8 17l-2 4M16 17l2 4M8 13.5h.01M16 13.5h.01",
  trem: "M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM12 3v7M4 10h16M8 17l-2 4M16 17l2 4",
  onibus: "M6 3h12a2 2 0 0 1 2 2v11H4V5a2 2 0 0 1 2-2zM4 11h16M7 16v3M17 16v3M7.5 13.5h.01M16.5 13.5h.01",
  rodoviaria: "M6 3h12a2 2 0 0 1 2 2v11H4V5a2 2 0 0 1 2-2zM4 11h16M7 16v3M17 16v3M9 7h6",
  aeroporto: "M10.5 21l1.5-1 1.5 1v-2.5L12 17V12l8 3v-2l-8-5V4.5a1 1 0 0 0-2 0V8l-8 5v2l8-3v5l-1.5 1.5z",
  mercado: "M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 20.5h.01M17 20.5h.01",
  padaria: "M4 15c0-5 3.6-9 8-9s8 4 8 9v2H4zM9 9l1.5 6M15 9l-1.5 6M12 7v8",
  farmacia: "M12 4v16M4 12h16M7 4h10v16H7z",
  hospital: "M4 4h16v16H4zM12 8v8M8 12h8",
  restaurante: "M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M17 21V3c-2 1-3 3.5-3 7h3",
  parque: "M12 22v-6M12 16a5 5 0 0 0 5-5c0-3-2-4-2-6a3 3 0 0 0-6 0c0 2-2 3-2 6a5 5 0 0 0 5 5z",
  shopping: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  atracao: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z",
  outro: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5",
};

export const Icone: React.FC<{ tipo: TipoPonto; tamanho: number; cor: string; espessura?: number }> = ({ tipo, tamanho, cor, espessura = 1.8 }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeLinejoin="round">
    <path d={TRACOS[tipo] ?? TRACOS.outro} />
  </svg>
);

export { NOME_TIPO } from "../nomes.ts";
