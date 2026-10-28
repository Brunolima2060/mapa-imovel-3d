// Contas de mapa usadas pela CLI e pelo vídeo. Metros locais: x para o leste, z para o sul (padrão do Three.js
// com a câmera olhando para o norte).

export type LatLon = { lat: number; lon: number };

const RAIO_TERRA = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;

export const metrosEntre = (a: LatLon, b: LatLon): number => {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA * Math.asin(Math.sqrt(h));
};

const escalas = (origem: LatLon) => ({
  kx: (Math.PI / 180) * RAIO_TERRA * Math.cos(rad(origem.lat)),
  ky: (Math.PI / 180) * RAIO_TERRA,
});

export const paraMetros = (origem: LatLon, p: LatLon): [number, number] => {
  const { kx, ky } = escalas(origem);
  return [(p.lon - origem.lon) * kx, -(p.lat - origem.lat) * ky];
};

export const deMetros = (origem: LatLon, [x, z]: [number, number]): LatLon => {
  const { kx, ky } = escalas(origem);
  return { lat: origem.lat - z / ky, lon: origem.lon + x / kx };
};

const valida = (lat: number, lon: number): LatLon | null =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;

// Aceita "-23.43, -45.07", links do Google Maps com "@lat,lon" ou "q=lat,lon" / "ll=lat,lon".
export const lerCoordenadas = (texto: string): LatLon | null => {
  const num = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
  const padroes = [
    new RegExp(String.raw`@${num},\s*${num}`),
    new RegExp(String.raw`[?&](?:q|ll|query|destination)=${num},\s*${num}`),
    new RegExp(String.raw`^\s*${num}\s*[,;]\s*${num}\s*$`),
  ];
  for (const re of padroes) {
    const m = texto.match(re);
    if (m) return valida(parseFloat(m[1]), parseFloat(m[2]));
  }
  return null;
};

export const criarSlug = (texto: string): string =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
