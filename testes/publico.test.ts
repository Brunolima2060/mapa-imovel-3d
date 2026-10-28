import { test } from "node:test";
import assert from "node:assert/strict";
import { aproximar, esquemaFicha, fichaPublica } from "../src/ficha.ts";
import { metrosEntre } from "../ferramentas/lib/geo.ts";

const real = { lat: -23.4339, lon: -45.0712 };
const base = () =>
  esquemaFicha.parse({
    versao: 1,
    slug: "ape-itagua",
    nome: "Apê no Itaguá",
    endereco: "Rua das Flores, 123, Ubatuba",
    local: real,
    pontos: [{ id: "p1", nome: "Praia do Itaguá", tipo: "praia", lat: -23.435, lon: -45.07, ape: { metros: 300, minutos: 4 }, noVideo: true }],
    marca: { nome: "Casa da Praia" },
    guia: { origem: { nome: "Rodoviária", lat: -23.44, lon: -45.08 }, entrada: "Portão azul, código 1234" },
  });

test("aproximar mantém o ponto real dentro do círculo e longe do centro", () => {
  for (let i = 0; i < 1000; i++) {
    const c = aproximar(real, 250, "semente-" + i);
    const d = metrosEntre(real, c);
    assert.ok(d <= 250 * 0.7 + 0.01, `muito longe: ${d}`);
    assert.ok(d >= 250 * 0.35 - 0.01, `perto demais: ${d}`);
  }
});

test("aproximar é determinístico pela semente", () => {
  assert.deepEqual(aproximar(real, 250, "x"), aproximar(real, 250, "x"));
  assert.notDeepEqual(aproximar(real, 250, "x"), aproximar(real, 250, "y"));
});

test("fichaPublica aproximada não vaza rua, coordenadas reais nem o guia", () => {
  const txt = JSON.stringify(fichaPublica(base()));
  for (const proibido of ["Flores", "-23.4339", "-45.0712", "código 1234", "Rodoviária"]) {
    assert.ok(!txt.includes(proibido), `vazou: ${proibido}`);
  }
  assert.ok(txt.includes("Praia do Itaguá"));
});

test("fichaPublica exata usa o ponto real como centro", () => {
  const f = { ...base(), localizacao: "exata" as const };
  assert.deepEqual(fichaPublica(f).centro, real);
});

test("fichaPublica aproximada usa a área salva na ficha quando existe", () => {
  const f = { ...base(), area: { lat: -23.432, lon: -45.073 } };
  assert.deepEqual(fichaPublica(f).centro, { lat: -23.432, lon: -45.073 });
});
