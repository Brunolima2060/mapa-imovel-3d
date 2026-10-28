import { test } from "node:test";
import assert from "node:assert/strict";
import { montarRoteiro } from "../src/cena/camera.ts";
import { cameraFundo, DURACAO_FUNDO } from "../src/cena/fundo.ts";
import { esquemaFicha, fichaPublica, sortearArea } from "../src/ficha.ts";
import { codigoEmbed, linkWhatsapp, paginaSite } from "../ferramentas/lib/site.ts";

test("ritmo de apresentação deixa cada cena mais longa", () => {
  const a = montarRoteiro({ nPontos: 3, comPlanta: true, nFotos: 0, fps: 30 });
  const b = montarRoteiro({ nPontos: 3, comPlanta: true, nFotos: 0, fps: 30, ritmo: "apresentacao" });
  assert.ok(b.total > a.total * 1.35, `${a.total} → ${b.total}`);
  assert.deepEqual(b.cenas.map((c) => c.tipo), a.cenas.map((c) => c.tipo));
});

test("vídeo de fundo fecha o loop sem pulo (último quadro = primeiro)", () => {
  const fps = 30, n = DURACAO_FUNDO * fps;
  const a = cameraFundo(0, n, false), b = cameraFundo(n, n, false);
  const d = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
  assert.ok(d < 0.01, `pulo de ${d} m no loop`);
  let ant = a;
  for (let f = 1; f <= n; f++) {
    const q = cameraFundo(f, n, false);
    assert.ok(Math.hypot(q.pos[0] - ant.pos[0], q.pos[2] - ant.pos[2]) < 15, "câmera rápida demais para fundo");
    ant = q;
  }
});

test("link de WhatsApp sai do contato (só os números, com 55)", () => {
  assert.equal(linkWhatsapp("(11) 90000-0000 · contato@x.com"), "https://wa.me/5511900000000");
  assert.equal(linkWhatsapp("contato@x.com"), undefined);
});

const real = { lat: -23.354, lon: -46.877 };
const ficha = () =>
  fichaPublica(
    esquemaFicha.parse({
      versao: 1, perfil: "galpao", slug: "g", nome: "Galpão Cajamar", endereco: "Rua Secreta, 77", local: real, area: sortearArea(real, 250),
      marca: { nome: "Log Imóveis", cor: "#2F6F8F", contato: "(11) 90000-0000" },
      pontos: [{ id: "r", nome: "SP-330 · Anhanguera", tipo: "rodovia", lat: -23.35, lon: -46.86, carro: { metros: 4000, minutos: 6 }, noVideo: true }],
      galpao: { areaConstruidaM2: 6200, peDireitoM: 12, docas: 10 },
    }),
  );

test("landing page: vídeo de fundo em loop (webm + mp4 + capa), ficha técnica, mapa, PDF e WhatsApp — sem endereço", () => {
  const html = paginaSite(ficha(), { fundoMp4: "fundo.mp4", fundoWebm: "fundo.webm", poster: "fundo.jpg", apresentacaoMp4: "apresentacao.mp4", mapa: "mapa.html", pdf: "ficha-tecnica.pdf" });
  for (const t of ["autoplay", "muted", "loop", "playsinline", 'src="fundo.webm"', 'src="fundo.mp4"', 'poster="fundo.jpg"', "6.200 m² construídos", "SP-330", "mapa.html", "ficha-tecnica.pdf", "https://wa.me/5511900000000", "apresentacao.mp4"]) {
    assert.ok(html.includes(t), `falta ${t}`);
  }
  assert.ok(!html.includes("Secreta"));
});

test("código para colar no site tem o vídeo pronto", () => {
  const c = codigoEmbed({ mp4: "https://x.vercel.app/fundo.mp4", webm: "https://x.vercel.app/fundo.webm", poster: "https://x.vercel.app/fundo.jpg" });
  assert.ok(c.includes("<video") && c.includes("autoplay") && c.includes("fundo.webm") && c.includes("object-fit: cover"));
});
