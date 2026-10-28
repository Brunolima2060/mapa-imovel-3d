import { test } from "node:test";
import assert from "node:assert/strict";
import { esquemaFicha, fichaPublica, sortearArea } from "../src/ficha.ts";
import { paginaGuia, paginaImovel, paginaPortfolio } from "../ferramentas/lib/interativo.ts";
import { textosImovel } from "../ferramentas/lib/textos.ts";

const ficha = () =>
  esquemaFicha.parse({
    versao: 1, slug: "casa-itagua", nome: "Casa no Itaguá", endereco: "Rua das Flores, 123, Itaguá, Ubatuba", regiao: "Itaguá · Ubatuba",
    local: { lat: -23.4339, lon: -45.0712 },
    area: sortearArea({ lat: -23.4339, lon: -45.0712 }, 250),
    pontos: [
      { id: "a", nome: "Praia do Itaguá", tipo: "praia", lat: -23.435, lon: -45.07, ape: { metros: 300, minutos: 4 }, noVideo: true },
      { id: "b", nome: "Mercado Bom Preço", tipo: "mercado", lat: -23.432, lon: -45.072, ape: { metros: 600, minutos: 8 }, noVideo: true },
      { id: "c", nome: "Ilha Anchieta", tipo: "atracao", lat: -23.5, lon: -45.06, noVideo: false },
    ],
    marca: { nome: "Casa da Praia", cor: "#2F7D74" },
    anuncio: { link: "https://www.airbnb.com.br/rooms/123", plataforma: "Airbnb" },
    guia: { origem: { nome: "Rodoviária de Ubatuba", lat: -23.44, lon: -45.08 }, rota: [[-23.44, -45.08], [-23.437, -45.075], [-23.4339, -45.0712]], minutos: 6, metros: 1800, entrada: "Portão azul, código 4521" },
  });

const proibidos = ["Flores", "-23.4339", "-45.0712", "4521"];

test("página do imóvel aproximada não vaza rua, coordenada real nem código do portão", () => {
  const html = paginaImovel(fichaPublica(ficha()));
  for (const p of proibidos) assert.ok(!html.includes(p), `vazou ${p}`);
  assert.ok(html.includes("OpenStreetMap"));
  assert.ok(html.includes("Praia do Itaguá") && html.includes("4 min a pé"));
  assert.ok(html.includes("maplibre-gl"));
});

test("página do imóvel no modo exato mostra o pino e o link do Google Maps", () => {
  const f = { ...ficha(), localizacao: "exata" as const };
  const html = paginaImovel(fichaPublica(f));
  assert.ok(html.includes("-23.4339") && html.includes("google.com/maps"));
});

test("guia de chegada tem a rota, a origem e as instruções de entrada", () => {
  const html = paginaGuia(ficha());
  assert.ok(html.includes("Rodoviária de Ubatuba") && html.includes("Portão azul, código 4521"));
  assert.ok(html.includes("-45.075"), "rota embutida");
});

test("portfólio lista os imóveis com link do anúncio e sem endereço", () => {
  const html = paginaPortfolio([fichaPublica(ficha())]);
  assert.ok(html.includes("Casa no Itaguá") && html.includes("airbnb.com.br/rooms/123"));
  for (const p of proibidos) assert.ok(!html.includes(p), `vazou ${p}`);
});

test("textos prontos citam pontos e tempos e não citam a rua", () => {
  const t = textosImovel(fichaPublica(ficha()));
  assert.ok(t.localizacao.includes("Praia do Itaguá") && t.localizacao.includes("4 min a pé"));
  assert.ok(!t.localizacao.includes("Flores") && !t.legenda.includes("Flores"));
  assert.ok(t.boasVindas("https://exemplo.vercel.app").includes("https://exemplo.vercel.app"));
  assert.ok(!t.localizacao.includes("Ilha Anchieta"), "ponto sem tempo fica de fora do bloco de localização");
});

test("textos não quebram com nome contendo aspas ou <tag>", () => {
  const f = fichaPublica({ ...ficha(), nome: 'Apê "Sol" <b>' });
  const html = paginaImovel(f);
  assert.ok(!html.includes(`"Sol" <b>`) && html.includes("&lt;b&gt;"), "nome escapado no HTML");
});
