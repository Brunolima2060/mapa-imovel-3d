// Refaz só o HTML/PDF da ficha técnica com as imagens já geradas (sem renderizar de novo).
//   node ferramentas/refazer-pdf.ts <slug>
import fs from "node:fs";
import path from "node:path";
import { carregarFicha, pastaSaida } from "./lib/pastas.ts";
import { fichaPublica } from "../src/ficha.ts";
import { fichaPdfHtml, gerarPdf } from "./lib/pdf.ts";

const slug = process.argv[2];
const f = carregarFicha(slug);
const dir = path.join(pastaSaida(slug), "ficha");
const img: Record<string, string> = {};
for (const n of ["capa", "alcance", "galpao", "qr"]) if (fs.existsSync(path.join(dir, `${n}.png`))) img[n] = `${n}.png`;
fs.writeFileSync(path.join(dir, "ficha.html"), fichaPdfHtml(fichaPublica(f), img));
console.log(gerarPdf(path.join(dir, "ficha.html"), path.join(pastaSaida(slug), "ficha-tecnica.pdf")));
