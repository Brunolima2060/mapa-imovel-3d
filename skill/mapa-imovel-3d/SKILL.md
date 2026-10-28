---
name: mapa-imovel-3d
description: Transforma o endereço de um imóvel de aluguel (Airbnb, Booking, OLX, Zap, temporada) em material de anúncio com mapa 3D — vídeo vertical e horizontal com a maquete da cidade e os pontos próximos (praia, metrô, mercado...) com tempo a pé/de carro, imagem de capa, mapa 3D interativo com link, planta isométrica "desmontável" do imóvel, guia de chegada do hóspede (vídeo + página com a rota), QR code, textos prontos e portfólio de imóveis. Tudo grátis (OpenStreetMap, OpenFreeMap, Remotion). Use quando pedirem "mapa do imóvel", "mapa 3D", "vídeo do apartamento", "vídeo para o anúncio", "o que tem perto", "planta do apê", "planta isométrica", "guia de chegada", "como chegar", "QR code do imóvel", "texto de localização", "portfólio dos imóveis", ou mandarem um endereço de imóvel para divulgar.
---

# Mapa do imóvel em 3D

Você opera a CLI do projeto **mapa-imovel-3d**. O caminho do projeto está em `projeto.txt`, na mesma pasta
deste arquivo (`~/.claude/skills/mapa-imovel-3d/projeto.txt`). Todo comando é:

```
node "<projeto>/ferramentas/mapa.ts" <comando> ...
```

Os imóveis ficam em `~/mapas-imoveis/<slug>/` (uma pasta por imóvel, com `ficha.json`, `publico/` e `saida/`).
Fale sempre em português, em linguagem simples: o usuário aluga imóveis, não é programador.

## Fluxo padrão (um imóvel novo)

1. **Entender o pedido.** Pegue o endereço (ou coordenadas, ou link do Google Maps) e um nome curto para o imóvel
   ("Apê na Paulista", "Casa no Itaguá"). Pergunte só o que faltar.
2. **Criar a ficha:** `novo "<endereço>" --nome "<nome>"` (o nome é obrigatório e nunca deve ser a rua: ele aparece
   no vídeo e no link). **Confirme com o usuário a linha `Achei: ...`** (cidade e bairro certos?); se estiver errado,
   refaça com `--refazer` e o endereço com cidade/estado, ou com as coordenadas. Links curtos do celular
   (`maps.app.goo.gl`) não trazem coordenadas: peça o link completo ou as coordenadas (no Google Maps, toque e segure no
   lugar e copie os números). A saída lista os pontos encontrados com os tempos.
3. **Revisar os pontos com o usuário.** Mostre a lista e pergunte o que tirar, renomear ou acrescentar. Edite
   `ficha.json` direto:
   - `noVideo: true` marca os que entram no vídeo (ideal 3 a 6). O imóvel em si, ou um ponto "colado" nele, não precisa entrar.
   - Ponto novo: `{ "id": "meu-1", "nome": "...", "tipo": "praia", "lat": ..., "lon": ..., "noVideo": true }`
     (tipos: praia, metro, trem, onibus, rodoviaria, aeroporto, mercado, padaria, farmacia, hospital, restaurante,
     parque, shopping, atracao, outro). Depois de mexer nos pontos, rode `tempos <slug>` para recalcular.
   - Preencha também `marca` (nome, `cor` em #hex, `corTexto`), `chamada` ("Reserve no Airbnb"), `destaques`
     ("2 quartos", "vista para o mar") e `anuncio.link`/`anuncio.plataforma` se ele tiver.
4. **Maquete:** `dados <slug>` (baixa relevo, prédios e ruas; leva de 1 a 3 minutos na primeira vez).
5. **Conferir antes de renderizar tudo:** `quadro <slug> 40 200 400` gera quadros soltos em PNG. **Olhe as imagens**
   (Read) e mostre ao usuário. Só depois siga.
6. **Rascunho:** `video <slug>` (vertical, metade do tamanho, rápido). Mostre e pegue o ok.
7. **Final:** `video <slug> --final` (vertical + horizontal) e `capa <slug>`.
8. **Extras:** `interativo`, `planta`, `textos`, `publicar`, `qr`, `guia`, `portfolio` (abaixo).

`tudo <slug>` faz dados + vídeos finais + capa + planta (se houver) + interativo + textos de uma vez, para quando
já está tudo conferido.

## Comandos

| Comando | O que faz |
|---|---|
| `novo "<endereço>" [--nome ".."] [--slug x] [--exata] [--refazer]` | cria a ficha, acha os pontos e calcula os tempos |
| `tempos <slug>` | recalcula tempos e distâncias depois de mexer nos pontos |
| `area <slug>` | sorteia de novo o círculo aproximado (obrigatório depois de mudar `raioAproxM`; depois rode `dados`) |
| `dados <slug>` | monta a maquete 3D (`publico/cidade.json`) |
| `quadro <slug> <n> [<n>...] [--horizontal]` | quadros soltos do vídeo, em PNG, para conferir |
| `video <slug> [--final] [--formato vertical\|horizontal\|ambos] [--sem-planta]` | vídeo do imóvel |
| `capa <slug>` | capa vertical e horizontal (PNG) |
| `planta <slug>` | planta isométrica: `planta.png` + `planta.html` (interativa, botão "desmontar") |
| `interativo <slug>` | `mapa.html`: mapa 3D que o hóspede gira e toca |
| `textos <slug>` | bloco "Localização" para o anúncio, legenda e mensagem de boas-vindas |
| `publicar <slug>` | põe o mapa (e a planta) no ar na Vercel do usuário e salva o link na ficha |
| `qr <slug> [--url ..]` / `qr <slug> --guia` | QR code em PNG para imprimir |
| `guia <slug> --origem "<lugar>" [--entrada ".."] [--estacionamento ".."] [--observacoes ".."] [--final] [--sem-video]` | guia de chegada: `guia.html` + vídeo do caminho |
| `publicar <slug> --guia` | põe o guia no ar com link difícil de adivinhar |
| `portfolio` / `publicar --portfolio` | mapa com todos os imóveis |

Tudo sai em `~/mapas-imoveis/<slug>/saida/`.

## Privacidade (regra de ouro)

- O padrão é **localização aproximada**: vídeo, capa, mapa e textos mostram uma **área** (círculo de 250 m), nunca a
  porta, e não citam rua nem número. As distâncias são calculadas do endereço real (não mentem).
- O círculo é sorteado ao acaso e salvo na ficha (`area`); nunca o invente nem o calcule à mão. Mudou o raio ou o
  modo? Rode `area <slug>` e depois `dados <slug>` (a CLI recusa maquete feita para outro centro).
- Só mude para `"localizacao": "exata"` na ficha se o usuário pedir claramente (ex.: casa com placa e fachada públicas).
- O **guia de chegada** usa o endereço exato de propósito: é para mandar **só depois da reserva**. Lembre o usuário disso.
- Nunca publique `ficha.json` nem a pasta do imóvel; `publicar` envia só o HTML gerado.

## Planta isométrica

Peça os cômodos com medidas aproximadas — por texto ("sala 5x4, cozinha 2,8x2,6..."), croqui ou **foto da planta**
(leia a imagem e monte as medidas). Preencha `planta.comodos` na ficha: retângulos em metros, `x`/`y` a partir do
canto de cima à esquerda, sem sobrepor; e `planta.moveis` com o tipo e o cômodo (posição automática, encostada nas
paredes). Veja `referencias/ficha.md` para o formato e um exemplo completo. Com planta na ficha, o vídeo ganha a
cena "Por dentro" com o imóvel se desmontando. Depois de preencher, rode `planta <slug>` e **olhe o PNG**: se algum
cômodo ficou torto ou fora do lugar, ajuste os números.

## Fotos

Fotos reais do imóvel vão em `~/mapas-imoveis/<slug>/publico/fotos/` e na ficha como
`"fotos": ["fotos/sala.jpg", ...]` (até 4 entram no vídeo, 2 s cada).

## Quando algo dá errado

- **"Não achei o endereço"**: peça cidade e estado, ou coordenadas / link do Google Maps (a ficha aceita os dois).
- **"Nenhum servidor do OpenStreetMap respondeu" / Overpass fora do ar**: a CLI já usa a reserva (OpenFreeMap +
  Nominatim). Se nem assim, espere alguns minutos e rode de novo: o que já foi baixado fica em cache.
- **Tempo estranho** (ex.: 15 min para algo do outro lado da rua): confira o ponto no mapa; a CLI já corrige o caso
  mais comum (porta "grudada" em túnel), mas o usuário conhece o bairro melhor — ajuste ou tire o ponto.
- **Render travou / "Target closed" / "Error creating WebGL context"**: falta memória. Peça para fechar abas do
  navegador e rode de novo; renderize um vídeo por vez.
- **Cidade pequena com poucos prédios no mapa**: normal; a maquete completa os quarteirões com casinhas baixas
  ("volumes de reserva") e dá mais peso ao relevo e ao mar.
- **`publicar` pede login**: `npm i -g vercel` uma vez e `vercel login` (conta grátis do próprio usuário).

## Estender

Formato novo, estilo novo, tipo de ponto novo, outra cena no vídeo: veja `referencias/estender.md`.
