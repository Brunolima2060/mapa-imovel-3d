import { test } from "node:test";
import assert from "node:assert/strict";
import { lerTile } from "../ferramentas/lib/mvt.ts";

// Escritor mínimo de protobuf, só para montar um tile de teste.
const varint = (n: number) => { const b: number[] = []; while (n > 127) { b.push((n & 127) | 128); n = Math.floor(n / 128); } b.push(n); return b; };
const campo = (num: number, tipo: number) => varint((num << 3) | tipo);
const bytes = (num: number, dados: number[]) => [...campo(num, 2), ...varint(dados.length), ...dados];
const texto = (num: number, s: string) => bytes(num, [...Buffer.from(s, "utf8")]);
const num = (num_: number, v: number) => [...campo(num_, 0), ...varint(v)];
const zz = (n: number) => (n << 1) ^ (n >> 31);
const cmd = (id: number, n: number) => (n << 3) | id;
const dbl = (num_: number, v: number) => { const b = Buffer.alloc(8); b.writeDoubleLE(v); return [...campo(num_, 1), ...b]; };

const quadrado = [cmd(1, 1), zz(100), zz(100), cmd(2, 3), zz(200), zz(0), zz(0), zz(200), zz(-200), zz(0), cmd(7, 1)];
const linha = [cmd(1, 1), zz(0), zz(0), cmd(2, 2), zz(10), zz(0), zz(0), zz(10)];
const camadaPredio = [
  ...num(15, 2), ...texto(1, "building"),
  ...bytes(2, [...num(1, 9), ...bytes(2, [0, 0]), ...num(3, 3), ...bytes(4, quadrado.flatMap(varint))]),
  ...texto(3, "render_height"), ...bytes(4, dbl(3, 12.5)), ...num(5, 4096),
];
const camadaRua = [
  ...num(15, 2), ...texto(1, "transportation"),
  ...bytes(2, [...bytes(2, [0, 0]), ...num(3, 2), ...bytes(4, linha.flatMap(varint))]),
  ...texto(3, "class"), ...bytes(4, texto(1, "primary")), ...num(5, 4096),
];
const tile = Buffer.from([...bytes(3, camadaPredio), ...bytes(3, camadaRua)]);

test("lerTile decodifica polígono com altura e linha com classe", () => {
  const t = lerTile(tile);
  const p = t.building.features[0];
  assert.equal(t.building.extent, 4096);
  assert.equal(p.type, 3);
  assert.equal(p.tags.render_height, 12.5);
  assert.deepEqual(p.geometry, [[[100, 100], [300, 100], [300, 300], [100, 300]]]);
  const r = t.transportation.features[0];
  assert.equal(r.tags.class, "primary");
  assert.deepEqual(r.geometry, [[[0, 0], [10, 0], [10, 10]]]);
});
