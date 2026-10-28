// Ficha técnica do galpão em PDF (A4, uma página): para mandar por WhatsApp/e-mail junto com o vídeo.
// HTML montado aqui e impresso pelo Chrome instalado (modo sem janela). Só usa a ficha pública.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import type { FichaPublica } from "../../src/ficha.ts";
import { linhasFichaTecnica } from "../../src/planta/galpao.ts";
import { rotuloDistancia, rotuloTempo } from "../../src/tempo.ts";
import { chromeInstalado } from "./render.ts";
import { esc } from "./interativo.ts";

type Imagens = { capa?: string; galpao?: string; alcance?: string; qr?: string };

const km = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);

export const fichaPdfHtml = (f: FichaPublica, img: Imagens): string => {
  const cor = esc(f.marca.cor);
  const ficha = f.galpao ? linhasFichaTecnica(f.galpao) : f.destaques ?? [];
  const acessos = f.pontos.filter((p) => rotuloTempo(p));
  const faixas = f.logistica?.alcance ?? [];
  const vizinhos = f.logistica?.vizinhos ?? [];
  const lista = (itens: string[]) => `<ul>${itens.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(f.nome)} — ficha técnica</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; width: 210mm; height: 297mm; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1F2726; background: #FBF9F5; }
  .topo { padding: 9mm 12mm 4mm; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.2mm solid ${cor}; }
  .topo small { color: ${cor}; letter-spacing: .25em; font-weight: 700; font-size: 8.5pt; text-transform: uppercase; }
  .topo h1 { margin: 1mm 0 0; font-size: 20pt; }
  .topo p { margin: 1mm 0 0; color: #5B6664; font-size: 10pt; }
  .heroi { display: flex; gap: 4mm; padding: 4mm 12mm 0; height: 72mm; }
  .heroi img { height: 100%; object-fit: cover; border-radius: 3mm; }
  .heroi .a { flex: 1.2; min-width: 0; } .heroi .b { flex: 1; min-width: 0; }
  .grade { display: grid; grid-template-columns: 1fr 1.25fr; gap: 2.5mm 7mm; padding: 4mm 12mm 0; }
  h2 { font-size: 10.5pt; margin: 0 0 1.5mm; color: ${cor}; letter-spacing: .12em; text-transform: uppercase; }
  ul { margin: 0; padding: 0; list-style: none; font-size: 8.6pt; line-height: 1.35; }
  li { display: flex; justify-content: space-between; gap: 3mm; border-bottom: .2mm solid #E6E0D6; padding: .45mm 0; }
  li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li b { white-space: nowrap; color: ${cor}; }
  .galpao { position: absolute; left: 12mm; right: 12mm; bottom: 31mm; height: 50mm; text-align: center; }
  .galpao img { height: 100%; max-width: 100%; object-fit: contain; }
  body { position: relative; overflow: hidden; }
  .rodape { position: absolute; left: 0; right: 0; bottom: 0; height: 27mm; padding: 4mm 12mm 5mm; display: flex; justify-content: space-between; align-items: center; background: #F1EBE1; }
  .rodape .contato { font-size: 12pt; font-weight: 700; }
  .rodape .nota { font-size: 7pt; color: #7a8381; max-width: 120mm; }
  .rodape img { height: 22mm; }
</style></head><body>
<div class="topo"><div><small>${esc(f.marca.nome)}</small><h1>${esc(f.nome)}</h1><p>${esc(f.regiao ?? "")}</p></div>
<div style="text-align:right;font-size:10pt;color:#5B6664">${esc(f.chamada)}</div></div>
<div class="heroi">
  ${img.capa ? `<img class="a" src="${esc(img.capa)}">` : ""}
  ${img.alcance ? `<img class="b" src="${esc(img.alcance)}">` : ""}
</div>
<div class="grade">
  <div><h2>Ficha técnica</h2>${lista(ficha.map(esc))}</div>
  <div><h2>Acessos logísticos</h2>${lista(acessos.slice(0, 8).map((p) => `<span>${esc(p.nome)}</span><b>${esc([rotuloDistancia(p), rotuloTempo(p)].filter(Boolean).join(" · "))}</b>`))}</div>
  ${faixas.length ? `<div><h2>Alcance de caminhão</h2>${lista(faixas.filter((a) => a.cidades.length).map((a) => `<span><b>${a.minutos} min</b> ${esc(a.cidades.slice(0, 5).join(", ") || "—")}</span>`))}</div>` : ""}
  ${vizinhos.length ? `<div><h2>Vizinhos logísticos</h2>${lista(vizinhos.map((v) => `<span>${esc(v.nome)}</span><b>${km(v.metros)}</b>`))}</div>` : ""}
</div>
${img.galpao ? `<div class="galpao"><img src="${esc(img.galpao)}"></div>` : ""}
<div class="rodape"><div><div class="contato">${esc(f.marca.contato ?? f.marca.nome)}</div>${f.marca.site ? `<div style="font-size:9pt">${esc(f.marca.site)}</div>` : ""}
<div class="nota">Distâncias e tempos pelas vias (OpenStreetMap), arredondados para cima; caminhões podem levar mais. Ilustrações a partir da ficha técnica.${f.localizacao === "aproximada" ? " Localização aproximada." : ""} © OpenStreetMap · OpenFreeMap</div></div>
${img.qr ? `<img src="${esc(img.qr)}">` : ""}</div>
</body></html>`;
};

// Imprime o HTML em PDF com o Chrome instalado (as imagens são caminhos relativos à pasta do HTML).
export const gerarPdf = (htmlArq: string, pdfArq: string) => {
  const chrome = chromeInstalado();
  if (!chrome) throw new Error("Para gerar o PDF, instale o Google Chrome.");
  const r = spawnSync(chrome, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files", `--print-to-pdf=${pdfArq}`, pathToFileURL(htmlArq).href], { encoding: "utf8", timeout: 120000 });
  if (!fs.existsSync(pdfArq)) throw new Error(`O Chrome não gerou o PDF:\n${(r.stderr || "").slice(-400)}`);
  return pdfArq;
};

