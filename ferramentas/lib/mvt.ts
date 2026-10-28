// Leitor mínimo de Mapbox Vector Tiles (formato dos ladrilhos do OpenFreeMap), sem dependências.
// Especificação: https://github.com/mapbox/vector-tile-spec (v2).

export type Feicao = { id?: number; type: 1 | 2 | 3; tags: Record<string, string | number | boolean>; geometry: [number, number][][] };
export type Camada = { extent: number; features: Feicao[] };

class Leitor {
  pos: number;
  fim: number;
  b: Uint8Array;
  constructor(b: Uint8Array, ini = 0, fim = b.length) { this.b = b; this.pos = ini; this.fim = fim; }
  varint(): number {
    let r = 0, m = 1, x: number;
    do { x = this.b[this.pos++]; r += (x & 127) * m; m *= 128; } while (x & 128);
    return r;
  }
  pular(tipo: number) {
    if (tipo === 0) this.varint();
    else if (tipo === 1) this.pos += 8;
    else if (tipo === 2) this.pos += this.varint();
    else if (tipo === 5) this.pos += 4;
    else throw new Error(`tipo protobuf ${tipo} não suportado`);
  }
  sub(): Leitor { const n = this.varint(); const l = new Leitor(this.b, this.pos, this.pos + n); this.pos += n; return l; }
  texto(): string { const l = this.sub(); return new TextDecoder().decode(this.b.subarray(l.pos, l.fim)); }
  empacotado(): number[] { const l = this.sub(); const v: number[] = []; while (l.pos < l.fim) v.push(l.varint()); return v; }
}

const dezig = (n: number) => (n % 2 ? -(n + 1) / 2 : n / 2);

const lerValor = (l: Leitor): string | number | boolean => {
  let v: string | number | boolean = "";
  while (l.pos < l.fim) {
    const ch = l.varint(), f = ch >> 3, t = ch & 7;
    if (f === 1) v = l.texto();
    else if (f === 2) { v = new DataView(l.b.buffer, l.b.byteOffset + l.pos, 4).getFloat32(0, true); l.pos += 4; }
    else if (f === 3) { v = new DataView(l.b.buffer, l.b.byteOffset + l.pos, 8).getFloat64(0, true); l.pos += 8; }
    else if (f === 4 || f === 5) v = l.varint();
    else if (f === 6) v = dezig(l.varint());
    else if (f === 7) v = l.varint() !== 0;
    else l.pular(t);
  }
  return v;
};

const geometria = (cmds: number[], tipo: number): [number, number][][] => {
  const partes: [number, number][][] = [];
  let atual: [number, number][] = [];
  let x = 0, y = 0, i = 0;
  while (i < cmds.length) {
    const c = cmds[i++], id = c & 7, n = c >> 3;
    if (id === 1 || id === 2) {
      for (let k = 0; k < n; k++) {
        x += dezig(cmds[i++]); y += dezig(cmds[i++]);
        if (id === 1) { if (atual.length) partes.push(atual); atual = []; }
        atual.push([x, y]);
      }
    } else if (id === 7) { if (atual.length) partes.push(atual); atual = []; }
  }
  if (atual.length) partes.push(atual);
  return tipo === 1 ? partes.flat().map((p) => [p]) : partes;
};

export const lerTile = (buf: Uint8Array): Record<string, Camada> => {
  const t = new Leitor(buf);
  const camadas: Record<string, Camada> = {};
  while (t.pos < t.fim) {
    const ch = t.varint();
    if (ch >> 3 !== 3) { t.pular(ch & 7); continue; }
    const l = t.sub();
    let nome = "", extent = 4096;
    const chaves: string[] = [], valores: (string | number | boolean)[] = [];
    const brutas: { id?: number; tags: number[]; type: number; geo: number[] }[] = [];
    while (l.pos < l.fim) {
      const c = l.varint(), f = c >> 3;
      if (f === 1) nome = l.texto();
      else if (f === 2) {
        const fl = l.sub();
        const b: { id?: number; tags: number[]; type: number; geo: number[] } = { tags: [], type: 0, geo: [] };
        while (fl.pos < fl.fim) {
          const cc = fl.varint(), ff = cc >> 3;
          if (ff === 1) b.id = fl.varint();
          else if (ff === 2) b.tags = fl.empacotado();
          else if (ff === 3) b.type = fl.varint();
          else if (ff === 4) b.geo = fl.empacotado();
          else fl.pular(cc & 7);
        }
        brutas.push(b);
      } else if (f === 3) chaves.push(l.texto());
      else if (f === 4) valores.push(lerValor(l.sub()));
      else if (f === 5) extent = l.varint();
      else l.pular(c & 7);
    }
    camadas[nome] = {
      extent,
      features: brutas.map((b) => {
        const tags: Feicao["tags"] = {};
        for (let k = 0; k + 1 < b.tags.length; k += 2) tags[chaves[b.tags[k]]] = valores[b.tags[k + 1]];
        return { id: b.id, type: b.type as 1 | 2 | 3, tags, geometry: geometria(b.geo, b.type) };
      }),
    };
  }
  return camadas;
};
