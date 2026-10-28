// Árvores da maquete: espalhadas nas áreas verdes do OpenStreetMap (matas, parques, gramados), fora de prédios,
// água e pistas. Grade com sorteio dentro de cada célula: cobre por igual e é repetível (semente).

import { sorteador } from "../../src/ficha.ts";
import type { Predio, Rua, XZ } from "../../src/cidade.ts";
import { caixa, distSegmento, Grade, pontoNoPoligono } from "./reserva.ts";

export type Arvore = [number, number, number]; // x, z, escala

type Entrada = { verde: XZ[][]; predios: Predio[]; agua: XZ[][]; ruas: Rua[]; semente: string; densidadeM2?: number; maximo?: number };

const areaPol = (p: XZ[]) => Math.abs(p.reduce((a, [x, z], k) => { const [x2, z2] = p[(k + 1) % p.length]; return a + x * z2 - x2 * z; }, 0)) / 2;

export const espalharArvores = ({ verde, predios, agua, ruas, semente, densidadeM2 = 220, maximo = 14000 }: Entrada): Arvore[] => {
  const rnd = sorteador(semente);
  const areaTotal = verde.reduce((a, p) => a + areaPol(p), 0);
  const dens = Math.max(densidadeM2, areaTotal / maximo); // passou do teto: árvores mais espaçadas
  const lado = Math.sqrt(dens);
  const gPred = new Grade<XZ[]>(40);
  for (const p of predios) { const c = caixa(p.p); gPred.inserir(c.x0, c.z0, c.x1, c.z1, p.p); }
  const gAgua = new Grade<XZ[]>(80);
  for (const a of agua) { const c = caixa(a); gAgua.inserir(c.x0, c.z0, c.x1, c.z1, a); }
  const gRua = new Grade<[XZ, XZ]>(30);
  for (const r of ruas) for (let i = 0; i < r.p.length - 1; i++) { const s: [XZ, XZ] = [r.p[i], r.p[i + 1]]; const c = caixa(s); gRua.inserir(c.x0, c.z0, c.x1, c.z1, s); }
  const saida: Arvore[] = [];
  for (const pol of verde) {
    if (pol.length < 3) continue;
    const c = caixa(pol);
    for (let x = c.x0; x < c.x1; x += lado)
      for (let z = c.z0; z < c.z1; z += lado) {
        const p: XZ = [x + rnd() * lado, z + rnd() * lado];
        const escala = 0.7 + rnd() * 0.7;
        if (!pontoNoPoligono(p, pol)) continue;
        if ([...gPred.perto(p[0], p[1], p[0], p[1])].some((q) => pontoNoPoligono(p, q))) continue;
        if ([...gAgua.perto(p[0], p[1], p[0], p[1])].some((q) => pontoNoPoligono(p, q))) continue;
        if ([...gRua.perto(p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5)].some(([a, b]) => distSegmento(p, a, b) < 5)) continue;
        saida.push([+p[0].toFixed(1), +p[1].toFixed(1), +escala.toFixed(2)]);
        if (saida.length >= maximo) return saida;
      }
  }
  return saida;
};
