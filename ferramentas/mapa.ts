// CLI da skill mapa-imovel-3d. Rode "node ferramentas/mapa.ts ajuda" para ver os comandos.

import fs from "node:fs";
import path from "node:path";
import { criarSlug } from "./lib/geo.ts";
import { geocodificar } from "./lib/geocodificar.ts";
import { buscarPontos } from "./lib/pontos.ts";
import { calcularTrechos } from "./lib/rotas.ts";
import { carregarFicha, pastaCache, pastaImovel, pastaPublico, pastaSaida, salvarFicha } from "./lib/pastas.ts";
import { gerarCidade, RAIO_M, salvarCidade } from "./lib/cidade.ts";
import { renderizarImagem, renderizarVideo } from "./lib/render.ts";
import { aproximar, fichaPublica, type Ficha } from "../src/ficha.ts";
import { rotuloTempo } from "../src/tempo.ts";

type Args = { pos: string[]; op: Record<string, string | true> };
const lerArgs = (lista: string[]): Args => {
  const pos: string[] = [];
  const op: Record<string, string | true> = {};
  for (let i = 0; i < lista.length; i++) {
    const a = lista[i];
    if (!a.startsWith("--")) pos.push(a);
    else if (a.includes("=")) op[a.slice(2, a.indexOf("="))] = a.slice(a.indexOf("=") + 1);
    else if (lista[i + 1] !== undefined && !lista[i + 1].startsWith("--")) op[a.slice(2)] = lista[++i];
    else op[a.slice(2)] = true;
  }
  return { pos, op };
};
const texto = (v: string | true | undefined) => (typeof v === "string" ? v : undefined);
const exigirDados = (slug: string) => {
  if (!fs.existsSync(path.join(pastaPublico(slug), "cidade.json"))) throw new Error(`Falta a maquete de "${slug}". Rode: dados ${slug}`);
};
const exigirSlug = (pos: string[]) => {
  if (!pos[0]) throw new Error("Diga qual imóvel (o slug, nome da pasta em mapas-imoveis).");
  return pos[0];
};

export const resumoPontos = (f: Ficha) =>
  f.pontos.map((p) => `  ${p.noVideo ? "★" : " "} ${p.tipo.padEnd(11)} ${p.nome}  —  ${rotuloTempo(p) ?? "sem rota"}`).join("\n");

const comandos: Record<string, (a: Args) => Promise<void>> = {
  async novo({ pos, op }) {
    const entrada = pos[0];
    if (!entrada) throw new Error('Uso: novo "<endereço, coordenadas ou link do Google Maps>" [--nome "Apê da praia"] [--exata]');
    const nome = texto(op.nome) ?? entrada.split(",")[0].trim();
    const slug = texto(op.slug) ?? criarSlug(nome);
    if (fs.existsSync(path.join(pastaImovel(slug), "ficha.json")) && !op.refazer) {
      throw new Error(`Já existe o imóvel "${slug}". Use --slug outro-nome ou --refazer para recomeçar.`);
    }
    const cache = pastaCache(slug);
    console.log(`Procurando "${entrada}"...`);
    const lugar = await geocodificar(entrada, cache);
    console.log(`Achei: ${lugar.nomeExibicao}`);
    console.log("Procurando o que tem em volta (OpenStreetMap)...");
    const pontos = await buscarPontos(lugar, cache);
    console.log(`Calculando tempo a pé e de carro até ${pontos.length} pontos...`);
    const comTempo = await calcularTrechos(lugar, pontos, cache);
    const raio = 250;
    const ficha: Ficha = {
      versao: 1,
      slug,
      nome,
      chamada: "Reserve agora",
      regiao: lugar.regiao,
      endereco: lugar.nomeExibicao,
      local: { lat: lugar.lat, lon: lugar.lon },
      localizacao: op.exata ? "exata" : "aproximada",
      raioAproxM: raio,
      area: aproximar(lugar, raio, slug),
      pontos: comTempo,
      marca: { nome, cor: "#C8643C", corTexto: "#FFFFFF" },
    };
    salvarFicha(ficha);
    console.log(`\nFicha criada: ${path.join(pastaImovel(slug), "ficha.json")}`);
    console.log(`Localização: ${ficha.localizacao}${ficha.localizacao === "aproximada" ? ` (círculo de ${raio} m)` : ""}`);
    console.log(`Pontos (★ = entra no vídeo):\n${resumoPontos(ficha)}`);
  },

  async dados({ pos }) {
    const f = carregarFicha(exigirSlug(pos));
    const fp = fichaPublica(f);
    console.log(`Montando a maquete 3D de "${f.nome}" (raio de ${RAIO_M} m)...`);
    const dados = await gerarCidade(fp.centro, f.pontos, pastaCache(f.slug), f.slug);
    const arq = salvarCidade(dados, pastaPublico(f.slug));
    const mb = (fs.statSync(arq).size / 1e6).toFixed(1);
    console.log(`Pronto: ${dados.predios.length} prédios, ${dados.ruas.length} ruas, ${dados.agua.length} áreas de água (${mb} MB)`);
  },

  async video({ pos, op }) {
    const f = carregarFicha(exigirSlug(pos));
    exigirDados(f.slug);
    const final = !!op.final;
    const formato = texto(op.formato) ?? (final ? "ambos" : "vertical");
    const fotos = (f.fotos ?? []).filter((x) => fs.existsSync(path.join(pastaPublico(f.slug), x)));
    const props = { ficha: fichaPublica(f), comPlanta: !op["sem-planta"], fotos };
    const formatos = formato === "ambos" ? ["vertical", "horizontal"] : [formato];
    for (const fmt of formatos) {
      const comp = fmt === "horizontal" ? "ImovelHorizontal" : "ImovelVertical";
      const saida = path.join(pastaSaida(f.slug), `video-${fmt}${final ? "" : "-rascunho"}.mp4`);
      console.log(`Renderizando ${final ? "vídeo final" : "rascunho"} ${fmt}...`);
      await renderizarVideo({ publico: pastaPublico(f.slug), composicao: comp, props, saida, rascunho: !final });
      console.log(`Pronto: ${saida}`);
    }
  },

  async capa({ pos }) {
    const f = carregarFicha(exigirSlug(pos));
    exigirDados(f.slug);
    for (const [comp, nome] of [["Capa", "capa-vertical.png"], ["CapaHorizontal", "capa-horizontal.png"]]) {
      const saida = path.join(pastaSaida(f.slug), nome);
      await renderizarImagem({ publico: pastaPublico(f.slug), composicao: comp, props: { ficha: fichaPublica(f) }, saida });
      console.log(`Pronto: ${saida}`);
    }
  },

  // Quadros soltos do vídeo, para conferir antes de renderizar tudo: quadro <slug> 30 120 200
  async quadro({ pos, op }) {
    const f = carregarFicha(exigirSlug(pos));
    exigirDados(f.slug);
    const comp = op.horizontal ? "ImovelHorizontal" : "ImovelVertical";
    const props = { ficha: fichaPublica(f), comPlanta: true, fotos: f.fotos ?? [] };
    for (const q of pos.slice(1).map(Number)) {
      const saida = path.join(pastaSaida(f.slug), `quadro-${comp}-${q}.png`);
      await renderizarImagem({ publico: pastaPublico(f.slug), composicao: comp, props, saida, quadro: q });
      console.log(`Pronto: ${saida}`);
    }
  },

  async ajuda() {
    console.log(`mapa-imovel-3d — comandos (node ferramentas/mapa.ts <comando> ...)
  novo "<endereço|coordenadas|link>" [--nome "..."] [--slug x] [--exata]   cria a ficha do imóvel
  dados <slug>                     baixa relevo, prédios e ruas (maquete 3D)
  video <slug> [--final] [--formato vertical|horizontal|ambos]
  capa <slug>                      imagem de capa (vertical e horizontal)
  planta <slug>                    planta isométrica (PNG + página interativa)
  interativo <slug>                mapa 3D interativo (HTML)
  guia <slug> --origem "<lugar>"   guia de chegada do hóspede (endereço exato)
  qr <slug> [--url ...]            QR code do mapa/guia
  textos <slug>                    textos prontos para o anúncio
  portfolio                        mapa com todos os imóveis
  publicar <slug>|--portfolio [--guia]   publica na Vercel (conta grátis do usuário)
  tudo <slug>                      dados + vídeos finais + capa + planta + interativo + textos`);
  },
};

export const registrar = (nome: string, fn: (a: Args) => Promise<void>) => {
  comandos[nome] = fn;
};

const principal = async () => {
  const [cmd = "ajuda", ...resto] = process.argv.slice(2);
  const fn = comandos[cmd];
  if (!fn) throw new Error(`Comando desconhecido: ${cmd}. Rode "ajuda".`);
  await fn(lerArgs(resto));
};

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/").replace(/^\//, "")}` || process.argv[1]?.endsWith("mapa.ts")) {
  principal().catch((e) => {
    console.error(`\nErro: ${e.message}`);
    process.exit(1);
  });
}
