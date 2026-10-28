// Páginas HTML únicas (abrem no celular, sem servidor): mapa 3D do imóvel, guia de chegada e portfólio.
// MapLibre GL + ladrilhos do OpenFreeMap: grátis, sem chave. Tudo o que entra aqui vem da ficha pública,
// exceto o guia de chegada (endereço exato de propósito: só vai para quem já reservou).

import type { Ficha, FichaPublica } from "../../src/ficha.ts";
import { rotuloDistancia, rotuloTempo } from "../../src/tempo.ts";
import { NOME_TIPO } from "../../src/nomes.ts";

const MAPLIBRE = "https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl";
const ESTILO_MAPA = "https://tiles.openfreemap.org/styles/liberty";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

type Marca = FichaPublica["marca"];

const pagina = (o: { titulo: string; subtitulo?: string; marca: Marca; dados: unknown; script: string; painel: string }) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${esc(o.titulo)}</title>
<link rel="stylesheet" href="${MAPLIBRE}.css">
<script src="${MAPLIBRE}.js"></script>
<style>
  :root { --cor: ${esc(o.marca.cor)}; --cor-texto: ${esc(o.marca.corTexto)}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; font-family: "DM Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1F2726; background: #F2E8DA; }
  #mapa { position: fixed; inset: 0; }
  .topo { position: fixed; top: 12px; left: 12px; right: 12px; display: flex; justify-content: center; pointer-events: none; }
  .topo div { background: rgba(252,250,246,.94); border-radius: 18px; padding: 10px 18px; text-align: center; box-shadow: 0 8px 30px rgba(40,30,20,.18); pointer-events: auto; max-width: 560px; }
  .topo small { display: block; font-size: 11px; letter-spacing: .25em; text-transform: uppercase; color: var(--cor); font-weight: 700; }
  .topo b { font-size: 19px; }
  .topo span { display: block; font-size: 13px; color: #5B6664; }
  .painel { position: fixed; left: 0; right: 0; bottom: 0; max-height: 36vh; overflow: auto; background: rgba(252,250,246,.97); border-radius: 22px 22px 0 0; padding: 14px 14px 18px; box-shadow: 0 -10px 40px rgba(40,30,20,.18); }
  @media (min-width: 900px) { .painel { left: 16px; right: auto; top: 96px; bottom: 16px; width: 360px; max-height: none; border-radius: 22px; } }
  .item { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 14px; cursor: pointer; }
  .item:hover, .item.ativo { background: #F1EBE1; }
  .bola { width: 34px; height: 34px; border-radius: 10px; background: var(--cor); color: var(--cor-texto); display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 14px; }
  .item div { flex: 1; min-width: 0; }
  .item b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item small { color: #5B6664; }
  .item em { font-style: normal; color: var(--cor); font-weight: 700; white-space: nowrap; }
  .marcador { width: 28px; height: 28px; border-radius: 50%; background: #2E3A39; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,.3); cursor: pointer; }
  .marcador.casa { background: var(--cor); width: 34px; height: 34px; }
  .botao { display: block; text-align: center; margin: 12px 4px 0; padding: 13px; border-radius: 999px; background: var(--cor); color: var(--cor-texto); font-weight: 700; text-decoration: none; }
  .nota { font-size: 12px; color: #7a8381; margin: 10px 6px 0; }
  .maplibregl-popup-content { border-radius: 14px; font-family: inherit; padding: 10px 14px; }
</style></head><body>
<div id="mapa"></div>
<div class="topo"><div><small>${esc(o.marca.nome)}</small><b>${esc(o.titulo)}</b>${o.subtitulo ? `<span>${esc(o.subtitulo)}</span>` : ""}</div></div>
<div class="painel">${o.painel}</div>
<script>
const D = ${json(o.dados)};
const mapa = new maplibregl.Map({ container: "mapa", style: "${ESTILO_MAPA}", center: [D.centro.lon, D.centro.lat], zoom: D.zoom || 15.3, pitch: 58, bearing: -18, attributionControl: { compact: true } });
mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
const painelEl = document.querySelector(".painel");
const folga = () => window.innerWidth < 900 ? { top: 90, bottom: painelEl.offsetHeight, left: 0, right: 0 } : { top: 0, bottom: 0, left: 380, right: 0 };
mapa.setPadding(folga());
window.addEventListener("resize", () => mapa.setPadding(folga()));
mapa.on("load", () => {
  // prédios em 3D (se o estilo ainda não tiver)
  if (!mapa.getLayer("predios-3d")) {
    mapa.addLayer({ id: "predios-3d", source: "openmaptiles", "source-layer": "building", type: "fill-extrusion", minzoom: 13,
      paint: { "fill-extrusion-color": "#F4F0E9", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.92 } });
  }
});
function circulo(c, raio) {
  const pts = [];
  for (let i = 0; i <= 64; i++) { const a = i / 64 * 2 * Math.PI; pts.push([c.lon + raio * Math.cos(a) / (111320 * Math.cos(c.lat * Math.PI / 180)), c.lat + raio * Math.sin(a) / 110950]); }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [pts] } };
}
function el(classe, texto) { const e = document.createElement("div"); e.className = classe; e.textContent = texto; return e; }
${o.script}
</script></body></html>`;

const itensPontos = (f: FichaPublica) =>
  f.pontos
    .map((p, i) => {
      const t = rotuloTempo(p);
      const d = rotuloDistancia(p);
      return `<div class="item" data-i="${i}"><span class="bola">${i + 1}</span><div><b>${esc(p.nome)}</b><small>${esc(NOME_TIPO[p.tipo])}${d ? " · " + esc(d) : ""}</small></div>${t ? `<em>${esc(t)}</em>` : ""}</div>`;
    })
    .join("");

export const paginaImovel = (f: FichaPublica): string => {
  const exata = f.localizacao === "exata";
  const dados = {
    centro: f.centro,
    zoom: f.perfil === "galpao" ? 14.6 : 15.3, // galpão: mostra o polo logístico em volta
    raio: f.raioAproxM,
    exata,
    pontos: f.pontos.map((p) => ({ nome: p.nome, lat: p.lat, lon: p.lon, tempo: rotuloTempo(p) })),
    alcance: (f.logistica?.alcance ?? []).map((a) => ({ minutos: a.minutos, anel: a.poligono.map(([lat, lon]) => [lon, lat]), cidades: a.cidades })),
    vizinhos: f.logistica?.vizinhos ?? [],
  };
  const blocoAlcance = (f.logistica?.alcance ?? []).length
    ? `<div class="item" id="ver-alcance"><span class="bola">⏱</span><div><b>Alcance de caminhão</b><small>${(f.logistica?.alcance ?? []).filter((a) => a.cidades.length).map((a) => `${a.minutos} min: ${a.cidades.slice(0, 3).join(", ")}`).map(esc).join(" · ")}</small></div><em>ver</em></div>`
    : "";
  const blocoVizinhos = (f.logistica?.vizinhos ?? []).map((v) => `<div class="item"><span class="bola" style="background:#2E3A39;color:#fff">◆</span><div><b>${esc(v.nome)}</b><small>vizinho logístico</small></div><em>${(v.metros / 1000).toFixed(1).replace(".", ",")} km</em></div>`).join("");
  const painel = `${blocoAlcance}${itensPontos(f)}${blocoVizinhos}
${f.anuncio?.link ? `<a class="botao" href="${esc(f.anuncio.link)}" target="_blank" rel="noopener">${esc(f.chamada)}${f.anuncio.plataforma ? " · " + esc(f.anuncio.plataforma) : ""}</a>` : ""}
${exata ? `<a class="botao" style="background:#2E3A39;color:#fff" href="https://www.google.com/maps/search/?api=1&query=${f.centro.lat},${f.centro.lon}" target="_blank" rel="noopener">Ver no Google Maps</a>` : ""}
<p class="nota">${exata ? "" : "A área destacada mostra a região do imóvel; o endereço exato é enviado depois da reserva. "}Tempos pelas ruas, arredondados para cima. © OpenStreetMap · OpenFreeMap</p>`;
  const script = `
mapa.on("load", () => {
  if (!D.exata) {
    mapa.addSource("area", { type: "geojson", data: circulo(D.centro, D.raio) });
    mapa.addLayer({ id: "area-f", type: "fill", source: "area", paint: { "fill-color": getComputedStyle(document.documentElement).getPropertyValue("--cor"), "fill-opacity": 0.18 } });
    mapa.addLayer({ id: "area-l", type: "line", source: "area", paint: { "line-color": getComputedStyle(document.documentElement).getPropertyValue("--cor"), "line-width": 3 } });
  } else {
    new maplibregl.Marker({ element: el("marcador casa", "★") }).setLngLat([D.centro.lon, D.centro.lat]).addTo(mapa);
  }
});
mapa.on("load", () => {
  const cor = getComputedStyle(document.documentElement).getPropertyValue("--cor");
  [...D.alcance].reverse().forEach((a, i) => {
    mapa.addSource("alc" + a.minutos, { type: "geojson", data: { type: "Feature", geometry: { type: "Polygon", coordinates: [a.anel] } } });
    // escondido no começo (a vista 3D fica limpa); aparece ao tocar em "Alcance de caminhão"
    mapa.addLayer({ id: "alc-f" + a.minutos, type: "fill", source: "alc" + a.minutos, layout: { visibility: "none" }, paint: { "fill-color": cor, "fill-opacity": [0.1, 0.16, 0.24][i] || 0.1 } });
    mapa.addLayer({ id: "alc-l" + a.minutos, type: "line", source: "alc" + a.minutos, layout: { visibility: "none" }, paint: { "line-color": cor, "line-width": 1.5, "line-opacity": 0.8 } });
  });
});
D.vizinhos.forEach((v) => {
  const pop = new maplibregl.Popup({ offset: 14, closeButton: false }).setText(v.nome);
  new maplibregl.Marker({ element: el("marcador", "◆") }).setLngLat([v.lon, v.lat]).setPopup(pop).addTo(mapa);
});
const va = document.getElementById("ver-alcance");
let alcanceVisivel = false;
if (va) va.addEventListener("click", () => {
  alcanceVisivel = !alcanceVisivel;
  for (const a of D.alcance) for (const id of ["alc-f", "alc-l"]) mapa.setLayoutProperty(id + a.minutos, "visibility", alcanceVisivel ? "visible" : "none");
  va.querySelector("em").textContent = alcanceVisivel ? "voltar" : "ver";
  if (alcanceVisivel) {
    const anel = D.alcance[D.alcance.length - 1].anel;
    const b = anel.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(anel[0], anel[0]));
    mapa.fitBounds(b, { padding: 40, pitch: 0, bearing: 0, duration: 1600 });
  } else {
    mapa.flyTo({ center: [D.centro.lon, D.centro.lat], zoom: D.zoom || 15.3, pitch: 58, bearing: -18, duration: 1600 });
  }
});
D.pontos.forEach((p, i) => {
  const pop = new maplibregl.Popup({ offset: 18, closeButton: false }).setDOMContent((() => { const d = document.createElement("div"); const b = document.createElement("b"); b.textContent = p.nome; d.appendChild(b); if (p.tempo) { d.appendChild(document.createElement("br")); d.appendChild(document.createTextNode(p.tempo)); } return d; })());
  new maplibregl.Marker({ element: el("marcador", String(i + 1)) }).setLngLat([p.lon, p.lat]).setPopup(pop).addTo(mapa);
});
document.querySelectorAll(".item").forEach((it) => it.addEventListener("click", () => {
  const p = D.pontos[+it.dataset.i];
  document.querySelectorAll(".item").forEach((x) => x.classList.toggle("ativo", x === it));
  mapa.flyTo({ center: [(p.lon + D.centro.lon) / 2, (p.lat + D.centro.lat) / 2], zoom: 15, pitch: 55, duration: 1600 });
}));`;
  return pagina({ titulo: f.nome, subtitulo: f.regiao, marca: f.marca, dados, script, painel });
};

export const paginaGuia = (f: Ficha): string => {
  const g = f.guia;
  if (!g) throw new Error('Falta a origem do guia. Rode: guia <slug> --origem "Rodoviária de ..."');
  const dados = { centro: f.local, zoom: 14.5, origem: g.origem, rota: (g.rota ?? []).map(([lat, lon]) => [lon, lat]) };
  const info = (titulo: string, texto?: string) => (texto ? `<div class="item"><div><small>${esc(titulo)}</small><b style="white-space:normal">${esc(texto)}</b></div></div>` : "");
  const painel = `<div class="item"><span class="bola">1</span><div><b>Saindo de ${esc(g.origem.nome)}</b><small>${g.metros ? (g.metros / 1000).toFixed(1).replace(".", ",") + " km" : ""}</small></div>${g.minutos ? `<em>${g.minutos} min de carro</em>` : ""}</div>
<div class="item"><span class="bola">★</span><div><b>${esc(f.nome)}</b><small>${esc(f.endereco)}</small></div></div>
${info("Onde estacionar", g.estacionamento)}${info("Como entrar", g.entrada)}${info("Observações", g.observacoes)}
<a class="botao" href="https://www.google.com/maps/dir/?api=1&origin=${g.origem.lat},${g.origem.lon}&destination=${f.local.lat},${f.local.lon}" target="_blank" rel="noopener">Abrir o caminho no Google Maps</a>
<a class="botao" style="background:#2E3A39;color:#fff" href="https://waze.com/ul?ll=${f.local.lat},${f.local.lon}&navigate=yes" target="_blank" rel="noopener">Abrir no Waze</a>
<p class="nota">Este link é só para hóspedes com reserva. © OpenStreetMap · OpenFreeMap</p>`;
  const script = `
mapa.on("load", () => {
  if (D.rota.length > 1) {
    mapa.addSource("rota", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: D.rota } } });
    mapa.addLayer({ id: "rota-borda", type: "line", source: "rota", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 9 } });
    mapa.addLayer({ id: "rota", type: "line", source: "rota", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": getComputedStyle(document.documentElement).getPropertyValue("--cor"), "line-width": 5 } });
    const b = D.rota.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(D.rota[0], D.rota[0]));
    mapa.fitBounds(b, { padding: { top: 110, bottom: window.innerWidth < 900 ? window.innerHeight * 0.46 : 60, left: window.innerWidth < 900 ? 40 : 400, right: 40 }, pitch: 45, duration: 0 });
  }
});
new maplibregl.Marker({ element: el("marcador", "1") }).setLngLat([D.origem.lon, D.origem.lat]).addTo(mapa);
new maplibregl.Marker({ element: el("marcador casa", "★") }).setLngLat([D.centro.lon, D.centro.lat]).addTo(mapa);`;
  return pagina({ titulo: `Como chegar · ${f.nome}`, subtitulo: "Guia de chegada", marca: f.marca, dados, script, painel });
};

export const paginaPortfolio = (fichas: FichaPublica[]): string => {
  if (!fichas.length) throw new Error("Nenhum imóvel para o portfólio.");
  const marca = fichas[0].marca;
  const lat = fichas.reduce((a, f) => a + f.centro.lat, 0) / fichas.length;
  const lon = fichas.reduce((a, f) => a + f.centro.lon, 0) / fichas.length;
  const dados = { centro: { lat, lon }, zoom: fichas.length > 1 ? 11 : 14.5, imoveis: fichas.map((f) => ({ nome: f.nome, centro: f.centro, raio: f.raioAproxM })) };
  const painel =
    fichas
      .map((f, i) => `<div class="item" data-i="${i}"><span class="bola">${i + 1}</span><div><b>${esc(f.nome)}</b><small>${esc(f.regiao ?? "")}</small></div>${f.anuncio?.link ? `<a href="${esc(f.anuncio.link)}" target="_blank" rel="noopener" style="color:var(--cor);font-weight:700">Ver anúncio</a>` : ""}${f.anuncio?.mapaUrl ? ` <a href="${esc(f.anuncio.mapaUrl)}" target="_blank" rel="noopener" style="color:#5B6664">Mapa</a>` : ""}</div>`)
      .join("") + `<p class="nota">Localizações aproximadas. © OpenStreetMap · OpenFreeMap</p>`;
  const script = `
mapa.on("load", () => {
  D.imoveis.forEach((m, i) => {
    mapa.addSource("a" + i, { type: "geojson", data: circulo(m.centro, m.raio) });
    mapa.addLayer({ id: "a" + i, type: "fill", source: "a" + i, paint: { "fill-color": getComputedStyle(document.documentElement).getPropertyValue("--cor"), "fill-opacity": 0.25 } });
  });
  if (D.imoveis.length > 1) {
    const b = D.imoveis.reduce((b, m) => b.extend([m.centro.lon, m.centro.lat]), new maplibregl.LngLatBounds([D.imoveis[0].centro.lon, D.imoveis[0].centro.lat], [D.imoveis[0].centro.lon, D.imoveis[0].centro.lat]));
    mapa.fitBounds(b, { padding: 120, maxZoom: 14, duration: 0 });
  }
});
D.imoveis.forEach((m, i) => new maplibregl.Marker({ element: el("marcador casa", String(i + 1)) }).setLngLat([m.centro.lon, m.centro.lat]).addTo(mapa));
document.querySelectorAll(".item").forEach((it) => it.addEventListener("click", (e) => { if (e.target.tagName === "A") return; const m = D.imoveis[+it.dataset.i]; mapa.flyTo({ center: [m.centro.lon, m.centro.lat], zoom: 15, pitch: 55 }); }));`;
  return pagina({ titulo: `Imóveis · ${marca.nome}`, subtitulo: `${fichas.length} ${fichas.length === 1 ? "imóvel" : "imóveis"}`, marca, dados, script, painel });
};
