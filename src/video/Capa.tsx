import { AbsoluteFill, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/DMSans";
import type { FichaPublica } from "../ficha.ts";
import { paraMetros } from "../geo.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";
import { pontoNaMaquete, type Quadro } from "../cena/camera.ts";
import { Cidade3D } from "../cena/Cidade3D.tsx";
import { rotuloTempo } from "../tempo.ts";
import { useDadosCidade } from "./dados.ts";
import { Icone } from "./Icone.tsx";
import { Assinatura } from "./Interface.tsx";

loadFont("normal", { weights: ["500", "700"], subsets: ["latin", "latin-ext"] });

// Imagem de capa: maquete com todos os pontos do vídeo marcados + nome + os 3 pontos mais fortes.
export const Capa: React.FC<{ ficha: FichaPublica; semCartao?: boolean }> = ({ ficha, semCartao }) => {
  const dados = useDadosCidade();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const s = Math.min(width, height) / 1080;
  if (!dados) return null;
  const pontos = ficha.pontos.filter((p) => p.noVideo);
  const xz = pontos.map((p) => { const [x, z] = paraMetros(dados.origem, p); return { x, z }; });
  const alcance = Math.max(450, ...xz.map((p) => Math.hypot(pontoNaMaquete(p).x, pontoNaMaquete(p).z)));
  const dist = Math.min(3200, alcance * (vertical ? 2.3 : 1.6));
  const az = -18 * (Math.PI / 180), el = 52 * (Math.PI / 180);
  const desloc = vertical ? dist * 0.12 : 0; // em pé: maquete um pouco para cima, texto embaixo
  const q: Quadro = {
    pos: [-Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist + desloc],
    alvo: [0, 0, desloc],
    fov: vertical ? 50 : 38,
  };
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ESTILO.ceuTopo} 0%, ${ESTILO.ceuBase} 62%)`, fontFamily: FONTE }}>
      <Cidade3D
        dados={dados}
        largura={width}
        altura={height}
        quadro={q}
        cor={ficha.marca.cor}
        aproximada={ficha.localizacao === "aproximada"}
        raioAproxM={ficha.raioAproxM}
        marcadores={pontos.map((p, i) => ({ id: p.id, x: xz[i].x, z: xz[i].z, ativo: 0, arco: 1 }))}
        pulso={0}
      />
      {!semCartao && <div
        style={{
          position: "absolute", background: ESTILO.cartao, borderRadius: 40 * s, padding: `${40 * s}px ${48 * s}px`, boxShadow: "0 20px 70px rgba(40,30,20,0.22)",
          ...(vertical ? { left: 60 * s, right: 60 * s, bottom: 260 * s } : { left: 70 * s, top: 120 * s, width: 700 * s }),
        }}
      >
        {ficha.regiao && <div style={{ fontSize: 28 * s, letterSpacing: 5 * s, textTransform: "uppercase", color: ESTILO.textoSuave, fontWeight: 700 }}>{ficha.regiao}</div>}
        <div style={{ fontSize: 66 * s, fontWeight: 700, color: ESTILO.texto, lineHeight: 1.08, marginTop: 8 * s }}>{ficha.nome}</div>
        <div style={{ marginTop: 26 * s, display: "flex", flexDirection: "column", gap: 16 * s }}>
          {pontos.slice(0, 3).map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 18 * s }}>
              <div style={{ width: 58 * s, height: 58 * s, borderRadius: 16 * s, background: ficha.marca.cor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icone tipo={p.tipo} tamanho={34 * s} cor={ficha.marca.corTexto} />
              </div>
              <div style={{ fontSize: 34 * s, color: ESTILO.texto, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</div>
              <div style={{ fontSize: 32 * s, color: ficha.marca.cor, fontWeight: 700, whiteSpace: "nowrap" }}>{rotuloTempo(p) ?? ""}</div>
            </div>
          ))}
        </div>
      </div>}
      <Assinatura ficha={ficha} escala={s} vertical={vertical} />
    </AbsoluteFill>
  );
};
