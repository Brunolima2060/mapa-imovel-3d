// Pequenas regras da CLI, separadas para teste.
import { metrosEntre, type LatLon } from "./geo.ts";

// Sem --nome, o nome não pode sair do endereço digitado (vazaria a rua em vídeo, página e link).
export const nomePadrao = (bairro?: string) => (bairro ? `Imóvel em ${bairro}` : "Meu imóvel");

// A maquete foi montada para este centro? (até 2 m de diferença)
export const mesmaOrigem = (a: LatLon, b: LatLon) => metrosEntre(a, b) <= 2;

// Da resposta da Vercel, prefere o endereço fixo do projeto (https://<nome>.vercel.app) ao da implantação.
export const escolherUrlVercel = (saida: string, nomeProjeto: string): string | undefined => {
  const urls = saida.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi) ?? [];
  const fixo = `https://${nomeProjeto}.vercel.app`;
  return urls.find((u) => u.toLowerCase() === fixo) ?? urls.find((u) => /Aliased/i.test(saida.split(u)[0].split("\n").pop() ?? "")) ?? urls[urls.length - 1];
};
