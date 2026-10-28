// Textos prontos para colar no anúncio, na legenda do Reels e na mensagem ao hóspede. Só usam a ficha pública.

import type { FichaPublica } from "../../src/ficha.ts";
import { rotuloTempo } from "../../src/tempo.ts";

const NOME_CURTO: Record<string, string> = {
  praia: "Praia", metro: "Metrô", trem: "Trem", onibus: "Terminal de ônibus", rodoviaria: "Rodoviária", aeroporto: "Aeroporto",
  mercado: "Mercado", padaria: "Padaria", farmacia: "Farmácia", hospital: "Hospital", restaurante: "Restaurante",
  parque: "Parque", shopping: "Shopping", atracao: "Passeio", outro: "Ponto",
};

export const textosImovel = (f: FichaPublica) => {
  const comTempo = f.pontos.filter((p) => rotuloTempo(p));
  const linhas = comTempo.map((p) => `• ${p.nome} (${NOME_CURTO[p.tipo].toLowerCase()}): ${rotuloTempo(p)}`);
  const localizacao = [
    `Localização${f.regiao ? ` — ${f.regiao}` : ""}`,
    "",
    ...linhas,
    "",
    f.localizacao === "aproximada" ? "O endereço exato é enviado depois da reserva." : "",
    "Tempos calculados pelas ruas (OpenStreetMap), arredondados para cima.",
  ]
    .filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "")
    .join("\n")
    .trim();
  const top = comTempo.filter((p) => p.noVideo).slice(0, 3);
  const legenda = [
    `${f.nome}${f.regiao ? ` · ${f.regiao}` : ""}`,
    "",
    ...top.map((p) => `${NOME_CURTO[p.tipo]}: ${rotuloTempo(p)}`),
    ...(f.destaques?.length ? ["", f.destaques.join(" · ")] : []),
    "",
    `${f.chamada}${f.anuncio?.plataforma ? ` — ${f.anuncio.plataforma}` : ""}${f.anuncio?.link ? `\n${f.anuncio.link}` : ""}`,
  ].join("\n");
  const boasVindas = (url?: string) =>
    [
      `Olá! Que bom ter você no ${f.nome}.`,
      url ? `Preparamos um guia de chegada com o caminho até a porta: ${url}` : "Em breve mando o guia de chegada com o caminho até a porta.",
      "Qualquer dúvida, é só chamar por aqui.",
    ].join("\n");
  return { localizacao, legenda, boasVindas };
};
