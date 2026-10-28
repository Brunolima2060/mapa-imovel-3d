import { test } from "node:test";
import assert from "node:assert/strict";
import { montarRoteiro, quadroCamera } from "../src/cena/camera.ts";

test("roteiro soma abertura, chegada, pontos, planta, fotos (máx. 4) e fecho", () => {
  const r = montarRoteiro({ nPontos: 4, comPlanta: true, nFotos: 6, fps: 30 });
  assert.equal(r.total, Math.round((2.5 + 3 + 4 * 3 + 5 + 4 * 2 + 3) * 30));
  assert.deepEqual(r.cenas.map((c) => c.tipo), ["abertura", "chegada", "ponto", "ponto", "ponto", "ponto", "planta", "foto", "foto", "foto", "foto", "fecho"]);
  for (let i = 1; i < r.cenas.length; i++) assert.equal(r.cenas[i].ini, r.cenas[i - 1].ini + r.cenas[i - 1].dur);
});

test("roteiro sem planta e sem fotos", () => {
  const r = montarRoteiro({ nPontos: 0, comPlanta: false, nFotos: 0, fps: 30 });
  assert.equal(r.total, Math.round((2.5 + 3 + 3) * 30));
});

test("câmera anda suave: nenhum salto grande entre quadros seguidos", () => {
  const pontos = [{ x: 400, z: -300 }, { x: -900, z: 200 }, { x: 100, z: 1400 }];
  const r = montarRoteiro({ nPontos: 3, comPlanta: false, nFotos: 0, fps: 30 });
  for (const vertical of [true, false]) {
    let ant = quadroCamera(r, 0, pontos, vertical);
    for (let f = 1; f < r.total; f++) {
      const q = quadroCamera(r, f, pontos, vertical);
      const d = Math.hypot(q.pos[0] - ant.pos[0], q.pos[1] - ant.pos[1], q.pos[2] - ant.pos[2]);
      const da = Math.hypot(q.alvo[0] - ant.alvo[0], q.alvo[1] - ant.alvo[1], q.alvo[2] - ant.alvo[2]);
      // salto relativo: até 5% da distância da câmera ao alvo por quadro
      const dist = Math.hypot(q.pos[0] - q.alvo[0], q.pos[1] - q.alvo[1], q.pos[2] - q.alvo[2]);
      assert.ok(d < 0.05 * dist && da < 0.05 * dist, `salto no quadro ${f}: câmera ${d.toFixed(1)} m, alvo ${da.toFixed(1)} m, dist ${dist.toFixed(0)}`);
      ant = q;
    }
  }
});

test("na cena de cada ponto o alvo fica entre o imóvel e o ponto", () => {
  const pontos = [{ x: 800, z: 0 }];
  const r = montarRoteiro({ nPontos: 1, comPlanta: false, nFotos: 0, fps: 30 });
  const c = r.cenas.find((x) => x.tipo === "ponto")!;
  const q = quadroCamera(r, c.ini + Math.floor(c.dur / 2), pontos, true);
  assert.ok(q.alvo[0] > 150 && q.alvo[0] < 650, String(q.alvo[0]));
  assert.ok(q.pos[1] > 200, "câmera no alto");
});
