// Roteiro do vídeo e câmera. A câmera é descrita por (alvo, distância, azimute, elevação): interpolar esses
// números dá arcos suaves, sem cortes. Azimute 0 = câmera ao sul olhando para o norte.

export type TipoCena = "abertura" | "chegada" | "ponto" | "alcance" | "planta" | "foto" | "fecho";
export type Cena = { tipo: TipoCena; ini: number; dur: number; indice: number };
export type Roteiro = { cenas: Cena[]; total: number; fps: number };
export type Quadro = { pos: [number, number, number]; alvo: [number, number, number]; fov: number };
type Pose = { ax: number; az: number; dist: number; azim: number; elev: number };

export const DURACAO = { abertura: 2.5, chegada: 3, ponto: 3, alcance: 6, planta: 5, foto: 2, fecho: 3 } as const;
export const MAX_FOTOS = 4;
const TRANSICAO = 1.4; // segundos de viagem no começo de cada cena

export type Ritmo = "anuncio" | "apresentacao";
// Apresentação (site, reunião): mesmas cenas, mais tempo em cada uma para ler com calma.
const FATOR: Record<Ritmo, number> = { anuncio: 1, apresentacao: 1.6 };

export const montarRoteiro = ({ nPontos, comPlanta, nFotos, fps, comAlcance = false, ritmo = "anuncio" }: { nPontos: number; comPlanta: boolean; nFotos: number; fps: number; comAlcance?: boolean; ritmo?: Ritmo }): Roteiro => {
  const tipos: [TipoCena, number][] = [["abertura", 0], ["chegada", 0]];
  for (let i = 0; i < nPontos; i++) tipos.push(["ponto", i]);
  if (comAlcance) tipos.push(["alcance", 0]);
  if (comPlanta) tipos.push(["planta", 0]);
  for (let i = 0; i < Math.min(nFotos, MAX_FOTOS); i++) tipos.push(["foto", i]);
  tipos.push(["fecho", 0]);
  const cenas: Cena[] = [];
  let t = 0;
  for (const [tipo, indice] of tipos) {
    const dur = Math.round(DURACAO[tipo] * FATOR[ritmo] * fps);
    cenas.push({ tipo, ini: t, dur, indice });
    t += dur;
  }
  return { cenas, total: t, fps };
};

const grau = Math.PI / 180;
const AZ_BASE = -18 * grau; // levemente de sudoeste: luz do sol de lado, volumes aparecem
const suave = (t: number) => (1 - Math.cos(Math.PI * t)) / 2; // pico de velocidade baixo (1,57x a média)
const mistura = (a: Pose, b: Pose, t: number): Pose => {
  const k = suave(Math.min(1, Math.max(0, t)));
  // distância interpolada em escala logarítmica: aproximar/afastar parece constante
  return {
    ax: a.ax + (b.ax - a.ax) * k,
    az: a.az + (b.az - a.az) * k,
    dist: Math.exp(Math.log(a.dist) + (Math.log(b.dist) - Math.log(a.dist)) * k),
    azim: a.azim + (b.azim - a.azim) * k,
    elev: a.elev + (b.elev - a.elev) * k,
  };
};

// diferença de ângulo no intervalo (-π, π]
const anguloEntre = (a: number, b: number) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d <= -Math.PI) d += 2 * Math.PI; return d; };

const RAIO_VISIVEL = 1400; // pontos mais longe que isso aparecem na borda da maquete
export const pontoNaMaquete = (p: { x: number; z: number }) => {
  const d = Math.hypot(p.x, p.z);
  if (d <= RAIO_VISIVEL) return { x: p.x, z: p.z, longe: false };
  return { x: (p.x / d) * RAIO_VISIVEL, z: (p.z / d) * RAIO_VISIVEL, longe: true };
};

// Pose no começo e no fim de cada cena (a câmera vai de uma a outra devagar durante a cena).
const posesDaCena = (c: Cena, pontos: { x: number; z: number }[], vertical: boolean): [Pose, Pose] => {
  switch (c.tipo) {
    case "abertura":
      return [
        { ax: 0, az: 0, dist: 3600, azim: AZ_BASE - 25 * grau, elev: 62 * grau },
        { ax: 0, az: 0, dist: 1500, azim: AZ_BASE - 10 * grau, elev: 47 * grau },
      ];
    case "chegada":
      return [
        { ax: 0, az: 0, dist: 1000, azim: AZ_BASE - 4 * grau, elev: 44 * grau },
        { ax: 0, az: 0, dist: 820, azim: AZ_BASE + 8 * grau, elev: 40 * grau },
      ];
    case "ponto": {
      const p = pontoNaMaquete(pontos[c.indice] ?? { x: 0, z: 0 });
      const d = Math.hypot(p.x, p.z);
      const dist = Math.min(3200, Math.max(vertical ? 1000 : 900, d * (vertical ? 1.6 : 1.15)));
      // em pé, a câmera olha na direção do ponto (a linha fica na vertical da tela); deitado, de lado
      const rumo = Math.atan2(p.x, -p.z) + (vertical ? 0 : Math.PI / 2);
      const azim = AZ_BASE + Math.max(-50 * grau, Math.min(50 * grau, anguloEntre(AZ_BASE, rumo)));
      const base = { ax: p.x * 0.55, az: p.z * 0.55, dist, azim, elev: 52 * grau };
      return [base, { ...base, dist: dist * 0.94, azim: azim + 5 * grau }];
    }
    case "alcance":
    case "planta":
    case "foto":
      // a cena 3D fica ao fundo, desfocada; câmera gira devagar em volta do imóvel
      return [
        { ax: 0, az: 0, dist: 900, azim: AZ_BASE + 10 * grau, elev: 45 * grau },
        { ax: 0, az: 0, dist: 900, azim: AZ_BASE + 30 * grau, elev: 45 * grau },
      ];
    case "fecho":
      return [
        { ax: 0, az: 0, dist: 1000, azim: AZ_BASE + 20 * grau, elev: 44 * grau },
        { ax: 0, az: 0, dist: 1700, azim: AZ_BASE + 40 * grau, elev: 55 * grau },
      ];
  }
};

const paraQuadro = (p: Pose, vertical: boolean): Quadro => {
  const h = Math.cos(p.elev) * p.dist;
  return {
    pos: [p.ax - Math.sin(p.azim) * h, Math.sin(p.elev) * p.dist, p.az + Math.cos(p.azim) * h],
    alvo: [p.ax, 0, p.az],
    fov: vertical ? 50 : 38,
  };
};

export const quadroCamera = (r: Roteiro, frame: number, pontos: { x: number; z: number }[], vertical: boolean): Quadro => {
  const i = Math.max(0, r.cenas.findIndex((c) => frame >= c.ini && frame < c.ini + c.dur));
  const idx = frame >= r.total ? r.cenas.length - 1 : i;
  const c = r.cenas[idx];
  const [ini, fim] = posesDaCena(c, pontos, vertical);
  const t = Math.min(1, (frame - c.ini) / c.dur);
  const deriva = mistura(ini, fim, t);
  const trans = Math.round(TRANSICAO * r.fps);
  if (idx > 0 && frame - c.ini < trans) {
    const ant = r.cenas[idx - 1];
    const [, fimAnt] = posesDaCena(ant, pontos, vertical);
    return paraQuadro(mistura(fimAnt, deriva, (frame - c.ini) / trans), vertical);
  }
  return paraQuadro(deriva, vertical);
};
