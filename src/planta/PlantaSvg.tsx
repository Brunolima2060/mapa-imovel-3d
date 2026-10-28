import { interpolate } from "remotion";
import type { Planta } from "../ficha.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";
import { limitesPlanta, montarPlanta, type Face } from "./geometria.ts";

const contorno = "rgba(70, 58, 44, 0.55)";

export const DesenhoPlanta: React.FC<{ faces: Face[]; largura: number; altura: number; margem?: number; rotulos?: number; escalaTexto?: number }> = ({ faces, largura, altura, margem = 0.08, rotulos = 1, escalaTexto = 1 }) => {
  const b = limitesPlanta(faces);
  const k = Math.min((largura * (1 - 2 * margem)) / (b.x1 - b.x0), (altura * (1 - 2 * margem)) / (b.y1 - b.y0));
  const ox = (largura - (b.x1 - b.x0) * k) / 2 - b.x0 * k;
  const oy = (altura - (b.y1 - b.y0) * k) / 2 - b.y0 * k;
  const pt = ([x, y]: [number, number]) => `${(x * k + ox).toFixed(1)},${(y * k + oy).toFixed(1)}`;
  const piso = faces.filter((f) => f.rotulo);
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} style={{ position: "absolute", inset: 0 }}>
      {faces.map((f, i) => (
        <polygon key={i} points={f.pts.map(pt).join(" ")} fill={f.cor} stroke={f.tom === "topo" || f.tom === "chao" ? contorno : f.cor} strokeWidth={f.tom === "topo" || f.tom === "chao" ? Math.max(0.6, k * 0.012) : 0.8} strokeLinejoin="round" opacity={f.opacidade ?? 1} />
      ))}
      {rotulos > 0 &&
        piso.map((f, i) => {
          const x = f.rotulo!.x * k + ox, y = f.rotulo!.y * k + oy;
          const s = Math.max(22, k * 0.34) * escalaTexto;
          return (
            <g key={"r" + i} opacity={rotulos} transform={`translate(${x} ${y - (1 - rotulos) * 10})`}>
              <text textAnchor="middle" y={-s * 0.15} fontFamily={FONTE} fontWeight={700} fontSize={s} fill={ESTILO.texto} stroke="#FFFDF8" strokeWidth={s * 0.22} paintOrder="stroke">{f.rotulo!.texto}</text>
              <text textAnchor="middle" y={s * 0.95} fontFamily={FONTE} fontWeight={500} fontSize={s * 0.78} fill={ESTILO.textoSuave} stroke="#FFFDF8" strokeWidth={s * 0.2} paintOrder="stroke">{f.rotulo!.sub}</text>
            </g>
          );
        })}
    </svg>
  );
};

// Cena de vídeo: a planta aparece fechada (com a laje), a laje sobe, os cômodos se afastam e os nomes aparecem.
export const PlantaAnimada: React.FC<{ planta: Planta; cor: string; largura: number; altura: number; quadro: number; duracao: number; titulo?: string }> = ({ planta, cor, largura, altura, quadro, duracao, titulo }) => {
  const e = interpolate(quadro, [duracao * 0.12, duracao * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => (1 - Math.cos(Math.PI * t)) / 2 });
  const rot = interpolate(quadro, [duracao * 0.55, duracao * 0.72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const faces = montarPlanta(planta, { explosao: e * 0.75 });
  const vertical = altura > largura;
  const s = Math.min(largura, altura) / 1080;
  const area = planta.areaTotalM2 ?? planta.comodos.reduce((a, c) => a + c.w * c.h, 0);
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(242, 232, 218, 0.82)" }}>
      <div style={{ position: "absolute", top: (vertical ? 250 : 70) * s, left: 0, right: 0, textAlign: "center", fontFamily: FONTE }}>
        <div style={{ fontSize: 30 * s, letterSpacing: 6 * s, textTransform: "uppercase", color: cor, fontWeight: 700 }}>{titulo ?? "Planta"}</div>
        <div style={{ fontSize: 52 * s, color: ESTILO.texto, fontWeight: 700, marginTop: 8 * s }}>
          {planta.comodos.length} ambientes · {area.toFixed(0)} m²
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: (vertical ? 420 : 200) * s, bottom: (vertical ? 380 : 60) * s }}>
        <DesenhoPlanta faces={faces} largura={largura} altura={altura - (vertical ? 800 : 260) * s} margem={0.03} rotulos={rot} escalaTexto={vertical ? 1 : 0.9} />
      </div>
    </div>
  );
};
