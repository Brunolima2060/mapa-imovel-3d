// A ficha do imóvel: fonte única de tudo o que a skill gera. Fica só no computador do usuário.
// O que vai a público (vídeo, capa, mapa interativo, textos) passa SEMPRE por fichaPublica().

import { z } from "zod";
import { deMetros, metrosEntre, type LatLon } from "./geo.ts";

const latLon = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });
const trecho = z.object({ metros: z.number().nonnegative(), minutos: z.number().int().positive() });

export const TIPOS_PONTO = [
  "praia", "metro", "trem", "onibus", "mercado", "padaria", "farmacia", "hospital", "restaurante",
  "parque", "shopping", "atracao", "aeroporto", "rodoviaria", "rodovia", "porto", "centro", "carga", "outro",
] as const;

const ponto = latLon.extend({
  id: z.string(),
  nome: z.string(),
  tipo: z.enum(TIPOS_PONTO),
  ape: trecho.optional(),
  carro: trecho.optional(),
  noVideo: z.boolean().default(false),
});

export const TIPOS_COMODO = ["sala", "quarto", "cozinha", "banheiro", "varanda", "area", "outro"] as const;
export const TIPOS_MOVEL = [
  "cama", "cama-solteiro", "sofa", "mesa", "pia", "fogao", "geladeira", "vaso", "chuveiro", "tv", "armario", "planta",
] as const;

const comodo = z.object({
  nome: z.string(),
  tipo: z.enum(TIPOS_COMODO),
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
});
const movel = z.object({
  tipo: z.enum(TIPOS_MOVEL),
  comodo: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  giro: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
});

// Ficha técnica de galpão comercial / logístico (perfil "galpao").
const fichaGalpao = z.object({
  areaConstruidaM2: z.number().positive(),
  areaTerrenoM2: z.number().positive().optional(),
  larguraM: z.number().positive().optional(),
  comprimentoM: z.number().positive().optional(),
  peDireitoM: z.number().positive(),
  docas: z.number().int().nonnegative(),
  niveladoras: z.number().int().nonnegative().optional(),
  pisoTm2: z.number().positive().optional(),
  energiaKva: z.number().positive().optional(),
  sprinklers: z.boolean().optional(),
  escritorioM2: z.number().nonnegative().optional(),
  patio: z.string().optional(), // ex.: "pátio para carretas" (texto livre)
  modulos: z.number().int().positive().optional(),
  modulosDetalhe: z.array(z.object({ nome: z.string(), areaM2: z.number().positive(), docas: z.number().int().nonnegative().optional(), disponivel: z.boolean().optional() })).optional(),
  extras: z.array(z.string()).optional(), // ex.: "portaria 24h", "cabine primária"
});

export const esquemaFicha = z.object({
  versao: z.literal(1),
  perfil: z.enum(["residencial", "galpao"]).default("residencial"),
  galpao: fichaGalpao.optional(),
  slug: z.string().min(1),
  nome: z.string().min(1),
  chamada: z.string().default("Reserve agora"),
  regiao: z.string().optional(), // "Bairro · Cidade" (público)
  destaques: z.array(z.string()).optional(), // ex.: "2 quartos", "vista para o mar" (público)
  endereco: z.string(),
  local: latLon,
  localizacao: z.enum(["aproximada", "exata"]).default("aproximada"),
  raioAproxM: z.number().min(50).max(2000).default(250),
  area: latLon.optional(),
  pontos: z.array(ponto),
  marca: z.object({
    nome: z.string(),
    cor: z.string().default("#C8643C"),
    corTexto: z.string().default("#FFFFFF"),
    logo: z.string().optional(),
    contato: z.string().optional(), // telefone / WhatsApp / e-mail do corretor (aparece no PDF e no fecho)
    site: z.string().optional(),
  }),
  // Galpão: alcance de caminhão (isócronas) e vizinhos logísticos de peso. Calculados a partir do centro público.
  logistica: z
    .object({
      alcance: z.array(z.object({ minutos: z.number(), poligono: z.array(z.tuple([z.number(), z.number()])), cidades: z.array(z.string()) })).optional(),
      vizinhos: z.array(latLon.extend({ nome: z.string(), metros: z.number() })).optional(),
    })
    .optional(),
  anuncio: z.object({ link: z.string().optional(), plataforma: z.string().optional(), mapaUrl: z.string().optional() }).optional(),
  planta: z.object({ comodos: z.array(comodo), moveis: z.array(movel).optional(), areaTotalM2: z.number().optional() }).optional(),
  guia: z
    .object({
      origem: latLon.extend({ nome: z.string() }),
      rota: z.array(z.tuple([z.number(), z.number()])).optional(),
      minutos: z.number().optional(),
      metros: z.number().optional(),
      estacionamento: z.string().optional(),
      entrada: z.string().optional(),
      observacoes: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  fotos: z.array(z.string()).optional(),
  voz: z.object({ ativa: z.boolean(), voz: z.string().optional() }).optional(),
});

export type Ficha = z.infer<typeof esquemaFicha>;
export type Ponto = Ficha["pontos"][number];
export type TipoPonto = Ponto["tipo"];
export type Trecho = z.infer<typeof trecho>;
export type Planta = NonNullable<Ficha["planta"]>;
export type Comodo = Planta["comodos"][number];
export type Movel = NonNullable<Planta["moveis"]>[number];
export type FichaGalpao = z.infer<typeof fichaGalpao>;
export type FichaPublica = Omit<Ficha, "local" | "endereco" | "guia"> & { centro: LatLon };

// Gerador determinístico a partir de um texto (FNV-1a + mulberry32).
export const sorteador = (semente: string) => {
  let h = 2166136261;
  for (let i = 0; i < semente.length; i++) h = Math.imul(h ^ semente.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Centro do círculo "localização aproximada": deslocado de 35% a 70% do raio, então o imóvel fica dentro do
// círculo mas nunca no meio dele. O sorteio é aleatório de verdade (crypto) e fica salvo na ficha: se saísse de
// algo público (o nome, o slug), qualquer um refaria a conta e acharia a porta.
export const sortearArea = (local: LatLon, raioM: number): LatLon => {
  const n = new Uint32Array(2);
  globalThis.crypto.getRandomValues(n);
  const ang = (n[0] / 4294967296) * Math.PI * 2;
  const d = raioM * (0.35 + (n[1] / 4294967296) * 0.35);
  return deMetros(local, [Math.cos(ang) * d, Math.sin(ang) * d]);
};

export const areaValida = (f: Pick<Ficha, "local" | "area" | "raioAproxM">) => !!f.area && metrosEntre(f.local, f.area) <= f.raioAproxM * 0.98;

export const fichaPublica = (f: Ficha): FichaPublica => {
  const { local, endereco: _e, guia: _g, ...resto } = f;
  if (f.localizacao === "aproximada" && !areaValida(f)) {
    throw new Error("A área aproximada da ficha está faltando ou não cobre mais o imóvel (o raio mudou?). Rode: area <slug>");
  }
  const anuncio = f.anuncio?.link && !/^https?:\/\//i.test(f.anuncio.link) ? { ...f.anuncio, link: undefined } : f.anuncio;
  return { ...resto, anuncio, centro: f.localizacao === "exata" ? local : f.area! };
};
