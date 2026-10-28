import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { DadosCidade } from "../cidade.ts";

// Lê cidade.json da pasta "publico" do imóvel (é a pasta "public" do Remotion).
export const useDadosCidade = (arquivo = "cidade.json"): DadosCidade | null => {
  const [dados, setDados] = useState<DadosCidade | null>(null);
  const [h] = useState(() => delayRender(`carregando ${arquivo}`, { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    fetch(staticFile(arquivo))
      .then((r) => {
        if (!r.ok) throw new Error(`Falta ${arquivo}: rode o comando "dados" antes.`);
        return r.json();
      })
      .then((d) => {
        setDados(d);
        continueRender(h);
      })
      .catch((e) => cancelRender(e));
  }, [arquivo, h]);
  return dados;
};
