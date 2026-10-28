import { test } from "node:test";
import assert from "node:assert/strict";
import { esquemaFicha } from "../src/ficha.ts";

test("esquemaFicha aplica os padrões de privacidade e chamada", () => {
  const f = esquemaFicha.parse({
    versao: 1,
    slug: "ape",
    nome: "Apê",
    endereco: "Rua X, 1",
    local: { lat: -23.4, lon: -45.0 },
    pontos: [],
    marca: { nome: "Minha marca" },
  });
  assert.equal(f.localizacao, "aproximada");
  assert.equal(f.raioAproxM, 250);
  assert.equal(f.chamada, "Reserve agora");
  assert.equal(f.marca.cor, "#C8643C");
});

test("esquemaFicha recusa latitude impossível", () => {
  assert.throws(() =>
    esquemaFicha.parse({ versao: 1, slug: "a", nome: "a", endereco: "", local: { lat: 123, lon: 0 }, pontos: [], marca: { nome: "m" } }),
  );
});
