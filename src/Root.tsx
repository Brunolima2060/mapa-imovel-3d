import { Composition, Still } from "remotion";
import { VideoImovel, roteiroDe, type PropsVideo } from "./video/VideoImovel.tsx";
import { Capa } from "./video/Capa.tsx";
import { DURACAO_GUIA, GuiaChegada, type PropsGuia } from "./video/GuiaChegada.tsx";
import { PlantaImagem } from "./planta/PlantaImagem.tsx";
import type { FichaPublica } from "./ficha.ts";

const FPS = 30;

// Props de exemplo só para o Remotion Studio abrir; a CLI sempre passa a ficha do imóvel.
const exemplo: FichaPublica = {
  versao: 1, slug: "exemplo", nome: "Imóvel de exemplo", chamada: "Reserve agora", localizacao: "aproximada", raioAproxM: 250,
  centro: { lat: 0, lon: 0 }, pontos: [], marca: { nome: "Sua marca", cor: "#C8643C", corTexto: "#FFFFFF" },
};
const guiaExemplo: PropsGuia = { nome: "Imóvel de exemplo", marca: exemplo.marca, origem: "Rodoviária", rota: [] };
const propsExemplo: PropsVideo = { ficha: exemplo, comPlanta: false, fotos: [] };

const duracao = ({ props }: { props: PropsVideo }) => ({ durationInFrames: roteiroDe(props, FPS).total });

export const Raiz: React.FC = () => (
  <>
    <Composition id="ImovelVertical" component={VideoImovel} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={propsExemplo} calculateMetadata={duracao} />
    <Composition id="ImovelHorizontal" component={VideoImovel} width={1920} height={1080} fps={FPS} durationInFrames={300} defaultProps={propsExemplo} calculateMetadata={duracao} />
    <Composition id="GuiaVertical" component={GuiaChegada} width={1080} height={1920} fps={FPS} durationInFrames={DURACAO_GUIA * FPS} defaultProps={guiaExemplo} />
    <Composition id="GuiaHorizontal" component={GuiaChegada} width={1920} height={1080} fps={FPS} durationInFrames={DURACAO_GUIA * FPS} defaultProps={guiaExemplo} />
    <Still id="Planta" component={PlantaImagem} width={1600} height={1200} defaultProps={{ ficha: exemplo }} />
    <Still id="Capa" component={Capa} width={1080} height={1920} defaultProps={{ ficha: exemplo }} />
    <Still id="CapaHorizontal" component={Capa} width={1920} height={1080} defaultProps={{ ficha: exemplo }} />
  </>
);
