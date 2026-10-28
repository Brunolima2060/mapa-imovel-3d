// Renderização com o Remotion pela API (sem abrir o Studio). Um render por vez: computador comum aguenta.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// No Windows o Chrome que o Remotion baixa não é assinado e o Controle Inteligente de Aplicativos pode bloquear;
// o Chrome instalado é assinado e passa. Sem Chrome instalado, o Remotion usa o dele.
export const chromeInstalado = (): string | undefined =>
  [
    process.env.REMOTION_CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].find((c): c is string => !!c && fs.existsSync(c));

const pacotes = new Map<string, Promise<string>>();
const pacote = (publico: string) => {
  if (!pacotes.has(publico)) {
    pacotes.set(publico, bundle({ entryPoint: path.join(RAIZ, "src", "index.ts"), publicDir: publico, onProgress: () => {} }));
  }
  return pacotes.get(publico)!;
};

const navegadorBase = () => {
  const chrome = chromeInstalado();
  return {
    browserExecutable: chrome ?? null,
    ...(chrome ? { chromeMode: "chrome-for-testing" as const } : {}),
    chromiumOptions: { gl: "angle" as const },
  };
};

// Um Chrome só por execução (abrir um por quadro esgota a memória de computador comum).
let navegador: ReturnType<typeof openBrowser> | null = null;
const opcoesNavegador = async () => {
  navegador ??= openBrowser("chrome", { ...navegadorBase(), chromiumOptions: navegadorBase().chromiumOptions });
  return { ...navegadorBase(), puppeteerInstance: await navegador, timeoutInMilliseconds: 240000 };
};

export const fecharNavegador = async () => {
  if (navegador) await (await navegador).close({ silent: true });
  navegador = null;
};

type Pedido = { publico: string; composicao: string; props: Record<string, unknown>; saida: string; rascunho?: boolean; quadro?: number };

export const renderizarVideo = async ({ publico, composicao, props, saida, rascunho }: Pedido) => {
  const serveUrl = await pacote(publico);
  const nav = await opcoesNavegador();
  const comp = await selectComposition({ serveUrl, id: composicao, inputProps: props, ...nav });
  let ultimo = -1;
  await renderMedia({
    serveUrl,
    composition: comp,
    inputProps: props,
    codec: "h264",
    crf: rascunho ? 26 : 18,
    scale: rascunho ? 0.5 : 1,
    concurrency: 1,
    outputLocation: saida,
    imageFormat: "jpeg",
    jpegQuality: rascunho ? 80 : 92,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== ultimo) { ultimo = p; process.stdout.write(`  ${p * 10}%`); }
    },
    ...nav,
  });
  process.stdout.write("\n");
  limparTemp();
  return saida;
};

export const renderizarImagem = async ({ publico, composicao, props, saida, quadro }: Pedido) => {
  const serveUrl = await pacote(publico);
  const nav = await opcoesNavegador();
  const comp = await selectComposition({ serveUrl, id: composicao, inputProps: props, ...nav });
  await renderStill({ serveUrl, composition: comp, inputProps: props, output: saida, imageFormat: "png", frame: quadro ?? 0, ...nav });
  limparTemp();
  return saida;
};

// O Chrome deixa perfis temporários a cada render; em disco pequeno isso enche rápido.
const limparTemp = () => {
  const tmp = os.tmpdir();
  const limite = Date.now() - 10 * 60 * 1000;
  for (const n of fs.readdirSync(tmp)) {
    if (!/^puppeteer_dev_chrome_profile-/.test(n)) continue;
    const p = path.join(tmp, n);
    try {
      if (fs.statSync(p).mtimeMs < limite) fs.rmSync(p, { recursive: true, force: true });
    } catch {}
  }
};
