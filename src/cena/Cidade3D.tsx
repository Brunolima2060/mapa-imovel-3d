import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import {
  CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Fog, PerspectiveCamera,
  RingGeometry, ShaderMaterial, TubeGeometry, Vector3, type DirectionalLight,
} from "three";
import type { DadosCidade } from "../cidade.ts";
import { ESTILO } from "./estilo.ts";
import { alturaTerreno, geometriaPredios, geometriaSaia, geometriaTerreno, pontosArco, raioDisco, texturaMapa } from "./geometrias.ts";
import type { Quadro } from "./camera.ts";
import { pontoNaMaquete } from "./camera.ts";

export type MarcadorCena = { id: string; x: number; z: number; ativo: number /*0..1*/; arco: number /*0..1*/ };

type Props = {
  dados: DadosCidade;
  largura: number;
  altura: number;
  quadro: Quadro;
  cor: string;
  aproximada: boolean;
  raioAproxM: number;
  marcadores: MarcadorCena[];
  pulso: number; // 0..1, anima o destaque do imóvel
};

const Camera: React.FC<{ q: Quadro; aspecto: number }> = ({ q, aspecto }) => {
  const { camera, scene } = useThree();
  useLayoutEffect(() => {
    const c = camera as PerspectiveCamera;
    c.fov = q.fov;
    c.aspect = aspecto;
    c.near = 5;
    c.far = 20000;
    c.position.set(...q.pos);
    c.lookAt(new Vector3(...q.alvo));
    c.updateProjectionMatrix();
    const dist = new Vector3(...q.pos).distanceTo(new Vector3(...q.alvo));
    scene.fog = new Fog(ESTILO.ceuBase, dist * 1.25, dist * 3.2);
  }, [camera, scene, q, aspecto]);
  return null;
};

// Luz do sol baixa (fim de tarde) com sombras que acompanham o alvo da câmera.
const Sol: React.FC<{ q: Quadro }> = ({ q }) => {
  const dist = Math.hypot(q.pos[0] - q.alvo[0], q.pos[1] - q.alvo[1], q.pos[2] - q.alvo[2]);
  const lado = Math.min(2600, Math.max(600, dist * 1.3));
  const ref = (l: DirectionalLight | null) => {
    if (!l) return;
    l.target.position.set(q.alvo[0], 0, q.alvo[2]);
    l.target.updateMatrixWorld();
    const s = l.shadow.camera;
    s.left = -lado; s.right = lado; s.top = lado; s.bottom = -lado; s.near = 10; s.far = 8000;
    s.updateProjectionMatrix();
  };
  return (
    <directionalLight
      ref={ref}
      castShadow
      color={ESTILO.sol}
      intensity={3.4}
      position={[q.alvo[0] - 1700, 1300, q.alvo[2] + 900]}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0004}
      shadow-normalBias={1.2}
    />
  );
};

const materialColuna = (cor: string) =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { cor: { value: new Color(cor) }, forca: { value: 1 } },
    vertexShader: "varying float vy; void main(){ vy = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 cor; uniform float forca; varying float vy; void main(){ gl_FragColor = vec4(cor, (1.0 - vy) * 0.42 * forca); }",
  });

const DestaqueImovel: React.FC<{ dados: DadosCidade; cor: string; aproximada: boolean; raio: number; pulso: number }> = ({ dados, cor, aproximada, raio, pulso }) => {
  const y0 = Math.max(0, alturaTerreno(dados, 0, 0));
  const r = aproximada ? raio : 18;
  const alto = aproximada ? 90 : 140;
  const coluna = useMemo(() => new CylinderGeometry(r, r, alto, 96, 1, true), [r, alto]);
  const anel = useMemo(() => new RingGeometry(r * 0.97, r * 1.03 + 2, 128), [r]);
  const mat = useMemo(() => materialColuna(cor), [cor]);
  const s = 1 + Math.sin(pulso * Math.PI * 2) * 0.015;
  return (
    <group position={[0, y0, 0]} scale={[s, 1, s]}>
      <mesh geometry={coluna} material={mat} position={[0, alto / 2, 0]} renderOrder={5} />
      <mesh geometry={anel} rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.5, 0]} renderOrder={6}>
        <meshBasicMaterial color={cor} transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {aproximada ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2, 0]} renderOrder={4}>
          <circleGeometry args={[r, 96]} />
          <meshBasicMaterial color={cor} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ) : (
        <mesh position={[0, alto + 10, 0]}>
          <sphereGeometry args={[11, 32, 16]} />
          <meshStandardMaterial color={cor} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
};

const Marcador: React.FC<{ dados: DadosCidade; m: MarcadorCena; cor: string }> = ({ dados, m, cor }) => {
  const p = pontoNaMaquete(m);
  const y = Math.max(0, alturaTerreno(dados, p.x, p.z));
  const haste = 34 + m.ativo * 26;
  const origem: [number, number, number] = [0, Math.max(0, alturaTerreno(dados, 0, 0)) + 30, 0];
  const tubo = useMemo(() => {
    if (m.arco <= 0.001) return null;
    const pts = pontosArco(origem, [p.x, y + haste, p.z]);
    const ate = Math.max(2, Math.round(pts.length * m.arco));
    const d = Math.hypot(p.x, p.z);
    return new TubeGeometry(new CatmullRomCurve3(pts.slice(0, ate).map((q) => new Vector3(...q))), 64, Math.max(2.2, d * 0.0032), 8, false);
  }, [m.arco, p.x, p.z, y, haste, origem[1]]);
  const corM = m.ativo > 0.5 ? cor : ESTILO.marcador;
  return (
    <group>
      <mesh position={[p.x, y + haste / 2, p.z]}>
        <cylinderGeometry args={[1.6, 1.6, haste, 8]} />
        <meshStandardMaterial color={corM} roughness={0.7} />
      </mesh>
      <mesh position={[p.x, y + haste, p.z]} scale={1 + m.ativo * 0.6}>
        <sphereGeometry args={[9, 24, 12]} />
        <meshStandardMaterial color={corM} roughness={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p.x, y + 1.5, p.z]}>
        <ringGeometry args={[12, 16 + m.ativo * 8, 48]} />
        <meshBasicMaterial color={corM} transparent opacity={0.8} depthWrite={false} />
      </mesh>
      {tubo && (
        <mesh geometry={tubo}>
          <meshBasicMaterial color={cor} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
};

export const Cidade3D: React.FC<Props> = ({ dados, largura, altura, quadro, cor, aproximada, raioAproxM, marcadores, pulso }) => {
  const terreno = useMemo(() => geometriaTerreno(dados), [dados]);
  const textura = useMemo(() => texturaMapa(dados), [dados]);
  const saia = useMemo(() => geometriaSaia(dados), [dados]);
  const predios = useMemo(() => geometriaPredios(dados), [dados]);
  const temMar = useMemo(() => dados.relevo.y.some((v) => v < 0), [dados]);
  const R = raioDisco(dados);
  return (
    <ThreeCanvas width={largura} height={altura} shadows gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
      <Camera q={quadro} aspecto={largura / altura} />
      <hemisphereLight args={["#FFF4E4", "#9C8B74", 0.75]} />
      <ambientLight intensity={0.12} />
      <Sol q={quadro} />
      <mesh geometry={terreno} receiveShadow>
        <meshStandardMaterial map={textura} roughness={0.95} />
      </mesh>
      <mesh geometry={saia}>
        <meshStandardMaterial color={ESTILO.chaoBorda} roughness={1} side={DoubleSide} />
      </mesh>
      {temMar && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} receiveShadow>
          <circleGeometry args={[R - 2, 180]} />
          <meshStandardMaterial color={ESTILO.mar} roughness={0.45} metalness={0} transparent opacity={0.92} />
        </mesh>
      )}
      <mesh geometry={predios} castShadow>
        <meshStandardMaterial vertexColors roughness={0.88} side={DoubleSide} />
      </mesh>
      <DestaqueImovel dados={dados} cor={cor} aproximada={aproximada} raio={raioAproxM} pulso={pulso} />
      {marcadores.map((m) => (
        <Marcador key={m.id} dados={dados} m={m} cor={cor} />
      ))}
    </ThreeCanvas>
  );
};

// Projeta um ponto 3D para a tela (para posicionar etiquetas HTML sobre a cena).
export const projetar = (q: Quadro, largura: number, altura: number, p: [number, number, number]): { x: number; y: number; visivel: boolean } => {
  const c = new PerspectiveCamera(q.fov, largura / altura, 5, 20000);
  c.position.set(...q.pos);
  c.lookAt(new Vector3(...q.alvo));
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  const v = new Vector3(...p).project(c);
  return { x: ((v.x + 1) / 2) * largura, y: ((1 - v.y) / 2) * altura, visivel: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
};

