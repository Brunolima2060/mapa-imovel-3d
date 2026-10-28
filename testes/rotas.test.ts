import { test } from "node:test";
import assert from "node:assert/strict";
import { minutosDe, rotuloTempo } from "../src/tempo.ts";
import { melhorTrecho, trechoSuspeito } from "../ferramentas/lib/rotas.ts";

test("rotuloTempo usa a pé até 20 min", () => {
  assert.equal(rotuloTempo({ ape: { metros: 300, minutos: 4 } }), "4 min a pé");
  assert.equal(rotuloTempo({ ape: { metros: 1600, minutos: 20 } }), "20 min a pé");
});

test("rotuloTempo passa para carro acima de 20 min a pé", () => {
  assert.equal(rotuloTempo({ ape: { metros: 2500, minutos: 25 }, carro: { metros: 2600, minutos: 7 } }), "7 min de carro");
});

test("rotuloTempo sem rota não inventa tempo", () => {
  assert.equal(rotuloTempo({}), null);
  assert.equal(rotuloTempo({ ape: { metros: 5000, minutos: 60 } }), null);
});

test("minutosDe arredonda sempre para cima e nunca dá zero", () => {
  assert.equal(minutosDe(61), 2);
  assert.equal(minutosDe(60), 1);
  assert.equal(minutosDe(0), 1);
});

test("trechoSuspeito pega rota muito maior que a reta em ponto perto", () => {
  assert.equal(trechoSuspeito(270, { metros: 945, minutos: 13 }), true);
  assert.equal(trechoSuspeito(270, { metros: 420, minutos: 6 }), false);
  assert.equal(trechoSuspeito(2000, { metros: 6000, minutos: 70 }), false); // longe: não mexe
  assert.equal(trechoSuspeito(270, undefined), false);
});

test("melhorTrecho fica com a menor rota e soma o desvio, sem nunca ficar abaixo da reta", () => {
  const r = melhorTrecho({ metros: 945, minutos: 13 }, [{ metros: 300, minutos: 4 }, undefined, { metros: 500, minutos: 7 }], 30, 270);
  assert.deepEqual(r, { metros: 330, minutos: 5 });
  const r2 = melhorTrecho({ metros: 945, minutos: 13 }, [{ metros: 100, minutos: 2 }], 30, 270);
  assert.ok(r2!.metros >= 270);
});
