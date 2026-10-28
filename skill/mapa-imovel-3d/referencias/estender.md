# Como estender a skill

Mapa do código (pasta do projeto):

| Onde | O que mexer |
|---|---|
| `src/cena/estilo.ts` | cores da maquete (chão, prédios, ruas, verde, água, céu) e a fonte |
| `src/cena/camera.ts` | roteiro do vídeo (`DURACAO` de cada cena) e os planos de câmera de cada cena |
| `src/cena/Cidade3D.tsx` | a cena 3D: luz, sombras, destaque do imóvel, marcadores, rota |
| `src/video/VideoImovel.tsx` | o que aparece por cima em cada cena (título, cartões, planta, fotos, fecho) |
| `src/video/Interface.tsx` | os cartões, etiquetas, fecho e assinatura |
| `src/video/Capa.tsx` | a imagem de capa |
| `src/video/GuiaChegada.tsx` | o vídeo do guia de chegada |
| `src/planta/geometria.ts` | planta isométrica: medidas dos móveis (`MOVEIS`), cores do piso, altura das paredes |
| `src/Root.tsx` | composições (tamanhos de vídeo e imagem) |
| `ferramentas/mapa.ts` | os comandos da CLI |
| `ferramentas/lib/pontos.ts` | quais pontos procurar (consulta do Overpass e prioridade do vídeo) |
| `ferramentas/lib/interativo.ts` | as páginas HTML (mapa, guia, portfólio) |
| `ferramentas/lib/textos.ts` | os textos prontos |

Receitas:

- **Formato novo** (ex.: 1080x1350 para o feed): em `src/Root.tsx`, copie a `Composition` "ImovelVertical" com outro
  `id` e tamanho; em `ferramentas/mapa.ts`, no comando `video`, aceite o novo `--formato`. A interface usa
  `vertical = altura > largura`; ajuste posições em `Interface.tsx` se precisar.
- **Estilo novo** (ex.: noturno): troque as cores em `estilo.ts` e a luz em `Cidade3D.tsx` (`hemisphereLight`,
  `Sol`). Mantenha tons naturais: nada de neon.
- **Tipo de ponto novo** (ex.: academia): acrescente em `TIPOS_PONTO` (`src/ficha.ts`), em `NOME_TIPO`
  (`src/nomes.ts`), um ícone em `src/video/Icone.tsx`, a regra em `tipoDeTags`/`tipoDePoi` e a linha da consulta em
  `consultaOverpass` (`ferramentas/lib/pontos.ts`), e a posição em `PRIORIDADE`.
- **Cena nova no vídeo**: acrescente o tipo em `montarRoteiro` e `posesDaCena` (`camera.ts`) e o desenho por cima em
  `VideoImovel.tsx`.

Sempre que mexer: `npm test` (testes) e `npm run tipos` (TypeScript), e confira com `quadro <slug> ...` antes de
renderizar um vídeo inteiro. O Remotion Studio (`npm run estudio`) abre as composições para mexer ao vivo; para
ele achar a maquete, copie a pasta `publico/` de um imóvel para `public/` na raiz do projeto.
