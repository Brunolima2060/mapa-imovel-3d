// Versões para web dos vídeos: MP4 leve que começa a tocar antes de baixar tudo (faststart), WebM (VP9, ainda
// menor nos navegadores que aceitam) e a imagem de capa. Usa o ffmpeg que já vem com o Remotion.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const ffmpegBin = (): { bin: string; cwd?: string } => {
  const base = path.join(RAIZ, "node_modules", "@remotion");
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).filter((n) => n.startsWith("compositor-"))) {
      for (const nome of ["ffmpeg.exe", "ffmpeg"]) {
        const p = path.join(base, d, nome);
        if (fs.existsSync(p)) return { bin: p, cwd: path.dirname(p) };
      }
    }
  }
  return { bin: "ffmpeg" };
};

const rodar = (args: string[]) => {
  const { bin, cwd } = ffmpegBin();
  execFileSync(bin, ["-nostdin", "-v", "error", "-y", ...args], { cwd, stdio: ["ignore", "ignore", "pipe"] });
};

// Gera <nome>.mp4, <nome>.webm e <nome>.jpg em `dir`. `altura`: 1080 (padrão) para fundo de site.
export const paraWeb = (entrada: string, dir: string, nome: string, { altura = 1080, webm = true, capaSeg = 2 } = {}) => {
  fs.mkdirSync(dir, { recursive: true });
  const mp4 = path.join(dir, `${nome}.mp4`);
  rodar(["-i", entrada, "-an", "-vf", `scale=-2:${altura}`, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-maxrate", "3500k", "-bufsize", "7000k", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  let webmArq: string | undefined;
  if (webm) {
    webmArq = path.join(dir, `${nome}.webm`);
    rodar(["-i", entrada, "-an", "-vf", `scale=-2:${altura}`, "-c:v", "libvpx-vp9", "-crf", "40", "-b:v", "2200k", "-maxrate", "3000k", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", webmArq]);
  }
  const jpg = path.join(dir, `${nome}.jpg`);
  rodar(["-ss", String(capaSeg), "-i", entrada, "-frames:v", "1", "-q:v", "3", jpg]);
  return { mp4, webm: webmArq, jpg };
};
