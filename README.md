# Mapa do imóvel em 3D — skill do Claude Code

Do endereço de um imóvel de aluguel ao material de anúncio, sem gastar nada:

- **vídeo** vertical (Reels/TikTok/Stories) e horizontal (YouTube/anúncio) com a cidade em 3D, a região do imóvel e
  os pontos próximos (praia, metrô, mercado...) com o tempo a pé ou de carro;
- **capa** para o anúncio;
- **mapa 3D interativo** (um link que o hóspede abre no celular, gira e toca nos pontos);
- **planta isométrica** que "se desmonta" (imagem, página interativa e cena no vídeo);
- **guia de chegada** do hóspede: vídeo do caminho até a porta + página com a rota, entrada e estacionamento;
- **QR code** para imprimir, **textos prontos** (bloco "Localização", legenda, boas-vindas) e **portfólio** com
  todos os imóveis num mapa só.

Dados: OpenStreetMap (via OpenFreeMap, Overpass, Nominatim e OSRM) e relevo Terrarium/AWS — todos gratuitos e sem
chave. Vídeo: Remotion + Three.js, renderizado no seu computador.

## Instalação (uma vez)

Precisa de: **Claude Code**, **Node.js 22.18 ou mais novo** (https://nodejs.org, versão LTS), **Git** e,
de preferência, o **Google Chrome** instalado.

```bash
git clone https://github.com/Brunolima2060/mapa-imovel-3d.git
cd mapa-imovel-3d
npm install
npm run instalar-skill
```

Pronto. Abra o Claude Code (em qualquer pasta) e peça, por exemplo:

> faz o mapa 3D do meu apê na Rua Guarani, 200, Itaguá, Ubatuba, SP — o nome é "Casa no Itaguá"

O Claude cria a ficha do imóvel, mostra os pontos que achou para você conferir, monta a maquete, mostra alguns
quadros e depois renderiza o vídeo. Os arquivos ficam em `~/mapas-imoveis/<nome-do-imovel>/saida/`.

### Para publicar o mapa interativo (opcional)

O link do mapa e do guia fica na sua conta **grátis** da Vercel:

```bash
npm i -g vercel
vercel login
```

Depois é só pedir ao Claude "publica o mapa do imóvel".

## Atualizar

```bash
cd mapa-imovel-3d
git pull
npm install
npm run instalar-skill
```

## Sem o Claude (linha de comando)

```bash
npm run mapa -- ajuda
npm run mapa -- novo "Avenida Paulista, 1578, São Paulo" --nome "Apê na Paulista"
npm run mapa -- dados ape-na-paulista
npm run mapa -- video ape-na-paulista            # rascunho
npm run mapa -- video ape-na-paulista --final    # vertical + horizontal
```

## Privacidade

Por padrão, tudo o que vai a público mostra só uma **área aproximada** (círculo de 250 m), sem rua nem número —
como o Airbnb faz. As distâncias são calculadas do endereço real. O **guia de chegada** mostra o endereço exato:
mande só para quem já reservou. A ficha com o endereço fica só no seu computador (`~/mapas-imoveis`), fora deste
repositório.

## Problemas comuns

| Problema | O que fazer |
|---|---|
| "Não achei o endereço" | escreva com cidade e estado, ou cole as coordenadas / o link do Google Maps |
| Servidor do OpenStreetMap fora do ar | espere alguns minutos e rode de novo (o que já baixou fica guardado) |
| Render trava, "Target closed", "Error creating WebGL context" | feche abas do navegador e rode de novo; um vídeo por vez |
| Windows bloqueia o Chrome ("spawn UNKNOWN") | instale o Google Chrome normal: a ferramenta usa ele |
| `publicar` pede login | `npm i -g vercel` e `vercel login` |

## Licenças e créditos

Mapas © colaboradores do OpenStreetMap (ODbL) — a atribuição aparece em todo vídeo, imagem e mapa.
Ladrilhos: OpenFreeMap. Rotas: OSRM (routing.openstreetmap.de). Relevo: Terrarium (Mapzen/AWS Open Data).
O Remotion é gratuito para pessoas físicas e empresas de até 3 pessoas (https://remotion.dev/license).
