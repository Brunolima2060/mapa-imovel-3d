// Página HTML única com a planta isométrica interativa: toque num cômodo para ver nome e m²; botão "desmontar".
// As faces são calculadas aqui para 11 níveis de explosão e embutidas na página (sem JavaScript de terceiros).

import type { FichaPublica, Planta } from "../ficha.ts";
import { limitesPlanta, montarPlanta, rotuloArea } from "./geometria.ts";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const plantaHtml = (planta: Planta, ficha: Pick<FichaPublica, "nome" | "marca" | "regiao">): string => {
  const niveis = Array.from({ length: 11 }, (_, i) => montarPlanta(planta, { explosao: (i / 10) * 0.85 }));
  const b = niveis.map(limitesPlanta).reduce((a, x) => ({ x0: Math.min(a.x0, x.x0), y0: Math.min(a.y0, x.y0), x1: Math.max(a.x1, x.x1), y1: Math.max(a.y1, x.y1) }));
  const m = 0.6;
  const vb = `${(b.x0 - m).toFixed(2)} ${(b.y0 - m).toFixed(2)} ${(b.x1 - b.x0 + 2 * m).toFixed(2)} ${(b.y1 - b.y0 + 2 * m).toFixed(2)}`;
  const dados = niveis.map((fs) => fs.map((f) => [f.pts.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]), f.cor, f.comodo ?? "", f.opacidade ?? 1, f.rotulo ? [+f.rotulo.x.toFixed(3), +f.rotulo.y.toFixed(3)] : null]));
  const comodos = Object.fromEntries(planta.comodos.map((c) => [c.nome, { area: rotuloArea(c), tipo: c.tipo }]));
  const total = (planta.areaTotalM2 ?? planta.comodos.reduce((a, c) => a + c.w * c.h, 0)).toFixed(0);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Planta — ${esc(ficha.nome)}</title>
<style>
  :root { --cor: ${esc(ficha.marca.cor)}; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "DM Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: linear-gradient(180deg,#E3EBEE,#F2E8DA 70%); color: #1F2726; min-height: 100vh; display: flex; flex-direction: column; }
  header { padding: 22px 20px 6px; text-align: center; }
  header small { letter-spacing: .3em; text-transform: uppercase; color: var(--cor); font-weight: 700; font-size: 12px; }
  header h1 { margin: 6px 0 2px; font-size: clamp(22px, 5vw, 34px); }
  header p { margin: 0; color: #5B6664; }
  main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 8px; }
  svg { width: 100%; max-width: 980px; height: auto; max-height: 72vh; touch-action: manipulation; }
  polygon { stroke: rgba(70,58,44,.55); stroke-width: .02; stroke-linejoin: round; transition: filter .2s; }
  polygon.sel { filter: brightness(1.08) drop-shadow(0 0 .05px var(--cor)); }
  .rot text { font-weight: 700; paint-order: stroke; stroke: #FFFDF8; stroke-width: .08; text-anchor: middle; pointer-events: none; }
  footer { display: flex; gap: 10px; justify-content: center; align-items: center; padding: 10px 16px 22px; flex-wrap: wrap; }
  button { border: 0; background: var(--cor); color: ${esc(ficha.marca.corTexto)}; font: inherit; font-weight: 700; padding: 12px 22px; border-radius: 999px; cursor: pointer; }
  #info { min-height: 1.4em; font-weight: 600; }
  .marca { width: 100%; text-align: center; font-size: 12px; color: #7a8381; }
</style></head><body>
<header><small>${esc(ficha.marca.nome)}</small><h1>${esc(ficha.nome)}</h1><p>${planta.comodos.length} ambientes · ${total} m²${ficha.regiao ? " · " + esc(ficha.regiao) : ""}</p></header>
<main><svg id="p" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"></svg></main>
<footer><button id="b">Desmontar</button><span id="info">Toque num cômodo</span><div class="marca">Planta ilustrativa, fora de escala exata</div></footer>
<script>
const N = ${JSON.stringify(dados)};
const C = ${JSON.stringify(comodos)};
const svg = document.getElementById("p"), info = document.getElementById("info"), btn = document.getElementById("b");
let nivel = 0, alvo = 0, sel = "";
function desenhar() {
  const fs = N[Math.round(nivel)];
  let h = "", r = "";
  for (const [pts, cor, com, op, rot] of fs) {
    h += '<polygon data-c="' + com + '" points="' + pts.map(p => p.join(",")).join(" ") + '" fill="' + cor + '" opacity="' + op + '"' + (com && com === sel ? ' class="sel"' : "") + '/>';
    if (rot && nivel > 6) r += '<text x="' + rot[0] + '" y="' + rot[1] + '" font-size=".32">' + com + '</text><text x="' + rot[0] + '" y="' + (rot[1] + .34) + '" font-size=".24" fill="#5B6664">' + C[com].area + '</text>';
  }
  svg.innerHTML = h + '<g class="rot">' + r + '</g>';
}
function animar() { if (Math.abs(nivel - alvo) < .01) { nivel = alvo; desenhar(); return; } nivel += Math.sign(alvo - nivel) * .5; desenhar(); requestAnimationFrame(animar); }
btn.onclick = () => { alvo = alvo ? 0 : 10; btn.textContent = alvo ? "Montar" : "Desmontar"; animar(); };
svg.addEventListener("click", e => { const c = e.target.getAttribute && e.target.getAttribute("data-c"); if (!c) return; sel = c; info.textContent = c + " · " + C[c].area; desenhar(); });
desenhar();
</script></body></html>`;
};
