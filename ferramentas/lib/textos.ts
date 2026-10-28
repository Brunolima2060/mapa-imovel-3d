// Textos prontos para colar no anúncio, na legenda do Reels e na mensagem ao hóspede. Só usam a ficha pública.

import type { FichaPublica } from "../../src/ficha.ts";
import { rotuloDistancia, rotuloTempo } from "../../src/tempo.ts";
import { linhasFichaTecnica } from "../../src/planta/galpao.ts";

const NOME_CURTO: Record<string, string> = {
  praia: "Praia", metro: "Metrô", trem: "Trem", onibus: "Terminal de ônibus", rodoviaria: "Rodoviária", aeroporto: "Aeroporto",
  mercado: "Mercado", padaria: "Padaria", farmacia: "Farmácia", hospital: "Hospital", restaurante: "Restaurante",
  parque: "Parque", shopping: "Shopping", atracao: "Passeio", rodovia: "Rodovia", porto: "Porto", centro: "Centro", carga: "Centro de cargas", outro: "Ponto",
};

// Galpão: o que importa é acesso a rodovia (distância e tempo) e a ficha técnica.
const textosGalpao = (f: FichaPublica) => {
  const comTempo = f.pontos.filter((p) => rotuloTempo(p));
  const ficha = f.galpao ? linhasFichaTecnica(f.galpao) : [];
  const acesso = (p: (typeof comTempo)[number]) => `${rotuloDistancia(p) ?? ""}${rotuloDistancia(p) ? " · " : ""}${rotuloTempo(p)}`;
  const localizacao = [
    `Acessos logísticos${f.regiao ? ` — ${f.regiao}` : ""}`,
    ...comTempo.map((p) => `• ${p.nome}: ${acesso(p)}`),
    ...(f.logistica?.alcance?.length ? ["", "Alcance de caminhão", ...f.logistica.alcance.map((a) => `• ${a.minutos} min: ${a.cidades.join(", ") || "—"}`)] : []),
    ...(f.logistica?.vizinhos?.length ? ["", "Vizinhos logísticos", ...f.logistica.vizinhos.map((v) => `• ${v.nome} (${(v.metros / 1000).toFixed(1).replace(".", ",")} km)`)] : []),
    ...(ficha.length ? ["", "Ficha técnica", ...ficha.map((l) => `• ${l}`)] : []),
    "",
    "Distâncias e tempos pelas vias (OpenStreetMap), arredondados para cima; caminhões podem levar mais.",
  ].join("\n");
  const legenda = [
    f.nome + (f.regiao ? ` · ${f.regiao}` : ""),
    "",
    ...ficha.slice(0, 4),
    ...comTempo.filter((p) => p.noVideo).slice(0, 3).map((p) => `${p.nome}: ${acesso(p)}`),
    "",
    `${f.chamada}${f.anuncio?.link ? `\n${f.anuncio.link}` : ""}`,
  ].join("\n");
  const boasVindas = (url?: string) =>
    [`Olá! Obrigado pelo interesse no ${f.nome}.`, url ? `Aqui está o mapa com a localização e os acessos: ${url}` : "", "Posso agendar uma visita?"].filter(Boolean).join("\n");
  return { localizacao, legenda, boasVindas };
};

export const textosImovel = (f: FichaPublica) => {
  if (f.perfil === "galpao") return textosGalpao(f);
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
