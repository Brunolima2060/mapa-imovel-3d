// Geometrias da maquete (Three.js): disco de terreno com textura do mapa, saia lateral, prédios em um único
// buffer, arco até um ponto. Tudo em metros, x leste, y cima, z sul.

import { BufferAttribute, BufferGeometry, CanvasTexture, Color, LinearMipmapLinearFilter, SRGBColorSpace, ShapeUtils, Vector2 } from "three";
import { alturaEm, type DadosCidade, type XZ } from "../cidade.ts";
import { ESTILO } from "./estilo.ts";

export const raioDisco = (d: DadosCidade) => d.raioM + 120;

// Achata o relevo perto da borda do disco para a saia ficar limpa.
export const alturaTerreno = (d: DadosCidade, x: number, z: number) => alturaEm(d.relevo, x, z);

export const texturaMapa = (d: DadosCidade, px = 2048): CanvasTexture => {
  const r = d.relevo;
  const tam = (r.W - 1) * r.passo; // metros cobertos
  const k = px / tam; // px por metro
  const cv = document.createElement("canvas");
  cv.width = cv.height = px;
  const g = cv.getContext("2d")!;
  const X = (x: number) => (x - r.x0) * k;
  const Z = (z: number) => (z - r.z0) * k;
  g.fillStyle = ESTILO.chao;
  g.fillRect(0, 0, px, px);
  // mar: células abaixo de zero
  g.fillStyle = ESTILO.mar;
  for (let j = 0; j < r.H; j++)
    for (let i = 0; i < r.W; i++) if (r.y[j * r.W + i] < 0) g.fillRect((i - 0.5) * r.passo * k, (j - 0.5) * r.passo * k, r.passo * k + 1, r.passo * k + 1);
  const poligono = (p: XZ[], cor: string) => {
    g.fillStyle = cor;
    g.beginPath();
    p.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.closePath();
    g.fill();
  };
  d.verde.forEach((p) => poligono(p, ESTILO.verde));
  d.areia.forEach((p) => poligono(p, ESTILO.areia));
  d.agua.forEach((p) => poligono(p, ESTILO.agua));
  g.lineCap = g.lineJoin = "round";
  const tracar = (larguraM: number, cor: string, tipo: "principal" | "local") => {
    g.strokeStyle = cor;
    g.lineWidth = larguraM * k;
    g.beginPath();
    for (const rua of d.ruas) {
      if (rua.tipo !== tipo) continue;
      rua.p.forEach(([x, z], i) => (i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    }
    g.stroke();
  };
  tracar(10, ESTILO.ruaBorda, "local");
  tracar(16, ESTILO.ruaBorda, "principal");
  tracar(8, ESTILO.rua, "local");
  tracar(13.5, ESTILO.rua, "principal");
  // pegada dos prédios um pouco mais escura no chão (sombra de contato)
  g.fillStyle = "rgba(120, 104, 84, 0.18)";
  for (const p of d.predios) {
    g.beginPath();
    p.p.forEach(([x, z], i) => (i ? g.lineTo(X(x) + 1.2, Z(z) + 1.2) : g.moveTo(X(x) + 1.2, Z(z) + 1.2)));
    g.closePath();
    g.fill();
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.minFilter = LinearMipmapLinearFilter;
  return t;
};

export const geometriaTerreno = (d: DadosCidade): BufferGeometry => {
  const r = d.relevo;
  const R = raioDisco(d);
  const pos = new Float32Array(r.W * r.H * 3);
  const uv = new Float32Array(r.W * r.H * 2);
  for (let j = 0; j < r.H; j++)
    for (let i = 0; i < r.W; i++) {
      const k = j * r.W + i;
      const x = r.x0 + i * r.passo, z = r.z0 + j * r.passo;
      pos.set([x, r.y[k], z], k * 3);
      uv.set([i / (r.W - 1), 1 - j / (r.H - 1)], k * 2);
    }
  const idx: number[] = [];
  for (let j = 0; j < r.H - 1; j++)
    for (let i = 0; i < r.W - 1; i++) {
      const a = j * r.W + i, b = a + 1, c = a + r.W, e = c + 1;
      const cx = r.x0 + (i + 0.5) * r.passo, cz = r.z0 + (j + 0.5) * r.passo;
      if (Math.hypot(cx, cz) > R) continue;
      idx.push(a, c, b, b, c, e);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// Parede lateral do disco (a "base" da maquete).
export const geometriaSaia = (d: DadosCidade, fundo = -70): BufferGeometry => {
  const R = raioDisco(d) - d.relevo.passo * 0.7;
  const N = 360;
  const pos: number[] = [];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R];
    const y0 = Math.max(0, alturaTerreno(d, p0[0], p0[1])), y1 = Math.max(0, alturaTerreno(d, p1[0], p1[1]));
    pos.push(p0[0], y0, p0[1], p0[0], fundo, p0[1], p1[0], y1, p1[1], p1[0], y1, p1[1], p0[0], fundo, p0[1], p1[0], fundo, p1[1]);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
};

export const geometriaPredios = (d: DadosCidade): BufferGeometry => {
  const R = raioDisco(d) - 25;
  const pos: number[] = [];
  const cor: number[] = [];
  const c1 = new Color(ESTILO.predio), c2 = new Color(ESTILO.predioReserva);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (const p of d.predios) {
    const n = p.p.length;
    const cx = p.p.reduce((a, q) => a + q[0], 0) / n, cz = p.p.reduce((a, q) => a + q[1], 0) / n;
    if (Math.hypot(cx, cz) > R) continue;
    const base = p.b - 1.5; // afunda um pouco: em encosta não fica "voando"
    const topo = p.b + p.h;
    const c = (p.r ? c2 : c1).clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.05);
    // sentido anti-horário visto de cima (y para cima): normais das paredes para fora
    let area = 0;
    for (let i = 0; i < n; i++) { const [x1, z1] = p.p[i], [x2, z2] = p.p[(i + 1) % n]; area += x1 * z2 - x2 * z1; }
    const pts = area > 0 ? p.p : [...p.p].reverse();
    for (let i = 0; i < n; i++) {
      const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % n];
      pos.push(x1, base, z1, x1, topo, z1, x2, base, z2, x2, base, z2, x1, topo, z1, x2, topo, z2);
      for (let k = 0; k < 6; k++) cor.push(c.r * 0.97, c.g * 0.97, c.b * 0.97);
    }
    const tri = ShapeUtils.triangulateShape(pts.map(([x, z]) => new Vector2(x, z)), []);
    for (const [a, b, e] of tri) {
      for (const k of [a, e, b]) pos.push(pts[k][0], topo, pts[k][1]);
      for (let k = 0; k < 3; k++) cor.push(c.r, c.g, c.b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(cor), 3));
  g.computeVertexNormals();
  return g;
};

// Pontos de um arco entre o imóvel e um ponto (altura proporcional à distância).
export const pontosArco = (de: [number, number, number], ate: [number, number, number], n = 64): [number, number, number][] => {
  const d = Math.hypot(ate[0] - de[0], ate[2] - de[2]);
  const pico = Math.max(40, d * 0.22);
  // barriga para o lado: o arco continua parecendo arco mesmo visto de frente
  const lado = d * 0.18;
  const nx = d ? -(ate[2] - de[2]) / d : 0, nz = d ? (ate[0] - de[0]) / d : 0;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const b = Math.sin(Math.PI * t);
    return [de[0] + (ate[0] - de[0]) * t + nx * lado * b, de[1] + (ate[1] - de[1]) * t + b * pico, de[2] + (ate[2] - de[2]) * t + nz * lado * b] as [number, number, number];
  });
};
