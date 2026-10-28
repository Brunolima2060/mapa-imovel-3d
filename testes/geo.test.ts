import { test } from "node:test";
import assert from "node:assert/strict";
import { criarSlug, deMetros, lerCoordenadas, metrosEntre, paraMetros } from "../ferramentas/lib/geo.ts";

test("lerCoordenadas aceita par lat,lon digitado", () => {
  assert.deepEqual(lerCoordenadas("-23.43, -45.07"), { lat: -23.43, lon: -45.07 });
});

test("lerCoordenadas aceita link do Google Maps com @lat,lon", () => {
  assert.deepEqual(lerCoordenadas("https://www.google.com/maps/place/x/@-23.4339,-45.0712,17z"), { lat: -23.4339, lon: -45.0712 });
});

test("lerCoordenadas aceita link com ?q=lat,lon", () => {
  assert.deepEqual(lerCoordenadas("https://maps.google.com/?q=-23.4,-45.0"), { lat: -23.4, lon: -45.0 });
});

test("lerCoordenadas devolve null para endereço em texto", () => {
  assert.equal(lerCoordenadas("Rua das Flores, 123, Ubatuba"), null);
});

test("criarSlug tira acento, símbolo e espaço", () => {
  assert.equal(criarSlug("Apê Praia Grande — 12"), "ape-praia-grande-12");
});

test("metrosEntre mede ~111 km por grau de latitude", () => {
  const d = metrosEntre({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
  assert.ok(Math.abs(d - 111195) < 200, String(d));
});

test("paraMetros e deMetros são inversos (x leste, z sul)", () => {
  const o = { lat: -23.5, lon: -46.6 };
  const p = { lat: -23.49, lon: -46.59 };
  const [x, z] = paraMetros(o, p);
  assert.ok(x > 0 && z < 0, "ponto a nordeste: x>0, z<0");
  const v = deMetros(o, [x, z]);
  assert.ok(Math.abs(v.lat - p.lat) < 1e-9 && Math.abs(v.lon - p.lon) < 1e-9);
});
