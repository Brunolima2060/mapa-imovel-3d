import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buscar, configurarHttp, consultarOverpass } from "../ferramentas/lib/http.ts";

const pastaTemp = () => fs.mkdtempSync(path.join(os.tmpdir(), "mi3d-http-"));
const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });

test("segunda busca da mesma URL vem do cache", async () => {
  let chamadas = 0;
  configurarHttp({ fetch: async () => (chamadas++, resposta(200, { ok: 1 })), esperas: [0, 0, 0], intervaloMin: 0 });
  const cacheDir = pastaTemp();
  assert.deepEqual(await buscar("https://exemplo.org/a", { cacheDir }), { ok: 1 });
  assert.deepEqual(await buscar("https://exemplo.org/a", { cacheDir }), { ok: 1 });
  assert.equal(chamadas, 1);
});

test("429 duas vezes e depois 200: tenta de novo e consegue", async () => {
  const status = [429, 429, 200];
  let chamadas = 0;
  configurarHttp({ fetch: async () => resposta(status[chamadas++], { ok: 2 }), esperas: [0, 0, 0], intervaloMin: 0 });
  assert.deepEqual(await buscar("https://exemplo.org/b", { cacheDir: pastaTemp() }), { ok: 2 });
  assert.equal(chamadas, 3);
});

test("500 em todas as tentativas: erro diz qual serviço caiu", async () => {
  configurarHttp({ fetch: async () => resposta(500, {}), esperas: [0, 0, 0], intervaloMin: 0 });
  await assert.rejects(buscar("https://overpass-api.de/api/interpreter", { cacheDir: pastaTemp() }), /overpass-api\.de.*500/);
});

test("Overpass com 'runtime error' (200 vazio) não vai para o cache e é tentado de novo", async () => {
  const corpos = [{ elements: [], remark: 'runtime error: Query timed out in "query"' }, { elements: [{ id: 1 }] }];
  let chamadas = 0;
  configurarHttp({ fetch: async () => resposta(200, corpos[chamadas++]), esperas: [0, 0, 0], intervaloMin: 0 });
  const cacheDir = pastaTemp();
  assert.deepEqual(await buscar("https://overpass-api.de/api/interpreter", { cacheDir, corpo: "data=x" }), { elements: [{ id: 1 }] });
  assert.equal(chamadas, 2);
});

test("consultarOverpass passa para o espelho quando o principal cai", async () => {
  const hosts: string[] = [];
  configurarHttp({
    fetch: async (u) => {
      const h = new URL(String(u)).host;
      hosts.push(h);
      return h === "overpass-api.de" ? resposta(502, {}) : resposta(200, { elements: [{ id: 7 }] });
    },
    esperas: [0, 0, 0],
    intervaloMin: 0,
  });
  const r = await consultarOverpass("[out:json];node(1);out;", pastaTemp());
  assert.deepEqual(r, { elements: [{ id: 7 }] });
  assert.equal(hosts[0], "overpass-api.de");
  assert.notEqual(hosts.at(-1), "overpass-api.de");
});

test("404 não tenta de novo", async () => {
  let chamadas = 0;
  configurarHttp({ fetch: async () => (chamadas++, resposta(404, {})), esperas: [0, 0, 0], intervaloMin: 0 });
  await assert.rejects(buscar("https://exemplo.org/c", { cacheDir: pastaTemp() }), /404/);
  assert.equal(chamadas, 1);
});

test("servidor que não responde é abandonado pelo limite de tempo", async () => {
  configurarHttp({
    fetch: (_u, init) => new Promise((_ok, falha) => init?.signal?.addEventListener("abort", () => falha(new Error("abortado")))),
    esperas: [0],
    intervaloMin: 0,
    tempoLimite: 50,
  });
  await assert.rejects(buscar("https://lento.org/x", { cacheDir: pastaTemp() }), /lento\.org/);
  configurarHttp({ tempoLimite: 150000 });
});
