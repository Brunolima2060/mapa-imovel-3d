import { test } from "node:test";
import assert from "node:assert/strict";
import { posicaoVeiculo, veiculosNasRuas } from "../src/cena/transito.ts";
import type { Rua } from "../src/cidade.ts";

const avenida: Rua = { p: [[-500, 0], [500, 0]], tipo: "principal" };
const rodovia: Rua = { p: [[0, -800], [0, 800]], tipo: "principal", rodovia: 1 };

test("veículos só nas vias principais, com caminhões na rodovia", () => {
  const v = veiculosNasRuas([avenida, rodovia, { p: [[0, 0], [100, 100]], tipo: "local" }]);
  assert.ok(v.length > 20);
  assert.ok(v.some((x) => x.tipo === "caminhao" && x.rua === 1));
  assert.ok(v.every((x) => x.rua !== 2), "rua local fica sem trânsito");
});

test("veículo fica na pista (até 4 m do eixo) e anda com o tempo", () => {
  const v = veiculosNasRuas([avenida]);
  for (const x of v) {
    const [px0, pz0] = posicaoVeiculo(x, 0);
    const [px1] = posicaoVeiculo(x, 2);
    assert.ok(Math.abs(pz0) <= 4, `fora da pista: ${pz0}`);
    assert.ok(Math.abs(px1 - px0) > 5, "parado");
  }
});

test("mãos opostas andam em sentidos opostos", () => {
  const v = veiculosNasRuas([avenida]);
  const sentidos = new Set(v.map((x) => Math.sign(posicaoVeiculo(x, 1)[0] - posicaoVeiculo(x, 0)[0])));
  assert.deepEqual([...sentidos].sort(), [-1, 1]);
});
