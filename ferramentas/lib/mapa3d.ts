// Mapa 3D para colocar DENTRO do site (sem vídeo): tela cheia, relevo de verdade (Terrarium/AWS), sombreado
// do terreno, céu e névoa de horizonte, prédios 3D com luz, o imóvel/galpão em destaque e um "passeio" lento da
// câmera até o visitante tocar. Abre por iframe em qualquer site. Grátis e sem chave (MapLibre + OpenFreeMap).
// Parâmetros na URL: ?limpo=1 (sem título nem lista, para fundo) · ?parado=1 (sem passeio).

import type { FichaPublica } from "../../src/ficha.ts";
import { rotuloTempo } from "../../src/tempo.ts";
import { esc } from "./interativo.ts";

const MAPLIBRE = "https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl";
const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export const codigoIframe = (url: string) => `<!-- Mapa 3D: cole onde quiser no seu site. Ele ocupa a largura da caixa. -->
<iframe src="${url}" title="Mapa 3D" loading="lazy" allowfullscreen
  style="width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 16px;"></iframe>`;

export const paginaMapa3D = (f: FichaPublica): string => {
  const dados = {
    centro: f.centro,
    exata: f.localizacao === "exata",
    raio: f.raioAproxM,
    zoom: f.perfil === "galpao" ? 15 : 15.6,
    pontos: f.pontos.filter((p) => p.noVideo).map((p) => ({ nome: p.nome, lat: p.lat, lon: p.lon, tempo: rotuloTempo(p) })),
    vizinhos: (f.logistica?.vizinhos ?? []).slice(0, 6).map((v) => ({ nome: v.nome, lat: v.lat, lon: v.lon })),
  };
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${esc(f.nome)} — mapa 3D</title>
<link rel="stylesheet" href="${MAPLIBRE}.css">
<script src="${MAPLIBRE}.js"></script>
<style>
  :root { --cor: ${esc(f.marca.cor)}; }
  html, body { margin: 0; height: 100%; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #E9EEF0; }
  #mapa { position: fixed; inset: 0; }
  .titulo { position: fixed; left: 16px; top: 16px; background: rgba(252,250,246,.92); border-radius: 16px; padding: 10px 16px; box-shadow: 0 8px 30px rgba(40,30,20,.18); max-width: 70vw; }
  .titulo small { display: block; font-size: 11px; letter-spacing: .25em; text-transform: uppercase; color: var(--cor); font-weight: 700; }
  .titulo b { font-size: 18px; color: #1F2726; }
  .titulo span { display: block; font-size: 13px; color: #5B6664; }
  .marca { width: 18px; height: 18px; border-radius: 50%; background: var(--cor); border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
  .ponto { background: #2E3A39; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 999px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
  .ponto.viz { background: #fff; color: #2E3A39; }
  .limpo .titulo, .limpo .ponto { display: none; }
  .maplibregl-ctrl-attrib { font-size: 10px; }
</style></head><body>
<div id="mapa"></div>
<div class="titulo"><small>${esc(f.marca.nome)}</small><b>${esc(f.nome)}</b>${f.regiao ? `<span>${esc(f.regiao)}</span>` : ""}</div>
<script>
const D = ${json(dados)};
const q = new URLSearchParams(location.search);
if (q.get("limpo") === "1") document.body.classList.add("limpo");
const cor = getComputedStyle(document.documentElement).getPropertyValue("--cor").trim();
const mapa = new maplibregl.Map({ container: "mapa", style: "https://tiles.openfreemap.org/styles/liberty", center: [D.centro.lon, D.centro.lat], zoom: D.zoom, pitch: 62, bearing: -20, maxPitch: 80, attributionControl: { compact: true }, antialias: true });
mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
mapa.addControl(new maplibregl.FullscreenControl(), "top-right");
mapa.on("load", () => {
  // relevo de verdade (Terrarium, AWS Open Data) + sombreado do terreno
  mapa.addSource("dem", { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 15 });
  mapa.setTerrain({ source: "dem", exaggeration: 1.25 });
  const antes = mapa.getStyle().layers.find((l) => l.type === "symbol")?.id;
  mapa.addLayer({ id: "relevo", type: "hillshade", source: "dem", paint: { "hillshade-shadow-color": "#5b5446", "hillshade-highlight-color": "#fffaf0", "hillshade-exaggeration": 0.35 } }, antes);
  // céu e névoa de horizonte: dá profundidade
  mapa.setSky({ "sky-color": "#BFD3DC", "horizon-color": "#F2E8DA", "fog-color": "#EFE6D8", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.35 });
  // luz de fim de tarde nos prédios; prédios 3D com cor pela altura
  mapa.setLight({ anchor: "map", color: "#FFFFFF", intensity: 0.3, position: [1.4, 230, 35] });
  for (const l of mapa.getStyle().layers) if (l.type === "fill-extrusion") mapa.setLayoutProperty(l.id, "visibility", "none");
  mapa.addLayer({ id: "predios-3d", source: "openmaptiles", "source-layer": "building", type: "fill-extrusion", minzoom: 13,
    paint: {
      "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, "#E4E2DD", 25, "#EFEDE8", 80, "#FAF9F6"],
      "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
      "fill-extrusion-opacity": 0.95, "fill-extrusion-vertical-gradient": true } }, antes);
  // o imóvel: área aproximada ou pino
  if (!D.exata) {
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = i / 64 * 2 * Math.PI; pts.push([D.centro.lon + D.raio * Math.cos(a) / (111320 * Math.cos(D.centro.lat * Math.PI / 180)), D.centro.lat + D.raio * Math.sin(a) / 110950]); }
    mapa.addSource("area", { type: "geojson", data: { type: "Feature", geometry: { type: "Polygon", coordinates: [pts] } } });
    mapa.addLayer({ id: "area-f", type: "fill", source: "area", paint: { "fill-color": cor, "fill-opacity": 0.2 } });
    mapa.addLayer({ id: "area-l", type: "line", source: "area", paint: { "line-color": cor, "line-width": 3 } });
  } else {
    const m = document.createElement("div"); m.className = "marca";
    new maplibregl.Marker({ element: m }).setLngLat([D.centro.lon, D.centro.lat]).addTo(mapa);
  }
  const etiqueta = (t, classe, ll) => { const e = document.createElement("div"); e.className = classe; e.textContent = t; new maplibregl.Marker({ element: e }).setLngLat(ll).addTo(mapa); };
  D.pontos.forEach((p) => etiqueta(p.nome + (p.tempo ? " · " + p.tempo : ""), "ponto", [p.lon, p.lat]));
  D.vizinhos.forEach((v) => etiqueta(v.nome, "ponto viz", [v.lon, v.lat]));
  // passeio: a câmera gira devagar em volta até o visitante mexer no mapa
  let passeio = q.get("parado") !== "1";
  const parar = () => { passeio = false; };
  for (const ev of ["mousedown", "touchstart", "wheel"]) mapa.getCanvas().addEventListener(ev, parar, { passive: true });
  const girar = () => { if (!passeio) return; mapa.rotateTo((mapa.getBearing() + 0.06) % 360, { duration: 0 }); requestAnimationFrame(girar); };
  requestAnimationFrame(girar);
});
</script></body></html>`;
};
