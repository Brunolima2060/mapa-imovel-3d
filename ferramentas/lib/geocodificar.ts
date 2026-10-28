import { buscar } from "./http.ts";
import { lerCoordenadas, type LatLon } from "./geo.ts";

export type Lugar = LatLon & { nomeExibicao: string; regiao?: string };

// "Bairro · Cidade": pode ir a público (não identifica a porta).
export const regiaoDe = (a: Record<string, string> = {}): string | undefined => {
  const bairro = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district;
  const cidade = a.city ?? a.town ?? a.village ?? a.municipality;
  const r = [bairro, cidade].filter(Boolean).join(" · ");
  return r || undefined;
};

export const geocodificar = async (texto: string, cacheDir: string): Promise<Lugar> => {
  const c = lerCoordenadas(texto);
  if (c) {
    const rev = await buscar(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${c.lat}&lon=${c.lon}`, { cacheDir }).catch(() => null);
    return { ...c, nomeExibicao: rev?.display_name ?? `${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`, regiao: regiaoDe(rev?.address) };
  }
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(texto)}`;
  const r = await buscar(url, { cacheDir });
  if (!Array.isArray(r) || r.length === 0) {
    throw new Error(
      `Não achei "${texto}" no mapa. Tente escrever com cidade e estado (ex.: "Rua X, 123, Ubatuba, SP"), ` +
        `ou cole as coordenadas (ex.: -23.4339, -45.0712) ou o link do Google Maps do imóvel.`,
    );
  }
  return { lat: parseFloat(r[0].lat), lon: parseFloat(r[0].lon), nomeExibicao: r[0].display_name, regiao: regiaoDe(r[0].address) };
};
