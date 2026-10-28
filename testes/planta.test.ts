import { test } from "node:test";
import assert from "node:assert/strict";
import { montarPlanta, posicionarMoveis, rotuloArea } from "../src/planta/geometria.ts";
import type { Planta } from "../src/ficha.ts";

const sala: Planta = { comodos: [{ nome: "Sala", tipo: "sala", x: 0, y: 0, w: 4, h: 3 }] };
const ape: Planta = {
  comodos: [
    { nome: "Sala", tipo: "sala", x: 0, y: 0, w: 5, h: 4 },
    { nome: "Quarto", tipo: "quarto", x: 5, y: 0, w: 3.5, h: 4 },
    { nome: "Cozinha", tipo: "cozinha", x: 0, y: 4, w: 3, h: 2.5 },
    { nome: "Banheiro", tipo: "banheiro", x: 3, y: 4, w: 2, h: 2.5 },
  ],
  moveis: [
    { tipo: "sofa", comodo: "Sala" }, { tipo: "mesa", comodo: "Sala" }, { tipo: "tv", comodo: "Sala" },
    { tipo: "cama", comodo: "Quarto" }, { tipo: "armario", comodo: "Quarto" },
    { tipo: "pia", comodo: "Cozinha" }, { tipo: "fogao", comodo: "Cozinha" }, { tipo: "geladeira", comodo: "Cozinha" },
    { tipo: "vaso", comodo: "Banheiro" }, { tipo: "chuveiro", comodo: "Banheiro" },
  ],
};

test("faces saem na ordem do pintor (prof crescente)", () => {
  const f = montarPlanta(ape, { explosao: 0.4 });
  for (let i = 1; i < f.length; i++) assert.ok(f[i].prof >= f[i - 1].prof, `fora de ordem em ${i}`);
});

test("sala 4x3 tem piso e as paredes do fundo vêm antes das da frente", () => {
  const f = montarPlanta(sala, { explosao: 0 });
  assert.ok(f.some((x) => x.tom === "chao" && x.comodo === "Sala"));
  const fundo = f.filter((x) => x.parte === "parede-fundo");
  const frente = f.filter((x) => x.parte === "parede-frente");
  assert.ok(fundo.length > 0 && frente.length > 0);
  const media = (l: typeof f) => l.reduce((a, x) => a + x.prof, 0) / l.length;
  assert.ok(media(fundo) < media(frente));
  const idx = (x: (typeof f)[number]) => f.indexOf(x);
  assert.ok(Math.min(...fundo.map(idx)) < Math.min(...frente.map(idx)), "algum pedaço do fundo é pintado antes da frente");
});

test("rótulo do cômodo traz o nome e a área com vírgula", () => {
  assert.equal(rotuloArea(sala.comodos[0]), "12,0 m²");
  const f = montarPlanta(sala, { explosao: 0 });
  assert.ok(f.some((x) => x.rotulo?.texto === "Sala" && x.rotulo.sub === "12,0 m²"));
});

test("móveis automáticos ficam dentro do cômodo e não se sobrepõem", () => {
  const m = posicionarMoveis(ape);
  assert.equal(m.length, 10);
  for (const a of m) {
    const c = ape.comodos.find((x) => x.nome === a.comodo)!;
    assert.ok(a.x >= c.x - 1e-9 && a.y >= c.y - 1e-9 && a.x + a.w <= c.x + c.w + 1e-9 && a.y + a.d <= c.y + c.h + 1e-9, `${a.tipo} fora de ${c.nome}`);
  }
  for (let i = 0; i < m.length; i++)
    for (let j = i + 1; j < m.length; j++) {
      const a = m[i], b = m[j];
      const sobrepoe = a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.d - 1e-9 && b.y < a.y + a.d - 1e-9;
      assert.ok(!sobrepoe, `${a.tipo} sobre ${b.tipo}`);
    }
});

test("explosão afasta os cômodos do centro", () => {
  const f0 = montarPlanta(ape, { explosao: 0 }).filter((x) => x.tom === "chao" && x.comodo === "Quarto");
  const f1 = montarPlanta(ape, { explosao: 1 }).filter((x) => x.tom === "chao" && x.comodo === "Quarto");
  const cx = (fs: typeof f0) => fs[0].pts.reduce((a, p) => a + p[0], 0) / fs[0].pts.length;
  assert.notEqual(cx(f0).toFixed(3), cx(f1).toFixed(3));
});
