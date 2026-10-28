// Galpão logístico isométrico gerado só com a ficha técnica: nave com pilares, docas com caminhões na frente,
// mezanino de escritório no fundo, pátio de manobra e telhado que sobe ao "desmontar".
// Mesmo motor da planta (geometria.ts): metros, x = comprimento (direita), y = largura (para a frente).

import type { FichaGalpao } from "../ficha.ts";
import { facesDaCaixa, projetarIso, type Caixa, type Face } from "./geometria.ts";

const COR = {
  piso: "#D6D4CE", patio: "#B9BBB9", rack: "#6F8FA6", carga: "#D9B98C", faixa: "#F2F0EA", parede: "#E9EBEA", pilar: "#A3AAAD", porta: "#5E6A70",
  telhado: "#D9DDDE", escritorio: "#F4F1EA", bau: "#F7F7F5", pneu: "#3B3F41",
};

const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

export const dimensoesGalpao = (g: Pick<FichaGalpao, "areaConstruidaM2" | "larguraM" | "comprimentoM" | "peDireitoM" | "docas">) => {
  if (g.larguraM && g.comprimentoM) return { largura: g.larguraM, comprimento: g.comprimentoM };
  const largura = Math.sqrt(g.areaConstruidaM2 / 2); // nave típica: comprida, 2 por 1
  return { largura, comprimento: g.areaConstruidaM2 / largura };
};

export const linhasFichaTecnica = (g: FichaGalpao): string[] =>
  [
    `${fmt(g.areaConstruidaM2)} m² construídos`,
    g.areaTerrenoM2 && `${fmt(g.areaTerrenoM2)} m² de terreno`,
    `Pé-direito ${String(g.peDireitoM).replace(".", ",")} m`,
    g.docas ? `${g.docas} docas${g.niveladoras ? ` (${g.niveladoras} com niveladora)` : ""}` : "",
    g.pisoTm2 && `Piso ${String(g.pisoTm2).replace(".", ",")} t/m²`,
    g.energiaKva && `${fmt(g.energiaKva)} kVA`,
    g.sprinklers && "Sprinklers",
    g.escritorioM2 && `Escritório ${fmt(g.escritorioM2)} m²`,
    g.patio,
    g.modulosDetalhe?.length && g.modulosDetalhe.length > 1
      ? `${g.modulosDetalhe.length} módulos a partir de ${fmt(Math.min(...g.modulosDetalhe.map((m) => m.areaM2)))} m²`
      : g.modulos && g.modulos > 1 ? `${g.modulos} módulos` : "",
    ...(g.extras ?? []),
  ].filter((x): x is string => !!x);

const PATIO = 34; // metros de pátio na frente das docas
const SEG = 6; // paredes em pedaços de até 6 m (ordem do pintor com caminhões e pilares)

const paredeEmPedacos = (x: number, y: number, comp: number, aoLongoX: boolean, esp: number, h: number, parte: Face["parte"]): Caixa[] => {
  const n = Math.max(1, Math.ceil(comp / SEG));
  return Array.from({ length: n }, (_, i) => {
    const a = (comp / n) * i, l = comp / n;
    return aoLongoX ? { x: x + a, y, z: 0, w: l, d: esp, h, cor: COR.parede, parte } : { x, y: y + a, z: 0, w: esp, d: l, h, cor: COR.parede, parte };
  });
};

type Modulo = { nome: string; x: number; w: number; areaM2: number; docas: number; disponivel?: boolean };

// Divide a nave em módulos pelo comprimento (proporcional à área de cada um). Sem módulos: um só, "Galpão".
export const modulosDoGalpao = (g: FichaGalpao, C: number): Modulo[] => {
  const det = g.modulosDetalhe?.length ? g.modulosDetalhe : g.modulos && g.modulos > 1
    ? Array.from({ length: g.modulos }, (_, i) => ({ nome: `Módulo ${String.fromCharCode(65 + i)}`, areaM2: g.areaConstruidaM2 / g.modulos!, docas: undefined as number | undefined, disponivel: undefined as boolean | undefined }))
    : [{ nome: "Galpão", areaM2: g.areaConstruidaM2, docas: g.docas, disponivel: undefined as boolean | undefined }];
  const total = det.reduce((a, m) => a + m.areaM2, 0);
  const docasSemDono = Math.max(0, g.docas - det.reduce((a, m) => a + (m.docas ?? 0), 0));
  const semDono = det.filter((m) => m.docas === undefined).length;
  let x = 0;
  return det.map((m, i) => {
    const w = (m.areaM2 / total) * C;
    const docas = m.docas ?? Math.floor(docasSemDono / semDono) + (i < docasSemDono % semDono ? 1 : 0);
    const mod = { nome: m.nome, x, w, areaM2: m.areaM2, docas, disponivel: m.disponivel };
    x += w;
    return mod;
  });
};

export const montarGalpao = (g: FichaGalpao, { explosao, cor = "#C8643C" }: { explosao: number; cor?: string }): Face[] => {
  const e = Math.min(1, Math.max(0, explosao));
  const { largura: L, comprimento: C } = dimensoesGalpao(g);
  const H = g.peDireitoM;
  const P = projetarIso;
  const pisos: Face[] = [];
  const caixas: Caixa[] = [];
  const chao = (x: number, y: number, w: number, d: number, corChao: string, parte: Face["parte"], prof: number, rotulo?: Face["rotulo"]) =>
    pisos.push({ pts: [P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)], tom: "chao", cor: corChao, prof, parte, rotulo, comodo: rotulo?.texto });
  const mods = modulosDoGalpao(g, C);
  const n = mods.length;
  const afasta = n > 1 ? 9 : 0; // ao desmontar, módulos se separam 9 m
  const esp = 0.3;
  let doca = 0;

  // pátio com faixas de vaga na frente das docas (acompanha a explosão)
  chao(-4 - (afasta * e * (n - 1)) / 2, L, C + 8 + afasta * e * (n - 1), PATIO, COR.patio, "patio", -2e6);

  mods.forEach((m, i) => {
    const dx = (i - (n - 1) / 2) * afasta * e;
    const x0 = m.x + dx;
    const centro = P(x0 + m.w / 2, L / 2, 0);
    const sub = n > 1 ? `${fmt(m.areaM2)} m² · ${m.docas} docas${m.disponivel === false ? " · ocupado" : m.disponivel ? " · disponível" : ""}` : `${fmt(g.areaConstruidaM2)} m² · pé-direito ${String(H).replace(".", ",")} m`;
    chao(x0, 0, m.w, L, m.disponivel === false ? "#CBC7BF" : m.disponivel ? "#D7E6EA" : COR.piso, "piso", -1.9e6 + i, { x: centro[0], y: centro[1], texto: m.nome, sub });

    // docas do módulo, espalhadas pela frente dele
    const passo = m.docas ? Math.min(6, (m.w - 6) / m.docas) : 0;
    const ini = x0 + (m.w - passo * m.docas) / 2;
    for (let k = 0; k < m.docas; k++, doca++) {
      const x = ini + k * passo + (passo - 3) / 2;
      caixas.push({ x, y: L - 0.05, z: 1.2, w: 3, d: 0.25, h: 3.2, cor: COR.porta, parte: "doca", comodo: `doca-${doca + 1}` });
      chao(x - 0.5, L, 4, 0.12, COR.faixa, "patio", -1.95e6);
      if (doca % Math.max(1, Math.ceil(g.docas / 4)) === 0) {
        caixas.push({ x: x + 0.2, y: L + 1.2, z: 1.1, w: 2.6, d: 13.6, h: 3.0, cor: COR.bau, parte: "caminhao" });
        caixas.push({ x: x + 0.2, y: L + 15.1, z: 0.6, w: 2.6, d: 2.6, h: 3.0, cor, parte: "caminhao" });
      }
    }

    // paredes: fundo inteiro; lateral esquerda inteira (entre módulos é a divisória); frente e última lateral baixas
    caixas.push(...paredeEmPedacos(x0, 0, m.w, true, esp, H + 1.5, "parede-fundo"));
    caixas.push(...paredeEmPedacos(x0, esp, L - esp, false, esp, H + 1.5, i === 0 ? "parede-fundo" : "divisoria"));
    caixas.push(...paredeEmPedacos(x0, L - esp, m.w, true, esp, 1.1, "parede-frente"));
    if (i === n - 1 || e > 0.05) caixas.push(...paredeEmPedacos(x0 + m.w - esp, esp, L - 2 * esp, false, esp, i === n - 1 ? 1.1 : H + 1.5, i === n - 1 ? "parede-frente" : "divisoria"));

    // pilares do módulo
    const nx = Math.max(1, Math.round(m.w / 22)), ny = Math.max(1, Math.round(L / 25));
    for (let a = 1; a < nx; a++) for (let b = 1; b < ny; b++) caixas.push({ x: x0 + (m.w / nx) * a - 0.3, y: (L / ny) * b - 0.3, z: 0, w: 0.6, d: 0.6, h: H, cor: COR.pilar, parte: "pilar" });

    // escritório no primeiro módulo
    let fimEscritorio = x0;
    if (i === 0 && g.escritorioM2 && g.escritorioM2 > 0) {
      const w = Math.min(m.w * 0.35, Math.sqrt(g.escritorioM2 / 2) * 2);
      const d = Math.min(L * 0.6, g.escritorioM2 / 2 / w);
      caixas.push({ x: x0 + esp, y: esp, z: 0, w, d, h: 6, cor: COR.escritorio, parte: "escritorio", comodo: "Escritório" });
      fimEscritorio = x0 + w + 4;
    }

    // porta-paletes (módulo ocupado aparece vazio de propósito? não: ocupado = cheio, disponível = vazio e limpo)
    if (m.disponivel !== true) {
      const altRack = Math.min(H - 2, 9);
      const rx0 = Math.max(fimEscritorio, x0 + m.w * 0.08), rx1 = x0 + m.w * 0.94;
      for (let y = L * 0.12; y + 1.1 <= L * 0.68; y += 1.1 + 3.5) {
        for (let x = rx0; x < rx1 - 1; x += SEG) {
          const w = Math.min(SEG - 0.4, rx1 - x);
          caixas.push({ x, y, z: 0, w, d: 1.1, h: altRack, cor: COR.rack, parte: "movel" });
          caixas.push({ x: x + 0.15, y: y + 0.05, z: altRack - 0.01, w: w - 0.3, d: 1.0, h: 0.01, cor: COR.carga, parte: "movel" });
        }
      }
    }

    if (e < 0.98) caixas.push({ x: x0 - (i === 0 ? 1 : 0), y: -1, z: H + 1.5 + e * 22, w: m.w + (i === 0 || i === n - 1 ? 1 : 0), d: L + 2, h: 0.6, cor: COR.telhado, parte: "laje", opacidade: 1 - e });
  });

  const faces = caixas.flatMap(facesDaCaixa);
  for (const f of faces) if (f.parte === "laje") f.prof = 1e6;
  return [...pisos, ...faces].sort((a, b) => a.prof - b.prof);
};
