import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/DMSans";
import type { FichaPublica } from "../ficha.ts";
import { paraMetros } from "../geo.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";
import { montarRoteiro, pontoNaMaquete, quadroCamera, type Roteiro } from "../cena/camera.ts";
import { Cidade3D, projetar, type MarcadorCena } from "../cena/Cidade3D.tsx";
import { alturaEm, type DadosCidade } from "../cidade.ts";
import { useDadosCidade } from "./dados.ts";
import { Assinatura, CartaoPonto, Etiqueta, Fecho, Titulo, entrada, saida } from "./Interface.tsx";
import { PlantaAnimada } from "../planta/PlantaSvg.tsx";

loadFont("normal", { weights: ["500", "600", "700"], subsets: ["latin", "latin-ext"] });

export type PropsVideo = { ficha: FichaPublica; comPlanta: boolean; fotos: string[] };

export const pontosDoVideo = (f: FichaPublica) => f.pontos.filter((p) => p.noVideo);
export const roteiroDe = (p: PropsVideo, fps: number): Roteiro =>
  montarRoteiro({ nPontos: pontosDoVideo(p.ficha).length, comPlanta: p.comPlanta && !!p.ficha.planta?.comodos.length, nFotos: p.fotos.length, fps });

const Ceu: React.FC = () => <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ESTILO.ceuTopo} 0%, ${ESTILO.ceuBase} 62%)` }} />;

export const VideoImovel: React.FC<PropsVideo> = (props) => {
  const dados = useDadosCidade();
  const { width, height, fps } = useVideoConfig();
  if (!dados) return <Ceu />;
  return <Video {...props} dados={dados} largura={width} altura={height} fps={fps} />;
};

const Video: React.FC<PropsVideo & { dados: DadosCidade; largura: number; altura: number; fps: number }> = ({ ficha, fotos, comPlanta, dados, largura, altura, fps }) => {
  const f = useCurrentFrame();
  const vertical = altura > largura;
  const escala = Math.min(largura, altura) / 1080;
  const roteiro = roteiroDe({ ficha, fotos, comPlanta }, fps);
  const pontos = pontosDoVideo(ficha);
  const xz = pontos.map((p) => { const [x, z] = paraMetros(dados.origem, p); return { x, z }; });
  const q = quadroCamera(roteiro, f, xz, vertical);
  const cena = roteiro.cenas.find((c) => f >= c.ini && f < c.ini + c.dur) ?? roteiro.cenas[roteiro.cenas.length - 1];
  const local = f - cena.ini;

  const marcadores: MarcadorCena[] = pontos.map((p, i) => {
    const c = roteiro.cenas.find((x) => x.tipo === "ponto" && x.indice === i)!;
    const ativo = f >= c.ini && f < c.ini + c.dur ? entrada(f, c.ini + 12, 14) * saida(f, c.ini + c.dur, 8) : 0;
    const arco = f >= c.ini ? interpolate(f, [c.ini + 14, c.ini + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (f < c.ini + c.dur ? 1 : 0.0) : 0;
    const visivelDesde = roteiro.cenas[1].ini + 20;
    return { id: p.id, x: xz[i].x, z: xz[i].z, ativo, arco: f >= visivelDesde ? arco : 0 };
  });

  const fundoDesfocado = cena.tipo === "planta" || cena.tipo === "foto";
  const desfoque = fundoDesfocado ? interpolate(local, [0, 12], [0, 14], { extrapolateRight: "clamp" }) * saida(f, cena.ini + cena.dur, 10) : 0;

  return (
    <AbsoluteFill style={{ fontFamily: FONTE }}>
      <Ceu />
      <AbsoluteFill style={{ filter: desfoque > 0.1 ? `blur(${desfoque}px)` : undefined }}>
        <Cidade3D
          dados={dados}
          largura={largura}
          altura={altura}
          quadro={q}
          cor={ficha.marca.cor}
          aproximada={ficha.localizacao === "aproximada"}
          raioAproxM={ficha.raioAproxM}
          marcadores={marcadores}
          pulso={(f % fps) / fps}
        />
      </AbsoluteFill>

      {cena.tipo === "abertura" && <Titulo ficha={ficha} vis={entrada(f, 8) * saida(f, cena.ini + cena.dur, 10)} escala={escala} vertical={vertical} />}

      {cena.tipo === "chegada" && (() => {
        const y = Math.max(0, alturaEm(dados.relevo, 0, 0)) + (ficha.localizacao === "aproximada" ? 95 : 165);
        const p = projetar(q, largura, altura, [0, y, 0]);
        const vis = entrada(local, 10) * saida(f, cena.ini + cena.dur, 8);
        return p.visivel ? <Etiqueta x={p.x} y={p.y} texto={ficha.localizacao === "aproximada" ? "O imóvel fica nesta região" : "O imóvel fica aqui"} cor={ficha.marca.cor} vis={vis} escala={escala} destaque /> : null;
      })()}

      {cena.tipo === "ponto" && (() => {
        const p = pontos[cena.indice];
        const m = pontoNaMaquete(xz[cena.indice]);
        const y = Math.max(0, alturaEm(dados.relevo, m.x, m.z)) + 75;
        const t = projetar(q, largura, altura, [m.x, y, m.z]);
        const vis = entrada(local, 14) * saida(f, cena.ini + cena.dur, 8);
        return (
          <>
            {t.visivel && <Etiqueta x={Math.min(largura - 230 * escala, Math.max(230 * escala, t.x))} y={Math.max(260 * escala, t.y)} texto={p.nome} cor={ficha.marca.cor} vis={vis} escala={escala * 0.9} />}
            <CartaoPonto p={p} cor={ficha.marca.cor} corTexto={ficha.marca.corTexto} vis={vis} escala={escala} vertical={vertical} n={cena.indice + 1} total={pontos.length} longe={m.longe} />
          </>
        );
      })()}

      {cena.tipo === "planta" && ficha.planta && (
        <AbsoluteFill style={{ opacity: entrada(local, 0, 10) * saida(f, cena.ini + cena.dur, 10) }}>
          <PlantaAnimada planta={ficha.planta} cor={ficha.marca.cor} largura={largura} altura={altura} quadro={local} duracao={cena.dur} titulo="Por dentro" />
        </AbsoluteFill>
      )}

      {cena.tipo === "foto" && fotos[cena.indice] && (() => {
        const vis = entrada(local, 0, 10) * saida(f, cena.ini + cena.dur, 8);
        const zoom = interpolate(local, [0, cena.dur], [1.04, 1.12]);
        const w = vertical ? largura * 0.86 : largura * 0.62;
        const h = vertical ? altura * 0.58 : altura * 0.74;
        return (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: vis }}>
            <div style={{ width: w, height: h, borderRadius: 40 * escala, overflow: "hidden", boxShadow: "0 24px 80px rgba(40,30,20,0.3)", transform: `translateY(${(1 - vis) * 30}px)` }}>
              <Img src={staticFile(fotos[cena.indice])} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
            </div>
          </AbsoluteFill>
        );
      })()}

      {cena.tipo === "fecho" && <Fecho ficha={ficha} vis={entrada(local, 6, 16)} escala={escala} vertical={vertical} />}

      <Assinatura ficha={ficha} escala={escala} vertical={vertical} />
    </AbsoluteFill>
  );
};
