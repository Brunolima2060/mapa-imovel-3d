// CLI da skill mapa-imovel-3d. Rode "node ferramentas/mapa.ts ajuda" para ver os comandos.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { criarSlug, metrosEntre } from "./lib/geo.ts";
import { geocodificar } from "./lib/geocodificar.ts";
import { buscarPontos } from "./lib/pontos.ts";
import { calcularTrechos, rotaCompleta } from "./lib/rotas.ts";
import { paginaGuia, paginaImovel, paginaPortfolio } from "./lib/interativo.ts";
import { textosImovel } from "./lib/textos.ts";
import { qrPng } from "./lib/qr.ts";
import { galpaoHtml, plantaHtml } from "../src/planta/svg.ts";
import { buscarPontosLogisticos } from "./lib/logistica.ts";
import { carregarFicha, listarImoveis, pastaCache, pastaImoveis, pastaImovel, pastaPublico, pastaSaida, salvarFicha } from "./lib/pastas.ts";
import { gerarCidade, RAIO_M, salvarCidade } from "./lib/cidade.ts";
import { fecharNavegador, renderizarImagem, renderizarVideo } from "./lib/render.ts";
import { fichaPublica, sortearArea, type Ficha } from "../src/ficha.ts";
import { escolherUrlVercel, mesmaOrigem, nomePadrao, perfilDe } from "./lib/utilidades.ts";
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
  const arq = path.join(pastaPublico(slug), "cidade.json");
  if (!fs.existsSync(arq)) throw new Error(`Falta a maquete de "${slug}". Rode: dados ${slug}`);
  const origem = JSON.parse(fs.readFileSync(arq, "utf8")).origem;
  // maquete feita para outro centro (endereço, raio ou modo mudou): o círculo cairia no lugar errado
  if (!mesmaOrigem(origem, fichaPublica(carregarFicha(slug)).centro)) throw new Error(`A maquete de "${slug}" é de antes de uma mudança na ficha. Rode de novo: dados ${slug}`);
};
const exigirSlug = (pos: string[]) => {
  if (!pos[0]) throw new Error("Diga qual imóvel (o slug, nome da pasta em mapas-imoveis).");
  return pos[0];
};

// Tira pontos colados (menos de 8 m) da rota para a ficha não ficar enorme.
const simplificarRota = (pts: [number, number][]): [number, number][] => {
  const saida: [number, number][] = [];
  for (const p of pts) {
    const u = saida[saida.length - 1];
    if (!u || metrosEntre({ lat: u[0], lon: u[1] }, { lat: p[0], lon: p[1] }) >= 8) saida.push(p);
  }
  const fim = pts[pts.length - 1];
  if (fim && saida[saida.length - 1] !== fim) saida.push(fim);
  return saida;
};

// Publica uma pasta com index.html na conta Vercel (grátis) do próprio usuário.
const publicarNaVercel = (dir: string, nomeProjeto: string): string => {
  const cmd = process.platform === "win32" ? "vercel.cmd" : "vercel";
  const teste = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
  if (teste.status !== 0) {
    throw new Error("Falta a ferramenta da Vercel. Instale uma vez com:  npm i -g vercel   e depois entre na sua conta com:  vercel login");
  }
  // nome do projeto vai num vercel.json (o --name está obsoleto) e o comando roda dentro da pasta: caminho com espaço não quebra
  fs.writeFileSync(path.join(dir, "vercel.json"), JSON.stringify({ name: nomeProjeto, cleanUrls: true }));
  const r = spawnSync(cmd, ["deploy", "--prod", "--yes"], { cwd: dir, encoding: "utf8", shell: process.platform === "win32" });
  const saida = `${r.stdout}\n${r.stderr}`;
  if (r.status !== 0) {
    if (/log ?in|not authorized|credentials|token/i.test(saida)) throw new Error("Entre na sua conta da Vercel uma vez com:  vercel login");
    throw new Error(`A Vercel recusou a publicação:\n${saida.slice(-800)}`);
  }
  const urls = saida.match(/https:\/\/[^\s]+\.vercel\.app/g) ?? [];
  const limpa = urls.find((u) => u.includes(nomeProjeto)) ?? urls[urls.length - 1];
  if (!limpa) throw new Error(`Publicou, mas não achei o link na resposta da Vercel:\n${saida.slice(-500)}`);
  return limpa;
};

export const resumoPontos =(f: Ficha) =>
  f.pontos.map((p) => `  ${p.noVideo ? "★" : " "} ${p.tipo.padEnd(11)} ${p.nome}  —  ${rotuloTempo(p) ?? "sem rota"}`).join("\n");

const comandos: Record<string, (a: Args) => Promise<void>> = {
  async novo({ pos, op }) {
    const entrada = pos[0];
    if (!entrada) throw new Error('Uso: novo "<endereço, coordenadas ou link do Google Maps>" [--nome "Apê da praia"] [--exata]');
    const nomeDado = texto(op.nome);
    const slugDado = texto(op.slug) ? criarSlug(texto(op.slug)!) : nomeDado ? criarSlug(nomeDado) : undefined;
    if (!slugDado) throw new Error('Dê um nome curto ao imóvel (ele aparece no vídeo e no link), ex.: --nome "Casa no Itaguá"');
    const slug = slugDado;
    if (fs.existsSync(path.join(pastaImovel(slug), "ficha.json")) && !op.refazer) {
      throw new Error(`Já existe o imóvel "${slug}". Use --slug outro-nome ou --refazer para recomeçar.`);
    }
    if (op.refazer) for (const a of ["cidade.json", "cidade-exata.json"]) fs.rmSync(path.join(pastaPublico(slug), a), { force: true });
    const cache = pastaCache(slug);
    console.log(`Procurando "${entrada}"...`);
    const lugar = await geocodificar(entrada, cache);
    console.log(`Achei: ${lugar.nomeExibicao}`);
    console.log("  (confira se é o lugar certo; se não for, rode de novo com cidade e estado ou com as coordenadas)");
    const galpao = perfilDe(op) === "galpao";
    console.log(galpao ? "Procurando rodovias, aeroporto e centro (OpenStreetMap)..." : "Procurando o que tem em volta (OpenStreetMap)...");
    const pontos = galpao ? await buscarPontosLogisticos(lugar, cache) : await buscarPontos(lugar, cache);
    console.log(`Calculando ${galpao ? "distância e tempo de carro" : "tempo a pé e de carro"} até ${pontos.length} pontos...`);
    const comTempo = await calcularTrechos(lugar, pontos, cache, galpao);
    const raio = 250;
    const ficha: Ficha = {
      versao: 1,
      perfil: galpao ? "galpao" : "residencial",
      slug,
      nome: nomeDado ?? nomePadrao(lugar.regiao?.split(" · ")[0]),
      chamada: galpao ? "Agende uma visita" : "Reserve agora",
      regiao: lugar.regiao,
      endereco: lugar.nomeExibicao,
      local: { lat: lugar.lat, lon: lugar.lon },
      localizacao: op.exata ? "exata" : "aproximada",
      raioAproxM: raio,
      area: sortearArea(lugar, raio),
      pontos: comTempo,
      marca: { nome: nomeDado ?? "Minha marca", cor: "#C8643C", corTexto: "#FFFFFF" },
    };
    salvarFicha(ficha);
    console.log(`\nFicha criada: ${path.join(pastaImovel(slug), "ficha.json")}`);
    console.log(`Localização: ${ficha.localizacao}${ficha.localizacao === "aproximada" ? ` (círculo de ${raio} m)` : ""}`);
    console.log(`Pontos (★ = entra no vídeo):\n${resumoPontos(ficha)}`);
    if (galpao) console.log('\nAgora preencha a ficha técnica em "galpao" (área, pé-direito, docas...): veja referencias/ficha.md');
  },

  // Sorteia de novo o círculo aproximado (ex.: depois de mudar raioAproxM). Depois, rode "dados" de novo.
  async area({ pos }) {
    const f = carregarFicha(exigirSlug(pos));
    f.area = sortearArea(f.local, f.raioAproxM);
    salvarFicha(f);
    console.log(`Área sorteada de novo (raio ${f.raioAproxM} m). Agora rode: dados ${f.slug}`);
  },

  async tempos({ pos }) {
    const f = carregarFicha(exigirSlug(pos));
    console.log(`Recalculando tempos de ${f.pontos.length} pontos...`);
    f.pontos = await calcularTrechos(f.local, f.pontos.map(({ ape: _a, carro: _c, ...p }) => p), pastaCache(f.slug), f.perfil === "galpao");
    salvarFicha(f);
    console.log(resumoPontos(f));
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

  async planta({ pos }) {
    const f = carregarFicha(exigirSlug(pos));
    const html = path.join(pastaSaida(f.slug), "planta.html");
    if (f.perfil === "galpao") {
      if (!f.galpao) throw new Error('Esta ficha ainda não tem a ficha técnica. Preencha "galpao" (veja referencias/ficha.md).');
      fs.writeFileSync(html, galpaoHtml(f.galpao, fichaPublica(f)));
    } else {
      if (!f.planta?.comodos.length) throw new Error('Esta ficha ainda não tem planta. Preencha "planta.comodos" (veja referencias/ficha.md).');
      fs.writeFileSync(html, plantaHtml(f.planta, fichaPublica(f)));
    }
    const png = path.join(pastaSaida(f.slug), "planta.png");
    await renderizarImagem({ publico: pastaPublico(f.slug), composicao: "Planta", props: { ficha: fichaPublica(f) }, saida: png });
    console.log(`Pronto: ${png}\nPronto: ${html}`);
  },

  async interativo({ pos }) {
    const f = carregarFicha(exigirSlug(pos));
    const arq = path.join(pastaSaida(f.slug), "mapa.html");
    fs.writeFileSync(arq, paginaImovel(fichaPublica(f)));
    console.log(`Pronto: ${arq} (abra no navegador; para ter um link, rode: publicar ${f.slug})`);
  },

  async guia({ pos, op }) {
    const f = carregarFicha(exigirSlug(pos));
    const origemTxt = texto(op.origem);
    if (!origemTxt && !f.guia) throw new Error('Diga de onde o hóspede vem: guia <slug> --origem "Rodoviária de Ubatuba"');
    const cache = pastaCache(f.slug);
    if (origemTxt) {
      const o = await geocodificar(origemTxt, cache);
      const r = await rotaCompleta(o, f.local, cache);
      f.guia = { ...f.guia, origem: { nome: texto(op.nome) ?? origemTxt.split(",")[0], lat: o.lat, lon: o.lon }, rota: simplificarRota(r.pontos), minutos: r.minutos, metros: r.metros };
    }
    if (texto(op.estacionamento)) f.guia!.estacionamento = texto(op.estacionamento);
    if (texto(op.entrada)) f.guia!.entrada = texto(op.entrada);
    if (texto(op.observacoes)) f.guia!.observacoes = texto(op.observacoes);
    salvarFicha(f);
    const html = path.join(pastaSaida(f.slug), "guia.html");
    fs.writeFileSync(html, paginaGuia(f));
    console.log(`Pronto: ${html}`);
    if (op["sem-video"]) return;
    const exato = path.join(pastaPublico(f.slug), "cidade-exata.json");
    if (!fs.existsSync(exato) || !mesmaOrigem(JSON.parse(fs.readFileSync(exato, "utf8")).origem, f.local)) {
      console.log("Montando a maquete com o endereço exato (só para o guia)...");
      const d = await gerarCidade(f.local, [], cache, f.slug + "-exato");
      fs.writeFileSync(exato, JSON.stringify(d));
    }
    const g = f.guia!;
    const props = { nome: f.nome, marca: f.marca, origem: g.origem.nome, minutos: g.minutos, metros: g.metros, rota: g.rota ?? [], estacionamento: g.estacionamento, entrada: g.entrada };
    const saida = path.join(pastaSaida(f.slug), `guia-vertical${op.final ? "" : "-rascunho"}.mp4`);
    await renderizarVideo({ publico: pastaPublico(f.slug), composicao: "GuiaVertical", props, saida, rascunho: !op.final });
    console.log(`Pronto: ${saida}\nLembrete: o guia mostra o endereço exato. Envie só para quem já reservou.`);
  },

  async qr({ pos, op }) {
    const f = carregarFicha(exigirSlug(pos));
    const alvos: [string, string | undefined][] = op.guia ? [["qr-guia.png", f.guia?.url]] : [["qr-mapa.png", texto(op.url) ?? f.anuncio?.mapaUrl]];
    for (const [nome, url] of alvos) {
      if (!url) throw new Error(`Ainda não há link publicado. Rode "publicar ${f.slug}${op.guia ? " --guia" : ""}" ou passe --url https://...`);
      const arq = await qrPng(url, path.join(pastaSaida(f.slug), nome), "#1F2726");
      console.log(`Pronto: ${arq}  (${url})`);
    }
  },

  async textos({ pos }) {
    const f = carregarFicha(exigirSlug(pos));
    const t = textosImovel(fichaPublica(f));
    const corpo = `=== BLOCO "LOCALIZAÇÃO" (cole no anúncio) ===\n${t.localizacao}\n\n=== LEGENDA (Reels / TikTok) ===\n${t.legenda}\n\n=== BOAS-VINDAS (mande depois da reserva) ===\n${t.boasVindas(f.guia?.url)}\n`;
    const arq = path.join(pastaSaida(f.slug), "textos.txt");
    fs.writeFileSync(arq, corpo);
    console.log(corpo + `\nSalvo em: ${arq}`);
  },

  async portfolio() {
    const fichas = listarImoveis().map((s) => fichaPublica(carregarFicha(s)));
    const dir = path.join(pastaImoveis(), "_portfolio");
    fs.mkdirSync(dir, { recursive: true });
    const arq = path.join(dir, "index.html");
    fs.writeFileSync(arq, paginaPortfolio(fichas));
    console.log(`Pronto: ${arq} (${fichas.length} imóveis)`);
  },

  async publicar({ pos, op }) {
    if (op.portfolio) {
      await comandos.portfolio({ pos: [], op: {} });
      const url = publicarNaVercel(path.join(pastaImoveis(), "_portfolio"), "imoveis-portfolio");
      console.log(`No ar: ${url}`);
      return;
    }
    const f = carregarFicha(exigirSlug(pos));
    if (op.guia) {
      if (!f.guia) throw new Error(`Crie o guia antes: guia ${f.slug} --origem "..."`);
      const segredo = f.guia.url?.match(/guia-[a-z0-9-]+-([a-f0-9]{8})/)?.[1] ?? randomBytes(4).toString("hex");
      const dir = path.join(pastaSaida(f.slug), "site-guia");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), paginaGuia(f));
      f.guia.url = publicarNaVercel(dir, `guia-${f.slug}-${segredo}`.slice(0, 90));
      salvarFicha(f);
      console.log(`No ar (só para hóspedes): ${f.guia.url}`);
      return;
    }
    const dir = path.join(pastaSaida(f.slug), "site-mapa");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), paginaImovel(fichaPublica(f)));
    if (f.perfil === "galpao" && f.galpao) fs.writeFileSync(path.join(dir, "planta.html"), galpaoHtml(f.galpao, fichaPublica(f)));
    else if (f.planta?.comodos.length) fs.writeFileSync(path.join(dir, "planta.html"), plantaHtml(f.planta, fichaPublica(f)));
    const url = publicarNaVercel(dir, `mapa-${f.slug}`);
    f.anuncio = { ...f.anuncio, mapaUrl: url };
    salvarFicha(f);
    console.log(`No ar: ${url}${f.planta?.comodos.length || f.galpao ? `\nPlanta: ${url}/planta.html` : ""}`);
  },

  async tudo({ pos }) {
    const slug = exigirSlug(pos);
    try {
      exigirDados(slug);
    } catch {
      await comandos.dados({ pos: [slug], op: {} });
    }
    await comandos.video({ pos: [slug], op: { final: true } });
    await comandos.capa({ pos: [slug], op: {} });
    const fx = carregarFicha(slug);
    if (fx.planta?.comodos.length || (fx.perfil === "galpao" && fx.galpao)) await comandos.planta({ pos: [slug], op: {} });
    await comandos.interativo({ pos: [slug], op: {} });
    await comandos.textos({ pos: [slug], op: {} });
    console.log(`\nTudo pronto em ${pastaSaida(slug)}`);
  },

  async ajuda() {
    console.log(`mapa-imovel-3d — comandos (node ferramentas/mapa.ts <comando> ...)
  novo "<endereço|coordenadas|link>" --nome "..." [--residencial] [--exata]   cria a ficha (padrão: galpão comercial/logístico)
  tempos <slug>                    recalcula tempos depois de mexer nos pontos
  dados <slug>                     baixa relevo, prédios e ruas (maquete 3D)
  quadro <slug> <n> [<n>...]       quadros soltos do vídeo em PNG, para conferir
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
  try {
    await fn(lerArgs(resto));
  } finally {
    await fecharNavegador();
  }
};

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/").replace(/^\//, "")}` || process.argv[1]?.endsWith("mapa.ts")) {
  principal().catch((e) => {
    console.error(`\nErro: ${e.message}`);
    process.exit(1);
  });
}
