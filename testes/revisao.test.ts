// Testes das correções da revisão final.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { esquemaFicha, fichaPublica, sortearArea } from "../src/ficha.ts";
import { lerCoordenadas, metrosEntre } from "../ferramentas/lib/geo.ts";
import { configurarHttp } from "../ferramentas/lib/http.ts";
import { trecho } from "../ferramentas/lib/rotas.ts";
import { nomePadrao, escolherUrlVercel, mesmaOrigem } from "../ferramentas/lib/utilidades.ts";
import { plantaHtml } from "../src/planta/svg.ts";
import { paginaImovel } from "../ferramentas/lib/interativo.ts";

const real = { lat: -23.4339, lon: -45.0712 };
const base = (extra: object = {}) =>
  esquemaFicha.parse({ versao: 1, slug: "ape", nome: "Apê", endereco: "Rua X, 1", local: real, pontos: [], marca: { nome: "M" }, ...extra });

test("área aproximada é sorteada de verdade (não sai do nome) e fica no lugar certo", () => {
  const a = sortearArea(real, 250), b = sortearArea(real, 250);
  assert.notDeepEqual(a, b);
  for (let i = 0; i < 200; i++) {
    const d = metrosEntre(real, sortearArea(real, 250));
    assert.ok(d >= 250 * 0.35 - 0.01 && d <= 250 * 0.7 + 0.01, String(d));
  }
});

test("fichaPublica aproximada sem área salva recusa em vez de inventar uma previsível", () => {
  assert.throws(() => fichaPublica(base()), /área/);
});

test("fichaPublica recusa área que deixou o imóvel fora do círculo (raio mudou)", () => {
  const area = sortearArea(real, 250);
  assert.throws(() => fichaPublica(base({ area, raioAproxM: 50 })), /área/);
  assert.ok(fichaPublica(base({ area, raioAproxM: 250 })));
});

test("nome padrão não usa a rua digitada", () => {
  assert.equal(nomePadrao("Imóvel em Itaguá · Ubatuba".split(" · ")[0].replace("Imóvel em ", "")), "Imóvel em Itaguá");
  assert.equal(nomePadrao(undefined), "Meu imóvel");
});

test("ponto sem rota (OSRM responde 400 NoRoute) não derruba: fica sem tempo", async () => {
  configurarHttp({ fetch: async () => new Response(JSON.stringify({ code: "NoRoute", message: "Impossible route" }), { status: 400 }), esperas: [0], intervaloMin: 0 });
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), "mi3d-r-"));
  assert.equal(await trecho(real, { lat: -23.5, lon: -45.0 }, "foot", cache), undefined);
});

test("link do Google Maps de lugar usa o pino (!3d/!4d) e não o centro da tela (@)", () => {
  assert.deepEqual(lerCoordenadas("https://www.google.com/maps/place/Casa/@-23.40,-45.00,15z/data=!3m1!4b1!4m6!3m5!8m2!3d-23.4339!4d-45.0712"), real);
});

test("maquete de outro centro é recusada", () => {
  assert.equal(mesmaOrigem({ lat: -23.4339, lon: -45.0712 }, { lat: -23.43391, lon: -45.07121 }), true);
  assert.equal(mesmaOrigem({ lat: -23.4339, lon: -45.0712 }, { lat: -23.4359, lon: -45.0712 }), false);
});

test("link publicado preferido é o endereço fixo do projeto, não o da implantação", () => {
  const saida = "Inspect: https://vercel.com/x/mapa-ape/abc\nProduction: https://mapa-ape-9fk2l1q-joao.vercel.app [3s]\nAliased: https://mapa-ape.vercel.app [3s]\n";
  assert.equal(escolherUrlVercel(saida, "mapa-ape"), "https://mapa-ape.vercel.app");
});

test("planta interativa escapa nomes de cômodo", () => {
  const html = plantaHtml({ comodos: [{ nome: 'Sala "TV" </script><img src=x>', tipo: "sala", x: 0, y: 0, w: 4, h: 3 }] }, { nome: "A", regiao: undefined, marca: { nome: "M", cor: "#C8643C", corTexto: "#FFFFFF" } });
  assert.ok(!html.includes("</script><img"), "nome quebrou o script");
});

test("link do anúncio só aceita http(s)", () => {
  const f = fichaPublica(base({ area: sortearArea(real, 250), anuncio: { link: "javascript:alert(1)" } }));
  assert.ok(!paginaImovel(f).includes("javascript:alert"));
});
