import { test } from "node:test";
import assert from "node:assert/strict";
import { escolherPontos, tipoDePoi, tipoDeTags } from "../ferramentas/lib/pontos.ts";
import type { Ponto } from "../src/ficha.ts";

const local = { lat: -23.4339, lon: -45.0712 };
const p = (id: string, tipo: Ponto["tipo"], dLat: number): Ponto => ({ id, nome: id, tipo, lat: local.lat + dLat, lon: local.lon, noVideo: false });

test("escolherPontos pega o mais perto de cada tipo", () => {
  const r = escolherPontos([p("mercado-longe", "mercado", 0.01), p("mercado-perto", "mercado", 0.002)], local);
  assert.deepEqual(r.map((x) => x.id), ["mercado-perto"]);
});

test("escolherPontos aceita até 2 restaurantes", () => {
  const r = escolherPontos([p("r1", "restaurante", 0.001), p("r2", "restaurante", 0.002), p("r3", "restaurante", 0.003)], local);
  assert.deepEqual(r.map((x) => x.id), ["r1", "r2"]);
});

test("escolherPontos ordena pela prioridade e marca os 5 primeiros para o vídeo", () => {
  const r = escolherPontos(
    [
      p("hosp", "hospital", 0.001), p("farm", "farmacia", 0.001), p("praia", "praia", 0.009), p("merc", "mercado", 0.001),
      p("parq", "parque", 0.001), p("pad", "padaria", 0.001), p("rest", "restaurante", 0.001),
    ],
    local,
  );
  assert.deepEqual(r.map((x) => x.id), ["praia", "merc", "parq", "pad", "farm", "rest", "hosp"]);
  assert.deepEqual(r.map((x) => x.noVideo), [true, true, true, true, true, false, false]);
});

test("escolherPontos não passa de 12", () => {
  const muitos = Array.from({ length: 40 }, (_, i) => p("a" + i, (["praia", "metro", "mercado", "padaria", "farmacia", "hospital", "restaurante", "parque", "shopping", "atracao", "trem", "onibus", "aeroporto"] as const)[i % 13], 0.001 * (i + 1)));
  assert.ok(escolherPontos(muitos, local).length <= 12);
});

test("tipoDeTags reconhece praia, metrô, mercado e rodoviária", () => {
  assert.equal(tipoDeTags({ natural: "beach", name: "Praia" }), "praia");
  assert.equal(tipoDeTags({ station: "subway", railway: "station", name: "Sé" }), "metro");
  assert.equal(tipoDeTags({ shop: "supermarket", name: "X" }), "mercado");
  assert.equal(tipoDeTags({ amenity: "bus_station", name: "Rodoviária de Ubatuba" }), "rodoviaria");
  assert.equal(tipoDeTags({ amenity: "bus_station", name: "Terminal Centro" }), "onibus");
  assert.equal(tipoDeTags({ amenity: "bench" }), null);
});

test("tipoDePoi traduz as classes do OpenFreeMap", () => {
  assert.equal(tipoDePoi({ class: "grocery", subclass: "supermarket", name: "X" }), "mercado");
  assert.equal(tipoDePoi({ class: "railway", subclass: "subway", name: "Trianon" }), "metro");
  assert.equal(tipoDePoi({ class: "pharmacy", subclass: "pharmacy", name: "Y" }), "farmacia");
  assert.equal(tipoDePoi({ class: "attraction", subclass: "viewpoint", name: "Mirante" }), "atracao");
  assert.equal(tipoDePoi({ class: "bus", subclass: "bus_stop", name: "Ponto" }), null);
  assert.equal(tipoDePoi({ class: "bus", subclass: "bus_station", name: "Rodoviária Nova" }), "rodoviaria");
});
