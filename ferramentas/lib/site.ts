// Material para SITE: landing page pronta do galpão/imóvel (vídeo de fundo em loop, ficha técnica, acessos,
// mapa interativo, apresentação, PDF e WhatsApp) e o código para colar o vídeo em qualquer site.

import type { FichaPublica } from "../../src/ficha.ts";
import { linhasFichaTecnica } from "../../src/planta/galpao.ts";
import { rotuloDistancia, rotuloTempo } from "../../src/tempo.ts";
import { esc } from "./interativo.ts";

export const linkWhatsapp = (contato?: string): string | undefined => {
  const fone = contato?.match(/\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/)?.[0];
  if (!fone) return undefined;
  const d = fone.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("55") ? d : "55" + d}`;
};

export const codigoEmbed = (v: { mp4: string; webm?: string; poster?: string }) => `<!-- Vídeo do mapa 3D: cole onde quiser no seu site. Ele preenche a caixa onde estiver. -->
<div style="position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 16px;">
  <video autoplay muted loop playsinline preload="auto"${v.poster ? ` poster="${v.poster}"` : ""}
    style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;">
    ${v.webm ? `<source src="${v.webm}" type="video/webm">\n    ` : ""}<source src="${v.mp4}" type="video/mp4">
  </video>
</div>`;

type Arquivos = { fundoMp4: string; fundoWebm?: string; poster?: string; apresentacaoMp4?: string; mapa?: string; mapa3d?: string; pdf?: string; planta?: string };

export const paginaSite = (f: FichaPublica, a: Arquivos): string => {
  const cor = esc(f.marca.cor);
  const ficha = f.galpao ? linhasFichaTecnica(f.galpao) : f.destaques ?? [];
  const acessos = f.pontos.filter((p) => rotuloTempo(p)).slice(0, 8);
  const whats = linkWhatsapp(f.marca.contato);
  const faixas = f.logistica?.alcance ?? [];
  const vizinhos = f.logistica?.vizinhos ?? [];
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(f.nome)} — ${esc(f.marca.nome)}</title>
<meta name="description" content="${esc([f.nome, f.regiao, ...ficha.slice(0, 3)].filter(Boolean).join(" · "))}">
<meta property="og:title" content="${esc(f.nome)}">
${a.poster ? `<meta property="og:image" content="${esc(a.poster)}">` : ""}
<style>
  :root { --cor: ${cor}; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1F2726; background: #FBF9F5; }
  .heroi { position: relative; min-height: 92vh; display: flex; align-items: flex-end; overflow: hidden; color: #fff; }
  .heroi video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .heroi::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,26,26,0) 35%, rgba(20,26,26,.72) 100%); }
  .heroi .txt { position: relative; z-index: 1; padding: 0 6vw 8vh; max-width: 1100px; }
  .heroi small { letter-spacing: .3em; text-transform: uppercase; font-weight: 700; opacity: .9; }
  .heroi h1 { font-size: clamp(34px, 6vw, 72px); margin: 8px 0 6px; line-height: 1.02; }
  .heroi p { font-size: clamp(16px, 2vw, 22px); margin: 0 0 22px; opacity: .92; }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 26px; }
  .chips span { border: 1px solid rgba(255,255,255,.55); border-radius: 999px; padding: 8px 16px; font-weight: 600; backdrop-filter: blur(6px); }
  .botao { display: inline-block; background: var(--cor); color: #fff; text-decoration: none; font-weight: 700; padding: 15px 28px; border-radius: 999px; margin-right: 10px; }
  .botao.claro { background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.6); }
  section { max-width: 1160px; margin: 0 auto; padding: 64px 6vw 0; }
  h2 { font-size: 14px; letter-spacing: .25em; text-transform: uppercase; color: var(--cor); margin: 0 0 18px; }
  .grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px 48px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid #E6E0D6; font-size: 17px; }
  li b { color: var(--cor); white-space: nowrap; }
  .quadro { position: relative; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(40,30,20,.16); background: #e9e4da; }
  .quadro.v { aspect-ratio: 16 / 9; } .quadro.m { aspect-ratio: 16 / 10; }
  .quadro video, .quadro iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; object-fit: cover; }
  footer { margin-top: 80px; padding: 40px 6vw; background: #1F2726; color: #e8e4dc; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; align-items: center; }
  footer small { color: #9aa3a1; }
</style></head><body>
<header class="heroi">
  <video autoplay muted loop playsinline preload="auto"${a.poster ? ` poster="${esc(a.poster)}"` : ""}>
    ${a.fundoWebm ? `<source src="${esc(a.fundoWebm)}" type="video/webm">` : ""}
    <source src="${esc(a.fundoMp4)}" type="video/mp4">
  </video>
  <div class="txt">
    <small>${esc(f.marca.nome)}</small>
    <h1>${esc(f.nome)}</h1>
    <p>${esc(f.regiao ?? "")}</p>
    <div class="chips">${ficha.slice(0, 4).map((l) => `<span>${esc(l)}</span>`).join("")}</div>
    ${whats ? `<a class="botao" href="${whats}" target="_blank" rel="noopener">${esc(f.chamada)} pelo WhatsApp</a>` : `<a class="botao" href="#contato">${esc(f.chamada)}</a>`}
    ${a.pdf ? `<a class="botao claro" href="${esc(a.pdf)}" target="_blank">Ficha técnica (PDF)</a>` : ""}
  </div>
</header>

<section class="grade">
  <div><h2>Ficha técnica</h2><ul>${ficha.map((l) => `<li><span>${esc(l)}</span></li>`).join("")}</ul></div>
  <div><h2>${f.perfil === "galpao" ? "Acessos logísticos" : "O que tem perto"}</h2><ul>${acessos.map((p) => `<li><span>${esc(p.nome)}</span><b>${esc([rotuloDistancia(p), rotuloTempo(p)].filter(Boolean).join(" · "))}</b></li>`).join("")}</ul></div>
  ${faixas.length ? `<div><h2>Alcance de caminhão</h2><ul>${faixas.filter((x) => x.cidades.length).map((x) => `<li><span>${esc(x.cidades.slice(0, 5).join(", ") || "—")}</span><b>${x.minutos} min</b></li>`).join("")}</ul></div>` : ""}
  ${vizinhos.length ? `<div><h2>Vizinhos logísticos</h2><ul>${vizinhos.map((v) => `<li><span>${esc(v.nome)}</span><b>${(v.metros / 1000).toFixed(1).replace(".", ",")} km</b></li>`).join("")}</ul></div>` : ""}
</section>

${a.apresentacaoMp4 ? `<section><h2>Apresentação</h2><div class="quadro v"><video controls playsinline preload="metadata"${a.poster ? ` poster="${esc(a.poster)}"` : ""} src="${esc(a.apresentacaoMp4)}"></video></div></section>` : ""}
${a.mapa ? `<section><h2>Mapa 3D interativo</h2><div class="quadro m"><iframe src="${esc(a.mapa3d ?? a.mapa)}" title="Mapa 3D" loading="lazy" allowfullscreen></iframe></div></section>` : ""}
${a.planta ? `<section><h2>${f.perfil === "galpao" ? "O galpão por dentro" : "A planta"}</h2><div class="quadro m"><iframe src="${esc(a.planta)}" title="Planta" loading="lazy"></iframe></div></section>` : ""}

<footer id="contato">
  <div><b style="font-size:20px">${esc(f.marca.contato ?? f.marca.nome)}</b>${f.marca.site ? `<br><small>${esc(f.marca.site)}</small>` : ""}</div>
  <small>Distâncias e tempos pelas vias (OpenStreetMap), arredondados para cima.${f.localizacao === "aproximada" ? " Localização aproximada." : ""} © OpenStreetMap · OpenFreeMap</small>
</footer>
</body></html>`;
};
