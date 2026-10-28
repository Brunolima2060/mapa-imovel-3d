import { test } from "node:test";
import assert from "node:assert/strict";
import { cidadesNoAlcance } from "../ferramentas/lib/alcance.ts";
import { portosProximos, vizinhosDeResultados } from "../ferramentas/lib/logistica.ts";
import { montarGalpao } from "../src/planta/galpao.ts";
import { esquemaFicha, fichaPublica, sortearArea } from "../src/ficha.ts";
import { fichaPdfHtml } from "../ferramentas/lib/pdf.ts";

const local = { lat: -23.354, lon: -46.877 };

test("cidades dentro de cada faixa de alcance, cidade grande primeiro, sem repetir", () => {
  const quadrado = (r: number): [number, number][] => [[local.lat - r, local.lon - r], [local.lat - r, local.lon + r], [local.lat + r, local.lon + r], [local.lat + r, local.lon - r]];
  const alcance = [{ minutos: 15, poligono: quadrado(0.1) }, { minutos: 60, poligono: quadrado(0.6) }];
  const cidades = [
    { nome: "Cajamar", lat: -23.35, lon: -46.87, classe: "town" },
    { nome: "São Paulo", lat: -23.55, lon: -46.63, classe: "city" },
    { nome: "Jundiaí", lat: -23.18, lon: -46.88, classe: "city" },
    { nome: "Santos", lat: -23.96, lon: -46.33, classe: "city" },
  ];
  const r = cidadesNoAlcance(alcance, cidades);
  assert.deepEqual(r[0].cidades, ["Cajamar"]);
  assert.deepEqual(r[1].cidades, ["São Paulo", "Jundiaí", "Cajamar"]);
});

test("porto mais próximo de Cajamar é Santos", () => {
  const p = portosProximos(local);
  assert.equal(p[0].nome, "Porto de Santos");
  assert.equal(p[0].tipo, "porto");
});

test("vizinhos logísticos: até 6, sem repetir, sem o próprio terreno e no máximo a 12 km", () => {
  const r = vizinhosDeResultados(
    [
      { name: "Centro de Distribuição Mercado Livre", lat: "-23.36", lon: "-46.88" },
      { name: "Centro de Distribuição Mercado Livre", lat: "-23.3601", lon: "-46.8801" },
      { name: "Galpão do lado", lat: "-23.3541", lon: "-46.8771" },
      { name: "Condomínio Logístico Longe", lat: "-23.9", lon: "-46.9" },
      { name: "Amazon CD", lat: "-23.33", lon: "-46.85" },
    ],
    local,
  );
  assert.deepEqual(r.map((v) => v.nome), ["Centro de Distribuição Mercado Livre", "Amazon CD"]);
  assert.ok(r[0].metros > 0);
});

test("galpão modulado: um rótulo por módulo e parede entre eles", () => {
  const g = { areaConstruidaM2: 9000, peDireitoM: 12, docas: 12, modulos: 3, modulosDetalhe: [{ nome: "Módulo A", areaM2: 3000, docas: 4 }, { nome: "Módulo B", areaM2: 3000, docas: 4 }, { nome: "Módulo C", areaM2: 3000, docas: 4 }] };
  const f = montarGalpao(g, { explosao: 0.6 });
  const rotulos = f.filter((x) => x.rotulo).map((x) => x.rotulo!.texto);
  assert.deepEqual(rotulos.filter((t) => t.startsWith("Módulo")), ["Módulo A", "Módulo B", "Módulo C"]);
  assert.ok(f.some((x) => x.parte === "divisoria"));
});

test("ficha em PDF tem ficha técnica, acessos e contato, sem o endereço no modo aproximado", () => {
  const real = { lat: -23.354, lon: -46.877 };
  const f = esquemaFicha.parse({
    versao: 1, perfil: "galpao", slug: "g", nome: "Galpão Cajamar", endereco: "Rua Secreta, 77", local: real, area: sortearArea(real, 250),
    marca: { nome: "Log Imóveis", contato: "(11) 99999-0000" },
    pontos: [{ id: "r", nome: "SP-330 · Anhanguera", tipo: "rodovia", lat: -23.35, lon: -46.86, carro: { metros: 4000, minutos: 6 }, noVideo: true }],
    galpao: { areaConstruidaM2: 6200, peDireitoM: 12, docas: 10 },
    logistica: { alcance: [{ minutos: 60, poligono: [[-23, -47], [-23, -46], [-24, -46]], cidades: ["São Paulo", "Jundiaí"] }], vizinhos: [{ nome: "CD Mercado Livre", lat: -23.36, lon: -46.88, metros: 900 }] },
  });
  const html = fichaPdfHtml(fichaPublica(f), { capa: "capa.png" });
  for (const t of ["6.200 m² construídos", "SP-330", "6 min de carro", "São Paulo", "CD Mercado Livre", "(11) 99999-0000"]) assert.ok(html.includes(t), `falta ${t}`);
  assert.ok(!html.includes("Secreta"));
});

test("vizinhos sem peso (garagem, posto, estacionamento) ficam de fora", () => {
  const r = vizinhosDeResultados([{ name: "Garagem da Transportadora Print", lat: "-23.36", lon: "-46.88" }, { name: "Posto Logística", lat: "-23.37", lon: "-46.88" }, { name: "CD Samsung", lat: "-23.33", lon: "-46.86" }], local);
  assert.deepEqual(r.map((v) => v.nome), ["CD Samsung"]);
});
