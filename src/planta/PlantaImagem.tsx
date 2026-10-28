import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/DMSans";
import type { FichaPublica } from "../ficha.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";
import { montarPlanta } from "./geometria.ts";
import { DesenhoPlanta } from "./PlantaSvg.tsx";

loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });

// Imagem da planta para o anúncio: levemente desmontada, com nomes e áreas.
export const PlantaImagem: React.FC<{ ficha: FichaPublica }> = ({ ficha }) => {
  const { width, height } = useVideoConfig();
  const s = Math.min(width, height) / 1080;
  if (!ficha.planta?.comodos.length) return null;
  const area = ficha.planta.areaTotalM2 ?? ficha.planta.comodos.reduce((a, c) => a + c.w * c.h, 0);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #EEF2F1 0%, ${ESTILO.ceuBase} 100%)`, fontFamily: FONTE }}>
      <div style={{ position: "absolute", top: 50 * s, left: 70 * s }}>
        <div style={{ fontSize: 24 * s, letterSpacing: 5 * s, textTransform: "uppercase", color: ficha.marca.cor, fontWeight: 700 }}>{ficha.marca.nome}</div>
        <div style={{ fontSize: 50 * s, fontWeight: 700, color: ESTILO.texto, marginTop: 6 * s }}>{ficha.nome}</div>
        <div style={{ fontSize: 30 * s, color: ESTILO.textoSuave, marginTop: 4 * s }}>{ficha.planta.comodos.length} ambientes · {area.toFixed(0)} m²</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170 * s, bottom: 40 * s }}>
        <DesenhoPlanta faces={montarPlanta(ficha.planta, { explosao: 0.35, laje: false })} largura={width} altura={height - 210 * s} margem={0.04} />
      </div>
      <div style={{ position: "absolute", right: 40 * s, bottom: 26 * s, fontSize: 18 * s, color: ESTILO.textoSuave }}>Planta ilustrativa</div>
    </AbsoluteFill>
  );
};
