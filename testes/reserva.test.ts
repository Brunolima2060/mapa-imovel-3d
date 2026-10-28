import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarReserva, pontoNoPoligono } from "../ferramentas/lib/reserva.ts";
import type { Predio, Rua } from "../src/cidade.ts";

const ruaReta: Rua = { p: [[-100, 0], [100, 0]], tipo: "local" };
const centro = (q: Predio) => [q.p.reduce((a, v) => a + v[0], 0) / q.p.length, q.p.reduce((a, v) => a + v[1], 0) / q.p.length] as [number, number];

test("rua reta de 200 m sem prédios ganha lotes dos dois lados", () => {
  const r = gerarReserva({ ruas: [ruaReta], predios: [], agua: [], terra: () => true, semente: "a" });
  assert.ok(r.length >= 25, `só ${r.length}`);
  assert.ok(r.some((q) => centro(q)[1] > 0) && r.some((q) => centro(q)[1] < 0));
  assert.ok(r.every((q) => q.r === 1 && q.h >= 3 && q.h <= 8));
});

test("lote não nasce em cima de prédio real", () => {
  const real: Predio = { p: [[-30, 3], [30, 3], [30, 25], [-30, 25]], h: 20, b: 0 };
  const r = gerarReserva({ ruas: [ruaReta], predios: [real], agua: [], terra: () => true, semente: "a" });
  assert.ok(r.every((q) => !pontoNoPoligono(centro(q), real.p)));
  assert.ok(r.every((q) => q.p.every((v) => !pontoNoPoligono(v, real.p))));
});

test("lote não nasce na água nem no mar", () => {
  const lago: [number, number][] = [[-100, -40], [100, -40], [100, -2], [-100, -2]];
  const r = gerarReserva({ ruas: [ruaReta], predios: [], agua: [lago], terra: ([x]) => x < 50, semente: "a" });
  assert.ok(r.every((q) => centro(q)[1] > 0), "nenhum do lado do lago");
  assert.ok(r.every((q) => centro(q)[0] < 50), "nenhum no mar");
});

test("lotes não se sobrepõem", () => {
  const cruz: Rua[] = [ruaReta, { p: [[0, -100], [0, 100]], tipo: "principal" }];
  const r = gerarReserva({ ruas: cruz, predios: [], agua: [], terra: () => true, semente: "a" });
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const [ax, az] = centro(r[i]);
      const [bx, bz] = centro(r[j]);
      assert.ok(Math.hypot(ax - bx, az - bz) >= 7.9, `lotes ${i} e ${j} colados`);
    }
});
