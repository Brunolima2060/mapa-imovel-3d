// "Vida" da maquete: árvores (instâncias) e trânsito andando. Instâncias = milhares de peças num único desenho,
// leve para computador comum.

import { useLayoutEffect, useMemo } from "react";
import { BoxGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { alturaEm, type DadosCidade } from "../cidade.ts";
import { posicaoVeiculo, veiculosNasRuas } from "./transito.ts";
import { raioDisco } from "./geometrias.ts";

const VERDES = ["#8FA676", "#7F9A6A", "#9DB081", "#748F63", "#A3B486"].map((c) => new Color(c));
const CORES_CARRO = ["#F4F4F2", "#C9CCCE", "#3E4447", "#8E2F2F", "#2F4F6E", "#D8D2C4"].map((c) => new Color(c));

export const Arvores: React.FC<{ dados: DadosCidade }> = ({ dados }) => {
  const malhas = useMemo(() => {
    const R = raioDisco(dados) - 10;
    const lista = (dados.arvores ?? []).filter(([x, z]) => Math.hypot(x, z) < R);
    const copa = new InstancedMesh(new IcosahedronGeometry(1, 1), new MeshStandardMaterial({ roughness: 0.95, flatShading: true }), Math.max(1, lista.length));
    const tronco = new InstancedMesh(new CylinderGeometry(0.25, 0.35, 1, 5), new MeshStandardMaterial({ color: "#7A6650", roughness: 1 }), Math.max(1, lista.length));
    const o = new Object3D();
    lista.forEach(([x, z, s], i) => {
      const y = Math.max(0, alturaEm(dados.relevo, x, z));
      const alt = 7 * s;
      o.position.set(x, y + alt * 0.62, z);
      o.scale.set(4.4 * s, 3.8 * s, 4.4 * s);
      o.rotation.set(0, (i * 2.399) % (Math.PI * 2), 0);
      o.updateMatrix();
      copa.setMatrixAt(i, o.matrix);
      copa.setColorAt(i, VERDES[i % VERDES.length]);
      o.position.set(x, y + alt * 0.2, z);
      o.scale.set(s * 1.4, alt * 0.45, s * 1.4);
      o.updateMatrix();
      tronco.setMatrixAt(i, o.matrix);
    });
    copa.count = tronco.count = lista.length;
    copa.castShadow = tronco.castShadow = true;
    copa.receiveShadow = true;
    return { copa, tronco };
  }, [dados]);
  return (
    <>
      <primitive object={malhas.copa} />
      <primitive object={malhas.tronco} />
    </>
  );
};

export const Transito: React.FC<{ dados: DadosCidade; tempo: number }> = ({ dados, tempo }) => {
  const { veiculos, carros, caminhoes, idx } = useMemo(() => {
    const R = raioDisco(dados) - 15;
    const veiculos = veiculosNasRuas(dados.ruas);
    const nCarro = veiculos.filter((v) => v.tipo === "carro").length;
    const nCam = veiculos.length - nCarro;
    const carros = new InstancedMesh(new BoxGeometry(1.9, 1.5, 4.5), new MeshStandardMaterial({ roughness: 0.5 }), Math.max(1, nCarro));
    const caminhoes = new InstancedMesh(new BoxGeometry(2.6, 3.8, 16), new MeshStandardMaterial({ roughness: 0.7 }), Math.max(1, nCam));
    const idx: number[] = [];
    let c = 0, k = 0;
    for (const v of veiculos) {
      if (v.tipo === "carro") { carros.setColorAt(c, CORES_CARRO[v.cor]); idx.push(c++); }
      else { caminhoes.setColorAt(k, CORES_CARRO[v.cor % 2]); idx.push(k++); }
    }
    carros.count = nCarro;
    caminhoes.count = nCam;
    carros.castShadow = caminhoes.castShadow = true;
    return { veiculos, carros, caminhoes, idx, R };
  }, [dados]);
  useLayoutEffect(() => {
    const o = new Object3D();
    const R = raioDisco(dados) - 15;
    veiculos.forEach((v, i) => {
      const [x, z, ang] = posicaoVeiculo(v, tempo);
      const fora = Math.hypot(x, z) > R;
      const y = Math.max(0, alturaEm(dados.relevo, x, z));
      o.position.set(x, y + (v.tipo === "carro" ? 0.9 : 2.1), z);
      o.rotation.set(0, ang, 0);
      o.scale.setScalar(fora ? 0.0001 : 1);
      o.updateMatrix();
      (v.tipo === "carro" ? carros : caminhoes).setMatrixAt(idx[i], o.matrix);
    });
    carros.instanceMatrix.needsUpdate = caminhoes.instanceMatrix.needsUpdate = true;
  }, [tempo, veiculos, carros, caminhoes, idx, dados]);
  return (
    <>
      <primitive object={carros} />
      <primitive object={caminhoes} />
    </>
  );
};
