// Peças de interface por cima da maquete: título, cartão do ponto, etiqueta, fecho, assinatura.
import { Img, interpolate, staticFile } from "remotion";
import type { FichaPublica, Ponto } from "../ficha.ts";
import { ESTILO, FONTE } from "../cena/estilo.ts";
import { rotuloDistancia, rotuloTempo } from "../tempo.ts";
import { Icone, NOME_TIPO } from "./Icone.tsx";

export const entrada = (f: number, ini: number, dur = 12) => interpolate(f, [ini, ini + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
export const saida = (f: number, fim: number, dur = 10) => interpolate(f, [fim - dur, fim], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const Titulo: React.FC<{ ficha: FichaPublica; vis: number; escala: number; vertical: boolean }> = ({ ficha, vis, escala, vertical }) => (
  <>
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: (vertical ? 760 : 460) * escala, opacity: vis, background: "linear-gradient(180deg, rgba(242,232,218,0.92) 0%, rgba(242,232,218,0.75) 55%, rgba(242,232,218,0) 100%)" }} />
  <div style={{ position: "absolute", left: 0, right: 0, top: vertical ? 250 * escala : 90 * escala, textAlign: "center", opacity: vis, transform: `translateY(${(1 - vis) * 30}px)`, fontFamily: FONTE }}>
    {ficha.regiao && (
      <div style={{ fontSize: 34 * escala, letterSpacing: 6 * escala, textTransform: "uppercase", color: ESTILO.textoSuave, fontWeight: 600 }}>{ficha.regiao}</div>
    )}
    <div style={{ fontSize: 92 * escala, fontWeight: 700, color: ESTILO.texto, lineHeight: 1.05, marginTop: 14 * escala, padding: `0 ${60 * escala}px`, textShadow: "0 2px 24px rgba(242,232,218,0.9)" }}>{ficha.nome}</div>
  </div>
  </>
);

export const Etiqueta: React.FC<{ x: number; y: number; texto: string; cor: string; vis: number; escala: number; destaque?: boolean }> = ({ x, y, texto, cor, vis, escala, destaque }) => (
  <div
    style={{
      position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) translateY(${-18 * escala}px) scale(${0.85 + vis * 0.15})`, opacity: vis,
      background: destaque ? cor : ESTILO.cartao, color: destaque ? "#fff" : ESTILO.texto, fontFamily: FONTE, fontWeight: 700,
      fontSize: 30 * escala, padding: `${10 * escala}px ${22 * escala}px`, borderRadius: 999, whiteSpace: "nowrap",
      boxShadow: "0 6px 24px rgba(40,30,20,0.18)",
    }}
  >
    {texto}
  </div>
);

export const CartaoPonto: React.FC<{ p: Ponto; cor: string; corTexto: string; vis: number; escala: number; vertical: boolean; n: number; total: number; longe: boolean }> = ({ p, cor, corTexto, vis, escala, vertical, n, total, longe }) => {
  const tempo = rotuloTempo(p);
  const dist = rotuloDistancia(p);
  const s = escala;
  return (
    <div
      style={{
        position: "absolute", fontFamily: FONTE, opacity: vis, transform: `translateY(${(1 - vis) * 40 * s}px)`,
        ...(vertical ? { left: 60 * s, right: 60 * s, top: 1180 * s } : { left: 80 * s, bottom: 110 * s, width: 720 * s }),
        background: ESTILO.cartao, borderRadius: 36 * s, padding: `${34 * s}px ${40 * s}px`, display: "flex", alignItems: "center", gap: 30 * s,
        boxShadow: "0 18px 60px rgba(40,30,20,0.22)",
      }}
    >
      <div style={{ width: 120 * s, height: 120 * s, borderRadius: 30 * s, background: cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icone tipo={p.tipo} tamanho={68 * s} cor={corTexto} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26 * s, letterSpacing: 4 * s, textTransform: "uppercase", color: ESTILO.textoSuave, fontWeight: 700 }}>
          {NOME_TIPO[p.tipo]} · {n}/{total}
        </div>
        <div style={{ fontSize: 46 * s, fontWeight: 700, color: ESTILO.texto, lineHeight: 1.1, marginTop: 6 * s, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</div>
        {tempo && (
          <div style={{ fontSize: 40 * s, fontWeight: 700, color: cor, marginTop: 10 * s }}>
            {tempo}
            {dist && <span style={{ color: ESTILO.textoSuave, fontWeight: 500, fontSize: 32 * s }}>{`  ·  ${dist}`}</span>}
            {longe && <span style={{ color: ESTILO.textoSuave, fontWeight: 500, fontSize: 28 * s }}>{"  (fora do mapa)"}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export const Fecho: React.FC<{ ficha: FichaPublica; vis: number; escala: number; vertical: boolean }> = ({ ficha, vis, escala: s, vertical }) => (
  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: vis, fontFamily: FONTE }}>
    <div style={{ background: ESTILO.cartao, borderRadius: 44 * s, padding: `${56 * s}px ${64 * s}px`, textAlign: "center", width: vertical ? 860 * s : 980 * s, transform: `scale(${0.94 + vis * 0.06})`, boxShadow: "0 24px 80px rgba(40,30,20,0.25)" }}>
      {ficha.marca.logo && <Img src={staticFile(ficha.marca.logo)} style={{ height: 110 * s, objectFit: "contain", marginBottom: 24 * s }} />}
      <div style={{ fontSize: 70 * s, fontWeight: 700, color: ESTILO.texto, lineHeight: 1.08 }}>{ficha.nome}</div>
      {ficha.regiao && <div style={{ fontSize: 34 * s, color: ESTILO.textoSuave, marginTop: 12 * s, fontWeight: 500 }}>{ficha.regiao}</div>}
      {ficha.destaques?.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 * s, justifyContent: "center", marginTop: 28 * s }}>
          {ficha.destaques.slice(0, 4).map((d) => (
            <span key={d} style={{ fontSize: 28 * s, padding: `${10 * s}px ${22 * s}px`, borderRadius: 999, border: `2px solid ${ESTILO.chaoBorda}`, color: ESTILO.texto, fontWeight: 600 }}>{d}</span>
          ))}
        </div>
      ) : null}
      <div style={{ marginTop: 40 * s, display: "inline-block", background: ficha.marca.cor, color: ficha.marca.corTexto, fontSize: 42 * s, fontWeight: 700, padding: `${22 * s}px ${54 * s}px`, borderRadius: 999 }}>
        {ficha.chamada}
      </div>
      {ficha.anuncio?.plataforma && <div style={{ fontSize: 28 * s, color: ESTILO.textoSuave, marginTop: 20 * s }}>{ficha.anuncio.plataforma}</div>}
    </div>
  </div>
);

export const Assinatura: React.FC<{ ficha: FichaPublica; escala: number; vertical: boolean }> = ({ ficha, escala: s, vertical }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: (vertical ? 70 : 26) * s, textAlign: "center", fontFamily: FONTE, fontSize: 20 * s, color: "rgba(31,39,38,0.55)" }}>
      © OpenStreetMap · OpenFreeMap{ficha.localizacao === "aproximada" ? " · localização aproximada" : ""}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: (vertical ? 130 : 40) * s, textAlign: "center", fontFamily: FONTE, fontSize: 26 * s, letterSpacing: 5 * s, fontWeight: 700, color: ficha.marca.cor, textTransform: "uppercase" }}>
      {ficha.marca.nome}
    </div>
  </>
);
