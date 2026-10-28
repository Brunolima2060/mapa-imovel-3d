// Instala a skill no Claude Code: copia skill/mapa-imovel-3d para ~/.claude/skills/mapa-imovel-3d e grava o
// caminho deste projeto em projeto.txt (a skill usa esse caminho para rodar a CLI).
//   node ferramentas/instalar-skill.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origem = path.join(raiz, "skill", "mapa-imovel-3d");
const destino = path.join(os.homedir(), ".claude", "skills", "mapa-imovel-3d");

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.cpSync(origem, destino, { recursive: true });
fs.writeFileSync(path.join(destino, "projeto.txt"), raiz + "\n");
fs.mkdirSync(path.join(os.homedir(), "mapas-imoveis"), { recursive: true });

console.log(`Skill instalada em ${destino}`);
console.log(`Projeto: ${raiz}`);
console.log(`Imóveis vão ficar em ${path.join(os.homedir(), "mapas-imoveis")}`);
console.log('Abra o Claude Code e peça, por exemplo: "faz o mapa 3D do meu apê na Rua X, 123, Cidade"');
