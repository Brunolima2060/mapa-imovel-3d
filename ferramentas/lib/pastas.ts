// Onde ficam os imóveis do usuário: ~/mapas-imoveis/<slug>/ (fora do repositório, nunca vai para o GitHub).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { esquemaFicha, type Ficha } from "../../src/ficha.ts";

export const pastaImoveis = () => process.env.MAPAS_IMOVEIS_DIR ?? path.join(os.homedir(), "mapas-imoveis");
export const pastaImovel = (slug: string) => path.join(pastaImoveis(), slug);
export const pastaCache = (slug: string) => path.join(pastaImovel(slug), "cache");
export const pastaSaida = (slug: string) => {
  const p = path.join(pastaImovel(slug), "saida");
  fs.mkdirSync(p, { recursive: true });
  return p;
};

export const carregarFicha = (slug: string): Ficha => {
  const arq = path.join(pastaImovel(slug), "ficha.json");
  if (!fs.existsSync(arq)) throw new Error(`Não achei o imóvel "${slug}" em ${pastaImoveis()}. Rode "novo" antes.`);
  try {
    return esquemaFicha.parse(JSON.parse(fs.readFileSync(arq, "utf8")));
  } catch (e) {
    throw new Error(`A ficha ${arq} tem um erro: ${(e as Error).message}`);
  }
};

export const salvarFicha = (f: Ficha) => {
  const dir = pastaImovel(f.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "ficha.json"), JSON.stringify(esquemaFicha.parse(f), null, 2) + "\n");
};

export const listarImoveis = (): string[] =>
  fs.existsSync(pastaImoveis())
    ? fs.readdirSync(pastaImoveis()).filter((d) => fs.existsSync(path.join(pastaImoveis(), d, "ficha.json")))
    : [];

// O que o vídeo pode ler (vira a pasta "public" do Remotion): cidade.json, fotos/, logo.
export const pastaPublico = (slug: string) => {
  const p = path.join(pastaImovel(slug), "publico");
  fs.mkdirSync(p, { recursive: true });
  return p;
};
