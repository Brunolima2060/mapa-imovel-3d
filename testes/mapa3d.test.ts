import { test } from "node:test";
import assert from "node:assert/strict";
import { esquemaFicha, fichaPublica, sortearArea } from "../src/ficha.ts";
import { codigoIframe, paginaMapa3D } from "../ferramentas/lib/mapa3d.ts";

const real = { lat: -23.3342, lon: -46.853 };
const ficha = (extra: object = {}) =>
  fichaPublica(esquemaFicha.parse({
    versao: 1, perfil: "galpao", slug: "g", nome: "Galpão Polo", endereco: "Rua Secreta, 9", local: real, area: sortearArea(real, 250),
    marca: { nome: "Log", cor: "#2F6F8F" }, pontos: [{ id: "r", nome: "SP-330", tipo: "rodovia", lat: -23.32, lon: -46.84, carro: { metros: 6700, minutos: 9 }, noVideo: true }],
    ...extra,
  }));

test("mapa 3D para site tem relevo real, céu, prédios 3D e passeio automático", () => {
  const h = paginaMapa3D(ficha());
  for (const t of ["terrarium", "setTerrain", "setSky", "fill-extrusion", "hillshade", "passeio"]) assert.ok(h.includes(t), `falta ${t}`);
});

test("mapa 3D aproximado não leva o endereço nem a coordenada real", () => {
  const h = paginaMapa3D(ficha());
  assert.ok(!h.includes("Secreta"));
  assert.ok(!/-23\.3342(?!\d)/.test(h) && !/-46\.853(?!\d)/.test(h));
});

test("código para colar: iframe responsivo que aceita tela cheia", () => {
  const c = codigoIframe("https://mapa-g.vercel.app");
  assert.ok(c.includes('<iframe src="https://mapa-g.vercel.app"') && c.includes("allowfullscreen") && c.includes("aspect-ratio"));
});
