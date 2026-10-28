import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/DMSans";
import type { Ficha } from "../ficha.ts";
import { paraMetros } from "../geo.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";
import { Cidade3D } from "../cena/Cidade3D.tsx";
import { cameraNoTrajeto, recorteFinal, type XZ } from "../cena/trajeto.ts";
import { useDadosCidade } from "./dados.ts";
import { entrada, saida } from "./Interface.tsx";

loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });

// Só o necessário do guia (vídeo enviado a quem já reservou: aqui o endereço é exato).
export type PropsGuia = {
  nome: string;
  marca: Ficha["marca"];
  origem: string;
  minutos?: number;
  metros?: number;
  rota: [number, number][]; // [lat, lon]
  estacionamento?: string;
  entrada?: string;
};

export const DURACAO_GUIA = 14; // segundos

const Cartao: React.FC<{ titulo: string; linhas: string[]; cor: string; vis: number; s: number; vertical: boolean }> = ({ titulo, linhas, cor, vis, s, vertical }) => (
  <div style={{ position: "absolute", left: 60 * s, right: vertical ? 60 * s : undefined, width: vertical ? undefined : 760 * s, top: vertical ? 1180 * s : undefined, bottom: vertical ? undefined : 100 * s, opacity: vis, transform: `translateY(${(1 - vis) * 30 * s}px)`, background: ESTILO.cartao, borderRadius: 36 * s, padding: `${34 * s}px ${40 * s}px`, fontFamily: FONTE, boxShadow: "0 18px 60px rgba(40,30,20,0.22)" }}>
    <div style={{ fontSize: 26 * s, letterSpacing: 4 * s, textTransform: "uppercase", color: cor, fontWeight: 700 }}>{titulo}</div>
    {linhas.map((l, i) => (
      <div key={i} style={{ fontSize: (i === 0 ? 44 : 32) * s, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? ESTILO.texto : ESTILO.textoSuave, marginTop: 8 * s, lineHeight: 1.2 }}>{l}</div>
    ))}
  </div>
);

export const GuiaChegada: React.FC<PropsGuia> = (p) => {
  const dados = useDadosCidade("cidade-exata.json");
  const f = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  if (!dados) return null;
  const vertical = height > width;
  const s = Math.min(width, height) / 1080;
  const pts = recorteFinal(p.rota.map(([lat, lon]) => paraMetros(dados.origem, { lat, lon }) as XZ));
  const fimViagem = Math.round(durationInFrames * 0.72);
  const t = interpolate(f, [15, fimViagem], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => (1 - Math.cos(Math.PI * x)) / 2 });
  const viagem = cameraNoTrajeto(pts, t, vertical);
  // no fim, a câmera para e gira devagar em volta da porta
  const giro = interpolate(f, [fimViagem, durationInFrames], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const q = f < fimViagem ? viagem : (() => {
    const base = cameraNoTrajeto(pts, 1, vertical);
    const dx = base.pos[0] - base.alvo[0], dz = base.pos[2] - base.alvo[2];
    const c = Math.cos(giro), sn = Math.sin(giro);
    return { ...base, pos: [base.alvo[0] + dx * c - dz * sn, base.pos[1], base.alvo[2] + dx * sn + dz * c] as [number, number, number] };
  })();
  const km = p.metros ? `${(p.metros / 1000).toFixed(1).replace(".", ",")} km` : "";
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ESTILO.ceuTopo} 0%, ${ESTILO.ceuBase} 62%)`, fontFamily: FONTE }}>
      <Cidade3D dados={dados} largura={width} altura={height} quadro={q} cor={p.marca.cor} aproximada={false} raioAproxM={0} marcadores={[]} pulso={(f % 30) / 30} tempo={f / 30} rota={{ pts, progresso: t }} />
      <div style={{ position: "absolute", top: (vertical ? 200 : 60) * s, left: 0, right: 0, textAlign: "center", opacity: entrada(f, 4) }}>
        <span style={{ background: "rgba(250,247,241,0.9)", padding: `${12 * s}px ${30 * s}px`, borderRadius: 999, fontSize: 34 * s, fontWeight: 700, color: ESTILO.texto }}>Como chegar · {p.nome}</span>
      </div>
      {f < fimViagem && (
        <Cartao titulo="Saindo de" linhas={[p.origem, [p.minutos ? `${p.minutos} min de carro` : "", km].filter(Boolean).join(" · ")]} cor={p.marca.cor} vis={entrada(f, 10) * saida(f, fimViagem, 10)} s={s} vertical={vertical} />
      )}
      {f >= fimViagem && (
        <Cartao titulo="Você chegou" linhas={[p.entrada ?? p.nome, p.estacionamento ? `Estacionar: ${p.estacionamento}` : ""].filter(Boolean)} cor={p.marca.cor} vis={entrada(f, fimViagem + 4)} s={s} vertical={vertical} />
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: (vertical ? 70 : 26) * s, textAlign: "center", fontSize: 20 * s, color: "rgba(31,39,38,0.7)" }}>
        <span style={{ background: "rgba(250,247,241,0.78)", padding: `${5 * s}px ${16 * s}px`, borderRadius: 999 }}>© OpenStreetMap · OpenFreeMap · {p.marca.nome}</span>
      </div>
    </AbsoluteFill>
  );
};
