import { test } from "node:test";
import assert from "node:assert/strict";
import { esquemaFicha, fichaPublica, sortearArea } from "../src/ficha.ts";
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
    area: sortearArea(real, 250),
    guia: { origem: { nome: "Rodoviária", lat: -23.44, lon: -45.08 }, entrada: "Portão azul, código 1234" },
  });

test("fichaPublica aproximada não vaza rua, coordenadas reais nem o guia", () => {
  const txt = JSON.stringify(fichaPublica(base()));
  for (const proibido of ["Flores", "código 1234", "Rodoviária"]) {
    assert.ok(!txt.includes(proibido), `vazou: ${proibido}`);
  }
  for (const n of [/-23\.4339(?!\d)/, /-45\.0712(?!\d)/]) {
    assert.ok(!n.test(txt), `vazou a coordenada real ${n}`);
  }
  assert.ok(txt.includes("Praia do Itaguá"));
});

test("fichaPublica exata usa o ponto real como centro", () => {
  const f = { ...base(), localizacao: "exata" as const };
  assert.deepEqual(fichaPublica(f).centro, real);
});

test("fichaPublica aproximada usa a área salva na ficha quando existe", () => {
  const area = { lat: -23.4330, lon: -45.0712 }; // ~100 m ao norte
  assert.deepEqual(fichaPublica({ ...base(), area }).centro, area);
});
