import { test } from "node:test";
import assert from "node:assert/strict";
import { esquemaFicha, sortearArea, fichaPublica } from "../src/ficha.ts";
import { dimensoesGalpao, linhasFichaTecnica, montarGalpao } from "../src/planta/galpao.ts";
import { textosImovel } from "../ferramentas/lib/textos.ts";

const real = { lat: -23.1, lon: -47.0 };
const galpao = (g: object = {}) =>
  esquemaFicha.parse({
    versao: 1, slug: "galpao-anhanguera", nome: "Galpão Anhanguera", endereco: "Rod. X km 1", local: real, area: sortearArea(real, 250),
    perfil: "galpao", marca: { nome: "Log Imóveis" },
    pontos: [{ id: "r1", nome: "SP-330 · Rodovia Anhanguera", tipo: "rodovia", lat: -23.11, lon: -47.0, carro: { metros: 3800, minutos: 6 }, noVideo: true }],
    galpao: { areaConstruidaM2: 5000, peDireitoM: 12, docas: 8, pisoTm2: 6, energiaKva: 300, sprinklers: true, escritorioM2: 300, ...g },
  });

test("ficha de galpão aceita a ficha técnica e o tipo rodovia", () => {
  const f = galpao();
  assert.equal(f.perfil, "galpao");
  assert.equal(f.galpao!.docas, 8);
});

test("dimensões do galpão saem da área quando não há largura e comprimento", () => {
  const d = dimensoesGalpao({ areaConstruidaM2: 5000, peDireitoM: 12, docas: 8 });
  assert.ok(Math.abs(d.largura * d.comprimento - 5000) < 1);
  assert.ok(d.comprimento > d.largura, "nave comprida");
  assert.deepEqual(dimensoesGalpao({ areaConstruidaM2: 1, peDireitoM: 10, docas: 2, larguraM: 40, comprimentoM: 90 }).largura, 40);
});

test("galpão isométrico: ordem do pintor, uma porta por doca e telhado que some ao desmontar", () => {
  const g = galpao().galpao!;
  const f = montarGalpao(g, { explosao: 0.5 });
  for (let i = 1; i < f.length; i++) assert.ok(f[i].prof >= f[i - 1].prof, `fora de ordem em ${i}`);
  const portas = new Set(f.filter((x) => x.parte === "doca").map((x) => x.comodo));
  assert.equal(portas.size, 8);
  assert.ok(montarGalpao(g, { explosao: 0 }).some((x) => x.parte === "laje"));
  assert.ok(!montarGalpao(g, { explosao: 1 }).some((x) => x.parte === "laje"));
});

test("linhas da ficha técnica com unidades em português", () => {
  const l = linhasFichaTecnica(galpao().galpao!);
  assert.ok(l.includes("5.000 m² construídos"));
  assert.ok(l.includes("Pé-direito 12 m"));
  assert.ok(l.includes("8 docas"));
  assert.ok(l.includes("Piso 6 t/m²"));
  assert.ok(l.includes("300 kVA"));
  assert.ok(l.includes("Sprinklers"));
});

test("textos de galpão trazem ficha técnica e acessos logísticos", () => {
  const t = textosImovel(fichaPublica(galpao()));
  assert.ok(t.localizacao.includes("Acessos logísticos"));
  assert.ok(t.localizacao.includes("SP-330") && t.localizacao.includes("6 min de carro"));
  assert.ok(t.localizacao.includes("Ficha técnica") && t.localizacao.includes("8 docas"));
});

test("rodovias: ponto de acesso mais perto de cada rodovia, as 3 mais próximas, com nome legível", async () => {
  const { rodoviasDeLinhas } = await import("../ferramentas/lib/logistica.ts");
  const local = { lat: -23.0, lon: -47.0 };
  const linha = (ref: string, name: string, dLat: number) => ({ ref, name, classe: "motorway", pts: [{ lat: local.lat + dLat, lon: -47.05 }, { lat: local.lat + dLat, lon: -46.95 }] });
  const r = rodoviasDeLinhas([linha("SP-330", "Rodovia Anhanguera", 0.03), linha("SP-330", "Rodovia Anhanguera", 0.01), linha("SP-348", "Rodovia dos Bandeirantes", 0.05), linha("BR-050", "", 0.08), linha("SP-065", "Rodovia Dom Pedro I", 0.12)], local);
  assert.deepEqual(r.map((p) => p.nome), ["SP-330 · Rodovia Anhanguera", "SP-348 · Rodovia dos Bandeirantes", "BR-050"]);
  assert.ok(Math.abs(r[0].lat - (local.lat + 0.01)) < 1e-9 && Math.abs(r[0].lon - -47.0) < 0.002, "acesso no ponto mais perto da linha");
  assert.ok(r.every((p) => p.tipo === "rodovia" && p.noVideo));
});

test("candidatos de acesso: até 6 pontos da rodovia, espaçados, começando pelo mais perto", async () => {
  const { candidatosAcesso } = await import("../ferramentas/lib/logistica.ts");
  const local = { lat: -23.0, lon: -47.0 };
  const pts = Array.from({ length: 200 }, (_, i) => ({ lat: -22.99, lon: -47.1 + i * 0.001 })); // reta de ~20 km a 1,1 km ao norte
  const c = candidatosAcesso([{ ref: "SP-330", name: "", classe: "motorway", pts }], "SP-330", local);
  assert.ok(c.length >= 3 && c.length <= 6, String(c.length));
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
    const d = Math.hypot((c[i].lat - c[j].lat) * 110950, (c[i].lon - c[j].lon) * 102000);
    assert.ok(d >= 790, `candidatos colados (${d.toFixed(0)} m)`);
  }
});
