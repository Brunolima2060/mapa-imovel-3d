// Pedidos aos serviços gratuitos (OpenStreetMap e cia.) com cache em disco, identificação, fila por servidor
// e nova tentativa. Serviço grátis tem limite: nunca dispare pedidos em paralelo para o mesmo servidor.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const USER_AGENT = "mapa-imovel-3d/1.0 (+https://github.com/Brunolima2060/mapa-imovel-3d)";

type Config = { fetch: typeof fetch; esperas: number[]; intervaloMin: number | null; tempoLimite: number };
let cfg: Config = { fetch: (...a) => fetch(...a), esperas: [2000, 5000, 10000], intervaloMin: null, tempoLimite: 150000 };

// Só para os testes trocarem o fetch e as esperas.
export const configurarHttp = (c: Partial<Config>) => {
  cfg = { ...cfg, ...c };
};

const intervaloDe = (host: string) => cfg.intervaloMin ?? (host.includes("nominatim") ? 1100 : 300);
const ultimoPorHost = new Map<string, Promise<number>>();
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Garante o intervalo mínimo entre pedidos ao mesmo servidor, mesmo com chamadas simultâneas.
const vez = async (host: string) => {
  const anterior = ultimoPorHost.get(host) ?? Promise.resolve(0);
  const minha = anterior.then(async (t) => {
    const falta = t + intervaloDe(host) - Date.now();
    if (falta > 0) await dormir(falta);
    return Date.now();
  });
  ultimoPorHost.set(host, minha);
  await minha;
};

type Opcoes = { cacheDir: string; metodo?: "GET" | "POST"; corpo?: string; tipo?: "json" | "binario"; cabecalhos?: Record<string, string>; novasTentativas?: number; tempoLimite?: number };

export async function buscar(url: string, o: Opcoes & { tipo: "binario" }): Promise<Buffer>;
export async function buscar(url: string, o: Opcoes): Promise<any>;
export async function buscar(url: string, o: Opcoes): Promise<any> {
  const tipo = o.tipo ?? "json";
  const chave = createHash("sha1").update(url + "\n" + (o.corpo ?? "")).digest("hex");
  const arq = path.join(o.cacheDir, "http", chave + (tipo === "json" ? ".json" : ".bin"));
  if (fs.existsSync(arq)) {
    const b = fs.readFileSync(arq);
    return tipo === "json" ? JSON.parse(b.toString("utf8")) : b;
  }
  const host = new URL(url).host;
  let ultimoErro = "";
  for (let t = 0; t <= Math.min(cfg.esperas.length, o.novasTentativas ?? 99); t++) {
    if (t > 0) await dormir(cfg.esperas[t - 1]);
    await vez(host);
    let r: Response;
    try {
      r = await cfg.fetch(url, {
        method: o.metodo ?? (o.corpo ? "POST" : "GET"),
        signal: AbortSignal.timeout(Math.min(cfg.tempoLimite, o.tempoLimite ?? Infinity)),
        body: o.corpo,
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
          ...(o.corpo ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
          ...o.cabecalhos,
        },
      });
    } catch (e) {
      ultimoErro = `sem conexão: ${(e as Error).message}`;
      continue;
    }
    if (r.ok) {
      const b = Buffer.from(await r.arrayBuffer());
      // O Overpass devolve 200 com "remark: runtime error" quando estoura o tempo: é falha, não resposta.
      if (tipo === "json" && /"remark"\s*:\s*"runtime error/.test(b.toString("utf8"))) {
        ultimoErro = "consulta pesada demais, estourou o tempo";
        continue;
      }
      fs.mkdirSync(path.dirname(arq), { recursive: true });
      fs.writeFileSync(arq, b);
      return tipo === "json" ? JSON.parse(b.toString("utf8")) : b;
    }
    ultimoErro = String(r.status);
    if (r.status !== 429 && r.status < 500) break;
  }
  throw new Error(`Serviço ${host} não respondeu (${ultimoErro}). Tente de novo em alguns minutos.`);
}

// Overpass (OpenStreetMap): o servidor principal vive lotado; se cair, tenta os espelhos públicos.
export const ESPELHOS_OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",


];

export const consultarOverpass = async (consulta: string, cacheDir: string): Promise<any> => {
  const erros: string[] = [];
  for (const url of ESPELHOS_OVERPASS) {
    try {
      return await buscar(url, { cacheDir, corpo: "data=" + encodeURIComponent(consulta), novasTentativas: 1, tempoLimite: 75000 });
    } catch (e) {
      erros.push((e as Error).message);
    }
  }
  throw new Error(`Nenhum servidor do OpenStreetMap respondeu agora. Tente de novo em alguns minutos.\n  ${erros.join("\n  ")}`);
};
