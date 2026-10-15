# Mercurius Marketing — cena cinematográfica em TODO o site, controlada pelo scroll

Como funciona
- `sequence.js` desenha os 120 quadros num canvas FIXO atrás de todo o site (modo "global"). O quadro depende do scroll da página inteira:
  a câmera aproxima-se do laptop ao longo das secções e fica parada no último quadro nos últimos 10% da página.
- Quadros vizinhos são misturados (blend) para o movimento ficar contínuo.
- `scroll.js` anima o conteúdo de cada secção com o scroll (títulos, ruído → clareza, módulos, linha do processo, contato) + barra de progresso.
- Os blocos de texto têm uma "placa" escura suave por cima da cena: contraste de texto medido, sem falhas AA.
- GSAP + ScrollTrigger (CDN, versão fixa); se falharem, um motor próprio equivalente assume.
- "Reduzir movimento" no sistema: sem canvas e sem animações (site estático, como antes).
- Sem quadros válidos em `hero-sequence/`: nada é ativado e o site continua com o hero em vídeo.

Páginas
- `index.html` — página principal.
- `privacidade.html` — Política de privacidade (página própria; só é acessível pelo link "Política de privacidade" no rodapé).

Ficheiros
- `index.html`, `style.css`, `main.js` — site existente (ajustes mínimos)
- `sequence.js`, `scroll.js` — novos
- `hero-sequence/` — 120 quadros WebP (extraídos de VIDEO_ORIGINAL.mp4) + instruções

Ajustes rápidos (topo do sequence.js, bloco SEQUENCES)
- `range: [0, 0.9]`  fração da página em que a sequência se completa
- `mode: "pin"`      volta ao hero fixo (pinned) em vez do fundo global
- `zoom` / `anchorY` / `fit`   enquadramento (no celular o laptop é ampliado)
- Opacidade das placas de texto: regras `html.seq-global ...` no fim do style.css

Upload no GitHub: a pasta `hero-sequence/` tem de ser enviada como pasta (pelo computador). Alternativa para o celular: hero-sequence/LEIA-ME.txt.

Nota: o vídeo da seção "Sobre" foi removido por enquanto (a seção ficou só com texto). O vídeo em loop do hero (`hero-loop.mp4/.webm`) só é usado como plano B quando os quadros não carregam.

Logo: `logo-mercurius.webp` (versão colorida com brilho claro suave atrás, para ler bem no fundo escuro) e `favicon.png` (emblema). Para trocar, substitua os ficheiros mantendo o nome.

Seção "Um processo claro" (painéis holográficos)
- Quatro painéis de vidro flutuantes (CSS 3D, sem bibliotecas extras), cada um com a sua própria interface desenhada em SVG (diagnóstico, estratégia, desenvolvimento, entrega).
- O scroll controla tudo pelo scroll.js (cena "Como funciona"): entrada em profundidade, rotação, "desenho" das interfaces e qual painel se ilumina. Sem pin.
- Desktop: 4 colunas com profundidade; tablet: 2 colunas com menos rotação; celular: coluna única sem 3D. "Reduzir movimento": painéis planos e legíveis.
- Ajustes: intensidade da profundidade/rotação em `Z`, `RY`, `DRIFT` (scroll.js); aparência do vidro em `.holo-glass` (style.css).

Títulos com "Dia Text Reveal" (dia.js)
- Uma faixa de cor (azul → cromo → dourado) percorre cada título da esquerda para a direita, revela as letras e assenta na cor normal.
- Aplicado a todos os textos da página (hero, parágrafos, cartões, painéis do processo, convite de contato, rodapé). Botões, menu e links ficam sem efeito para manter a clareza da ação.
- O scroll.js dispara cada título quando ele entra em cena; o hero arranca sozinho ao carregar. Corre uma vez por título.
- Ajustes no topo do dia.js: `colors`, `band` (largura da faixa), `duration` (segundos) e `auto` (textos que arrancam ao carregar).
- "Reduzir movimento": sem efeito, texto sempre visível. Se o dia.js falhar, o texto reaparece sozinho.

Tipografia
- Títulos: Space Grotesk (600). Texto: Inter. Carregadas do Google Fonts (link no <head> do index.html e do privacidade.html).
- Para trocar: altere `--display` (títulos) e `--sans` (texto) no início do style.css e o link do Google Fonts nos dois HTML.

Nota: no scroll.js, cada bloco de texto dispara o efeito quando entra em cena (funções diaPrep/diaPlay); a duração por bloco é o segundo argumento de diaPlay.
