import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraNoTrajeto, pontoEm, recorteFinal, type XZ } from "../src/cena/trajeto.ts";

const rota: XZ[] = [[-5000, 0], [-2000, 0], [-1000, 0], [-500, 0], [-500, -400], [0, -400], [0, 0]];

test("recorteFinal fica só com o fim da rota dentro do alcance", () => {
  const r = recorteFinal(rota, 1300);
  assert.deepEqual(r[r.length - 1], [0, 0]);
  assert.deepEqual(r[0], [-1000, 0]);
  assert.ok(r.slice(1).every(([x, z]) => Math.hypot(x, z) <= 1300));
});

test("pontoEm vai do começo ao fim pelo comprimento", () => {
  const r = recorteFinal(rota, 1300);
  assert.deepEqual(pontoEm(r, 0), [-1000, 0]);
  assert.deepEqual(pontoEm(r, 1), [0, 0]);
  const meio = pontoEm(r, 650 / 1800); // comprimento total 1800 m; 650 m = 500 na reta + 150 na subida
  assert.ok(Math.abs(meio[0] + 500) < 1e-6 && Math.abs(meio[1] + 150) < 1e-6, String(meio));
});

test("câmera do trajeto não dá saltos", () => {
  const r = recorteFinal(rota, 1300);
  let ant = cameraNoTrajeto(r, 0, true);
  for (let i = 1; i <= 240; i++) {
    const q = cameraNoTrajeto(r, i / 240, true);
    const d = Math.hypot(q.pos[0] - ant.pos[0], q.pos[1] - ant.pos[1], q.pos[2] - ant.pos[2]);
    assert.ok(d < 40, `salto ${d.toFixed(1)} m no passo ${i}`);
    ant = q;
  }
});
