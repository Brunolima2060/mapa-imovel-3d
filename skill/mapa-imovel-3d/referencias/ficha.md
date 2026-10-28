# A ficha do imóvel (`~/mapas-imoveis/<slug>/ficha.json`)

Fonte única de tudo. Criada pelo comando `novo`; edite à vontade (JSON). Campos:

| Campo | Público? | O que é |
|---|---|---|
| `slug` | sim | nome da pasta (sem acento/espaço) |
| `nome` | sim | nome curto do imóvel ("Apê na Paulista") |
| `regiao` | sim | "Bairro · Cidade" (vem do endereço; pode trocar) |
| `chamada` | sim | botão do fim do vídeo ("Reserve no Airbnb") |
| `destaques` | sim | até 4 etiquetas ("2 quartos", "Wi-Fi 500 mega", "Vista para o mar") |
| `endereco` | **não** | endereço completo (nunca vai a público) |
| `local` | **não** | coordenadas reais (nunca vão a público no modo aproximado) |
| `localizacao` | — | `"aproximada"` (padrão) ou `"exata"` |
| `raioAproxM` | sim | raio do círculo aproximado, em metros (padrão 250) |
| `area` | sim | centro do círculo (gerado; o imóvel fica dentro, fora do centro) |
| `pontos[]` | sim | pontos próximos: `id`, `nome`, `tipo`, `lat`, `lon`, `ape`/`carro` (`metros`, `minutos`), `noVideo` |
| `marca` | sim | `nome`, `cor` (#hex), `corTexto` (#hex), `logo` (arquivo em `publico/`), `contato`, `site` |
| `anuncio` | sim | `link`, `plataforma` ("Airbnb"), `mapaUrl` (preenchido pelo `publicar`) |
| `planta` | sim | `comodos[]`, `moveis[]`, `areaTotalM2` (opcional) |
| `fotos[]` | sim | arquivos em `publico/`, ex. `"fotos/sala.jpg"` (até 4 no vídeo) |
| `perfil` | sim | `"residencial"` (padrão) ou `"galpao"` |
| `galpao` | sim | ficha técnica do galpão (abaixo) |
| `logistica` | sim | `alcance` (faixas de caminhão com cidades) e `vizinhos` (gerados por `logistica`) |
| `guia` | **não** | `origem`, `rota`, `minutos`, `metros`, `entrada`, `estacionamento`, `observacoes`, `url` |

Tipos de ponto: `praia`, `metro`, `trem`, `onibus`, `rodoviaria`, `aeroporto`, `mercado`, `padaria`, `farmacia`,
`hospital`, `restaurante`, `parque`, `shopping`, `atracao`, `rodovia`, `porto`, `centro`, `outro`.

## Planta

Cômodos são retângulos em **metros**. `x` cresce para a direita e `y` para baixo, a partir do canto de cima à
esquerda da planta (como num desenho no papel). Cômodos encostam uns nos outros, sem sobrepor.

Tipos de cômodo: `sala`, `quarto`, `cozinha`, `banheiro`, `varanda`, `area`, `outro`.
Móveis: `cama`, `cama-solteiro`, `sofa`, `mesa`, `pia`, `fogao`, `geladeira`, `vaso`, `chuveiro`, `tv`, `armario`,
`planta`. Sem `x`/`y`, o móvel é encostado numa parede livre; com `x`/`y` (em metros, **relativos ao cômodo**) e
`giro` (0, 90, 180, 270), fica onde você mandar. O que não couber fica de fora.

Exemplo (apartamento de 2 quartos, 61 m²):

```json
"planta": {
  "comodos": [
    { "nome": "Sala", "tipo": "sala", "x": 0, "y": 0, "w": 5, "h": 4 },
    { "nome": "Varanda", "tipo": "varanda", "x": 0, "y": 4, "w": 5, "h": 1.6 },
    { "nome": "Cozinha", "tipo": "cozinha", "x": 5, "y": 0, "w": 2.8, "h": 2.6 },
    { "nome": "Banheiro", "tipo": "banheiro", "x": 5, "y": 2.6, "w": 2.8, "h": 1.9 },
    { "nome": "Quarto 1", "tipo": "quarto", "x": 7.8, "y": 0, "w": 3.4, "h": 3.2 },
    { "nome": "Quarto 2", "tipo": "quarto", "x": 7.8, "y": 3.2, "w": 3.4, "h": 2.9 }
  ],
  "moveis": [
    { "tipo": "sofa", "comodo": "Sala" }, { "tipo": "tv", "comodo": "Sala" }, { "tipo": "mesa", "comodo": "Sala" },
    { "tipo": "planta", "comodo": "Varanda" }, { "tipo": "mesa", "comodo": "Varanda" },
    { "tipo": "pia", "comodo": "Cozinha" }, { "tipo": "fogao", "comodo": "Cozinha" }, { "tipo": "geladeira", "comodo": "Cozinha" },
    { "tipo": "vaso", "comodo": "Banheiro" }, { "tipo": "chuveiro", "comodo": "Banheiro" },
    { "tipo": "cama", "comodo": "Quarto 1" }, { "tipo": "armario", "comodo": "Quarto 1" },
    { "tipo": "cama-solteiro", "comodo": "Quarto 2" }, { "tipo": "cama-solteiro", "comodo": "Quarto 2" }
  ]
}
```

Lendo a foto de uma planta: some as cotas de cada lado, arredonde para 0,1 m e confira se a soma das larguras
de uma fileira de cômodos bate com a largura total. Se a planta tiver formato de "L", use vários retângulos.

## Galpão (`"perfil": "galpao"`)

```json
"galpao": {
  "areaConstruidaM2": 6200, "areaTerrenoM2": 11000,
  "larguraM": 50, "comprimentoM": 124,
  "peDireitoM": 12, "docas": 10, "niveladoras": 6,
  "pisoTm2": 6, "energiaKva": 500, "sprinklers": true,
  "escritorioM2": 350, "patio": "Pátio para carretas", "modulos": 2,
  "extras": ["Portaria 24h", "Cabine primária"],
  "modulosDetalhe": [
    { "nome": "Módulo A", "areaM2": 2200, "docas": 4, "disponivel": false },
    { "nome": "Módulo B", "areaM2": 4000, "docas": 6, "disponivel": true }
  ]
}
```

Obrigatórios: `areaConstruidaM2`, `peDireitoM`, `docas`. Sem `larguraM`/`comprimentoM`, o desenho assume uma
nave 2 por 1 com a área informada (é ilustração, não planta técnica).
