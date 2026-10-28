import { test } from "node:test";
import assert from "node:assert/strict";
import { espalharArvores } from "../ferramentas/lib/arvores.ts";
import { pontoNoPoligono } from "../ferramentas/lib/reserva.ts";
import type { XZ } from "../src/cidade.ts";

const mata: XZ[] = [[0, 0], [200, 0], [200, 200], [0, 200]];

test("árvores caem dentro do verde e na densidade pedida", () => {
  const a = espalharArvores({ verde: [mata], predios: [], agua: [], ruas: [], semente: "x", densidadeM2: 200 });
  assert.ok(a.length > 150 && a.length < 260, String(a.length));
  assert.ok(a.every(([x, z]) => pontoNoPoligono([x, z], mata)));
  assert.ok(a.every(([, , s]) => s >= 0.7 && s <= 1.4), "tamanho variado");
});

test("árvore não nasce dentro de prédio, na água nem no meio da rua", () => {
  const predio = { p: [[50, 50], [150, 50], [150, 150], [50, 150]] as XZ[], h: 10, b: 0 };
  const lago: XZ[] = [[0, 0], [200, 0], [200, 30], [0, 30]];
  const rua = { p: [[0, 180], [200, 180]] as XZ[], tipo: "local" as const };
  const a = espalharArvores({ verde: [mata], predios: [predio], agua: [lago], ruas: [rua], semente: "x", densidadeM2: 100 });
  assert.ok(a.length > 0);
  assert.ok(a.every(([x, z]) => !pontoNoPoligono([x, z], predio.p) && !pontoNoPoligono([x, z], lago)));
  assert.ok(a.every(([, z]) => Math.abs(z - 180) > 4), "fora da pista");
});

test("árvores têm teto (computador comum aguenta)", () => {
  const enorme: XZ[] = [[-1500, -1500], [1500, -1500], [1500, 1500], [-1500, 1500]];
  assert.ok(espalharArvores({ verde: [enorme], predios: [], agua: [], ruas: [], semente: "x", densidadeM2: 50, maximo: 12000 }).length <= 12000);
});
