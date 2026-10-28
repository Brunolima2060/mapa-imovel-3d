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
    g.modulos && g.modulos > 1 ? `${g.modulos} módulos` : "",
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

export const montarGalpao = (g: FichaGalpao, { explosao, cor = "#C8643C" }: { explosao: number; cor?: string }): Face[] => {
  const e = Math.min(1, Math.max(0, explosao));
  const { largura: L, comprimento: C } = dimensoesGalpao(g);
  const H = g.peDireitoM;
  const P = projetarIso;
  const pisos: Face[] = [];
  const caixas: Caixa[] = [];
  const chao = (x: number, y: number, w: number, d: number, cor: string, parte: Face["parte"], prof: number, rotulo?: Face["rotulo"]) =>
    pisos.push({ pts: [P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)], tom: "chao", cor, prof, parte, rotulo, comodo: rotulo?.texto });

  // pátio com faixas de vaga na frente das docas
  chao(-4, L, C + 8, PATIO, COR.patio, "patio", -2e6);
  const centro = P(C / 2, L / 2, 0);
  chao(0, 0, C, L, COR.piso, "piso", -1.9e6, { x: centro[0], y: centro[1], texto: "Galpão", sub: `${fmt(g.areaConstruidaM2)} m² · pé-direito ${String(H).replace(".", ",")} m` });

  // docas: portas na fachada da frente (y = L), espalhadas pelo comprimento, longe dos cantos
  const nDocas = Math.max(0, g.docas);
  const passo = nDocas ? Math.min(6, (C - 8) / nDocas) : 0;
  const ini = (C - passo * nDocas) / 2;
  for (let i = 0; i < nDocas; i++) {
    const x = ini + i * passo + (passo - 3) / 2;
    caixas.push({ x, y: L - 0.05, z: 1.2, w: 3, d: 0.25, h: 3.2, cor: COR.porta, parte: "doca", comodo: `doca-${i + 1}` });
    chao(x - 0.5, L, 4, 0.12, COR.faixa, "patio", -1.95e6);
    // caminhão encostado em até 4 docas
    if (i % Math.max(1, Math.ceil(nDocas / 4)) === 0) {
      caixas.push({ x: x + 0.2, y: L + 1.2, z: 1.1, w: 2.6, d: 13.6, h: 3.0, cor: COR.bau, parte: "caminhao" });
      caixas.push({ x: x + 0.2, y: L + 15.1, z: 0.6, w: 2.6, d: 2.6, h: 3.0, cor, parte: "caminhao" });
    }
  }

  // paredes: fundo inteiras (platibanda +1,5 m), frente cortadas para ver dentro
  const esp = 0.3;
  caixas.push(...paredeEmPedacos(0, 0, C, true, esp, H + 1.5, "parede-fundo"));
  caixas.push(...paredeEmPedacos(0, esp, L - esp, false, esp, H + 1.5, "parede-fundo"));
  caixas.push(...paredeEmPedacos(0, L - esp, C, true, esp, 1.1, "parede-frente"));
  caixas.push(...paredeEmPedacos(C - esp, esp, L - 2 * esp, false, esp, 1.1, "parede-frente"));

  // pilares: vãos de ~22 m no comprimento e ~25 m na largura
  const nx = Math.max(1, Math.round(C / 22)), ny = Math.max(1, Math.round(L / 25));
  for (let i = 1; i < nx; i++) for (let j = 1; j < ny; j++) caixas.push({ x: (C / nx) * i - 0.3, y: (L / ny) * j - 0.3, z: 0, w: 0.6, d: 0.6, h: H, cor: COR.pilar, parte: "pilar" });

  // mezanino de escritório no canto do fundo
  let fimEscritorio = 0;
  if (g.escritorioM2 && g.escritorioM2 > 0) {
    const w = Math.min(C * 0.3, Math.sqrt(g.escritorioM2 / 2) * 2);
    const d = Math.min(L * 0.6, g.escritorioM2 / 2 / w);
    caixas.push({ x: esp, y: esp, z: 0, w, d, h: 6, cor: COR.escritorio, parte: "escritorio", comodo: "Escritório" });
    fimEscritorio = w + 4;
  }

  // porta-paletes: fileiras ao longo do comprimento, com corredores de 3,5 m, longe das docas
  const altRack = Math.min(H - 2, 9);
  const x0 = Math.max(fimEscritorio, C * 0.08), x1 = C * 0.94;
  for (let y = L * 0.12; y + 1.1 <= L * 0.68; y += 1.1 + 3.5) {
    for (let x = x0; x < x1 - 1; x += SEG) {
      const w = Math.min(SEG - 0.4, x1 - x);
      caixas.push({ x, y, z: 0, w, d: 1.1, h: altRack, cor: COR.rack, parte: "movel" });
      caixas.push({ x: x + 0.15, y: y + 0.05, z: altRack - 0.01, w: w - 0.3, d: 1.0, h: 0.01, cor: COR.carga, parte: "movel" });
    }
  }

  if (e < 0.98) caixas.push({ x: -1, y: -1, z: H + 1.5 + e * 22, w: C + 2, d: L + 2, h: 0.6, cor: COR.telhado, parte: "laje", opacidade: 1 - e });
  const faces = caixas.flatMap(facesDaCaixa);
  for (const f of faces) if (f.parte === "laje") f.prof = 1e6;
  return [...pisos, ...faces].sort((a, b) => a.prof - b.prof);
};
