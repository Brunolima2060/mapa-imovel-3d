// Formato de dados/cidade.json (gerado pela CLI, lido pelo vídeo). Metros relativos à origem: x leste, z sul.

export type XZ = [number, number];
export type Predio = { p: XZ[]; h: number; b: number; r?: 1 }; // h altura, b base (chão), r=1 volume de reserva
export type Rua = { p: XZ[]; tipo: "principal" | "local"; rodovia?: 1 };

export type DadosCidade = {
  origem: { lat: number; lon: number };
  raioM: number;
  relevo: { W: number; H: number; passo: number; x0: number; z0: number; y: number[] }; // y < 0 é mar
  predios: Predio[];
  ruas: Rua[];
  agua: XZ[][];
  verde: XZ[][];
  areia: XZ[][];
  arvores?: [number, number, number][]; // x, z, escala
  pontos: { id: string; x: number; z: number }[];
  imovel: { x: number; z: number };
  cobertura: number; // prédios reais por km²
};

export const alturaEm = (r: DadosCidade["relevo"], x: number, z: number): number => {
  const fx = (x - r.x0) / r.passo;
  const fz = (z - r.z0) / r.passo;
  const i = Math.min(r.W - 2, Math.max(0, Math.floor(fx)));
  const j = Math.min(r.H - 2, Math.max(0, Math.floor(fz)));
  const u = Math.min(1, Math.max(0, fx - i));
  const v = Math.min(1, Math.max(0, fz - j));
  const y = r.y;
  const a = y[j * r.W + i], b = y[j * r.W + i + 1], c = y[(j + 1) * r.W + i], d = y[(j + 1) * r.W + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};
