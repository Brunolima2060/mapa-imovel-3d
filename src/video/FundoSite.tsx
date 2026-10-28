import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { FichaPublica } from "../ficha.ts";
import { paraMetros } from "../geo.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";
import { Cidade3D } from "../cena/Cidade3D.tsx";
import { cameraFundo } from "../cena/fundo.ts";
import { useDadosCidade } from "./dados.ts";

// Vídeo de fundo para o topo do site: uma volta lenta em torno do imóvel, sem textos (o site põe os dele por cima).
// Só a atribuição obrigatória do OpenStreetMap, pequena, no canto.
export const FundoSite: React.FC<{ ficha: FichaPublica }> = ({ ficha }) => {
  const dados = useDadosCidade();
  const f = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  if (!dados) return null;
  const pontos = ficha.pontos.filter((p) => p.noVideo);
  const marcadores = pontos.map((p) => { const [x, z] = paraMetros(dados.origem, p); return { id: p.id, x, z, ativo: 0, arco: 0 }; });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ESTILO.ceuTopo} 0%, ${ESTILO.ceuBase} 62%)` }}>
      <Cidade3D dados={dados} largura={width} altura={height} quadro={cameraFundo(f, durationInFrames, height > width)} cor={ficha.marca.cor} aproximada={ficha.localizacao === "aproximada"} raioAproxM={ficha.raioAproxM} marcadores={marcadores} pulso={(f % fps) / fps} tempo={f / fps} />
      <div style={{ position: "absolute", right: 18, bottom: 12, fontFamily: FONTE, fontSize: 14, color: "rgba(31,39,38,0.55)" }}>© OpenStreetMap · OpenFreeMap</div>
    </AbsoluteFill>
  );
};
