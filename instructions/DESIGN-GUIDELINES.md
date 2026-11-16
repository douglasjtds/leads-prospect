# DESIGN-GUIDELINES.md
### leads-prospect: ferramenta interna no padrão visual de douglastertuliano.vercel.app

> Este documento é a **fonte de verdade visual** do projeto. Nenhuma cor, fonte, espaçamento ou
> raio deve ser inventado fora daqui. Se algo não estiver definido, pergunte antes de decidir.
> Os valores abaixo foram extraídos do site publicado (CSS computado), não estimados.

---

## 1. O que o design precisa comunicar

É uma ferramenta de trabalho, usada todo dia por uma pessoa só, com o WhatsApp aberto ao lado.
Ela precisa parecer **da mesma família do site** (o Douglas vai mostrar o processo dele em conteúdo
e para clientes), mas com a densidade de uma ferramenta, não de uma landing page.

| Polo | Como aparece |
|---|---|
| **Precisão de ferramenta** | Lista densa, hierarquia clara, rótulos em mono, nada decorativo, estados explícitos |
| **Identidade do site** | Papel claro, tinta quase preta, terracota como único acento, Schibsted Grotesk, kicker `01 / …` em mono, cantos quase retos |

Se uma tela parecer um dashboard SaaS genérico, está errada. Se parecer uma landing page, também.

---

## 2. ⚠️ Riscos de cara de template

1. **Nada de cards com sombra flutuante, gradientes, glassmorphism ou ícones decorativos.** O site
   usa linhas finas (`line`) e mudanças de superfície, nunca sombra.
2. **Terracota é acento, não decoração.** Só em: botão primário, sublinhado de ênfase, borda da
   aba ativa, marcador do item selecionado, barra do funil. Nunca como fundo de seção.
3. **Sem kanban, sem gráfico de pizza, sem avatar com iniciais coloridas.**
4. **Nada de emoji na interface.** Os únicos emojis estão dentro das mensagens de WhatsApp (§6 da spec).
5. **Cantos quase retos.** Raio 2px em chips, inputs e pills; 4px em botões. Nunca `rounded-full`,
   nunca `rounded-xl`.

---

## 3. Cores

Tokens com nome de **papel**, idênticos aos do site. Definidos uma vez em `src/app/globals.css`
(`@theme`). Nenhum hex fora dali.

### Tokens do site

| Token | Hex | Papel |
|---|---|---|
| `paper` | `#f2f3f0` | Fundo da página |
| `raised` | `#fafaf8` | Superfícies elevadas: inputs, item selecionado, caixa da próxima ação |
| `surface` | `#e6e8e3` | Faixas e áreas secundárias, hover de botão secundário |
| `line` | `#d2d5cf` | Bordas e divisórias (sempre 1px) |
| `ink` | `#121412` | Texto principal, botão "Enviei", chip ativo |
| `ink-muted` | `#4f544e` | Texto de apoio, metadados, kicker mono |
| `accent` | `#b83a12` | Botão primário, sublinhado, aba ativa, seleção |
| `accent-hover` | `#9c3010` | Hover do primário, texto sobre `accent-soft` |
| `accent-soft` | `#f4e1d8` | Fundo de pill "Respondeu" e "Reunião marcada" |
| `on-accent` | `#fafaf8` | Texto sobre `accent` |
| `inverse` | `#121412` | Toast |
| `on-inverse` | `#f2f3f0` | Texto sobre `inverse` |
| `on-inverse-muted` | `#a4aaa2` | Texto secundário sobre `inverse` |
| `accent-on-inverse` | `#e2673a` | Acento sobre fundo escuro |

### Tokens de estado (exclusivos desta ferramenta)

| Token | Hex | Papel |
|---|---|---|
| `warn` / `warn-soft` | `#8a5a00` / `#f5ead2` | Pill "Resposta automática" |
| `ok` / `ok-soft` | `#2f6b3a` / `#dfeadf` | Pill "Fechado" |
| `violet-soft` | `#e6e1f0` | Pill "Proposta enviada" (texto `ink`) |

### Contraste (WCAG 2.1, calculado)

| Par | Ratio |
|---|---|
| `ink` sobre `paper` | 16.62:1 |
| `ink` sobre `raised` | 17.71:1 |
| `ink-muted` sobre `paper` | 6.96:1 |
| `ink-muted` sobre `surface` | 6.28:1 |
| `on-accent` sobre `accent` | 5.50:1 |
| `accent` sobre `paper` | 5.16:1 |
| `accent-hover` sobre `accent-soft` | 5.84:1 |
| `on-inverse` sobre `inverse` | 16.62:1 |
| `warn` sobre `warn-soft` | 4.96:1 |
| `ok` sobre `ok-soft` | 5.17:1 |

**Decisões:** todo texto passa AA. `accent` sobre `accent-soft` dá 4.55:1, no limite, então o texto
das pills "Respondeu" usa `accent-hover`. `line` é só borda, nunca texto.

### Status → pill

| Status | Fundo | Borda | Texto |
|---|---|---|---|
| A contatar | `paper` | `line` | `ink` |
| Contatado | `surface` | `line` | `ink` |
| Resposta automática | `warn-soft` | `warn-soft` escurecido 8% | `warn` |
| Respondeu, Reunião marcada | `accent-soft` | `accent-soft` escurecido 8% | `accent-hover` |
| Proposta enviada | `violet-soft` | idem | `ink` |
| Fechado | `ok-soft` | idem | `ok` |
| Sem interesse | transparente | `line` | `ink-muted`, riscado |

---

## 4. Tipografia

Duas famílias, as mesmas do site, via `next/font/google` (OFL, sem problema de licença):

| Papel | Família | Uso |
|---|---|---|
| **Sans** | Schibsted Grotesk (400, 500, 600, 700) | Tudo: títulos, texto, botões, lista |
| **Mono** | JetBrains Mono (400, 500) | Kicker `01 / hoje`, números, datas, contadores, atalhos, pills de status |

### Escala (ferramenta: menor que a do site)

```
display      28px  700  line-height 1.15  tracking -0.01em   nome do lead no detalhe
title        18px  700  line-height 1.3                       títulos de bloco grandes (Números)
body         15px  400  line-height 1.45                      texto padrão
body-strong  15px  600                                        nome na lista
small        13px  400                                        metadados da lista, subtítulos
label        12px  400  mono  tracking 0.02em                 kicker, rótulos de bloco (em minúsculas)
micro        11px  400  mono                                  pills, contagens, atalhos <kbd>
```

O site usa `display-xl` de 76.8px com `tracking -0.035em` no hero. Aqui, só o h1 do detalhe herda
a mesma personalidade (700, tracking negativo), em tamanho de ferramenta.

**Ênfase do site:** palavra com sublinhado `accent` de 0.09em de espessura (`text-decoration`,
`text-underline-offset: 0.12em`). Usar no máximo uma vez por tela, no estado vazio
("Nada pendente **hoje**.") ou no login. Nunca em lista.

**Kicker:** `01 / hoje`, `02 / todos`, `03 / números`, e no detalhe
`linha 32 / pet shop / prioridade alta`. Mono, `label`, `ink-muted`, em minúsculas.
É o elemento que mais identifica o site: não pode faltar.

---

## 5. Componentes

### Botões (altura 40px, raio 4px, peso 500)
| Variante | Visual | Uso |
|---|---|---|
| `primary` | fundo `accent`, texto `on-accent`, hover `accent-hover` | **Copiar e abrir WhatsApp** (um por tela) |
| `confirm` | fundo `ink`, texto `on-inverse` | **Enviei** |
| `secondary` | borda `ink` 1px, fundo transparente, hover `surface` | Ações de revisão, Salvar |
| `ghost` | borda `line`, hover borda `ink` | Pular, Mostrar mais, ← Lista |

O primário leva o ícone do WhatsApp (16px, `currentColor`) à esquerda e o atalho em `<kbd>` à
direita, igual ao CTA do site.

### Chips de status (raio 2px, 32px de altura, `small`)
Borda `line`, fundo `raised`; hover borda `ink`; ativo fundo `ink`, texto `on-inverse`.

### Segmentado (`curta | completa`, `whatsapp web | app`)
Mono `micro`, borda `line`, opção ativa fundo `ink`.

### Inputs e textarea
Fundo `raised` (busca) ou `paper` (mensagem), borda `line`, foco borda `ink` + anel 2px `accent`
com offset 2px (`--focus-ring` do site). Raio 2px.

### Item da lista
Padding 11px 20px, divisória inferior `line`. Linha 1: nome (`body-strong`, reticências) e pill
à direita. Linha 2: `small` `ink-muted`: `Cidade/UF · Nicho · 38 aval. · vence hoje`.
Hover fundo `raised`. Selecionado: fundo `raised` + barra interna de 3px `accent` à esquerda.

### Cabeçalho de seção da lista
`small` 600 + contagem em mono `ink-muted`; à direita, a dica em mono `label`.

### Toast
Fundo `inverse`, texto `on-inverse`, raio 2px, embaixo ao centro, 2,2s. Erros: mesma forma,
com o texto começando por "Erro:".

### Kbd
Mono `micro`, borda `line`, fundo `raised`, raio 2px. Dentro de botão escuro: borda branca 35%.

---

## 6. Layout e espaçamento

- Escala base 4px: 4, 8, 12, 16, 20, 24, 32, 48.
- Container máximo **1280px** (`max-w-content` do site), padding lateral 20px (32px a partir de 768px).
- Header fixo de 64px (`--header-height` do site) com borda inferior `line`, fundo `paper`.
- Desktop (≥ 860px): grid `minmax(300px, 420px) 1fr`. Lista e detalhe rolam de forma independente.
- Mobile (< 860px): uma coluna. Selecionar um lead mostra só o detalhe. No topo do detalhe, uma
  barra fixa logo abaixo do header com "← Lista" e o nome do lead (uma linha, cortado com
  reticências). No rodapé, uma barra fixa com "‹ Anterior", a posição em mono (`3/18`) e
  "Próximo ›"; botões desabilitados nas pontas. O toast sobe para ficar acima dela.
  O contador de meta some do header.
- Detalhe: largura máxima de 760px, padding 24px 28px. Blocos separados por divisória `line` com
  rótulo `label` em minúsculas (`status`, `próxima ação`, `observações`, `histórico`).

---

## 7. Estados

| Estado | Visual |
|---|---|
| Carregando | Skeleton de 8 itens na lista (blocos `surface`, sem animação de brilho) |
| Erro ao carregar | Texto claro do erro e botão "Tentar de novo". Nunca ficar em "Carregando" para sempre: timeout de 20s |
| Hoje vazio | Kicker `01 / hoje`, título "Nada pendente **hoje**." com ênfase, e sugestão de abrir "Todos" |
| Busca vazia | "Nada com “termo”." |
| Salvando | Atualização otimista imediata. Em erro, reverte e mostra toast |
| Sem celular | No lugar do primário: "Copiar mensagem" + nota mono "telefone fixo: mande pela DM" |

## 8. Movimento

Quase nenhum. Transições de 150ms em cor e borda. Toast entra com fade e 8px de deslocamento.
Respeitar `prefers-reduced-motion`. Nada de animação de entrada em lista.

## 9. Acessibilidade

- Tudo alcançável por teclado, com foco visível (anel `accent`).
- Chips de status são `button` com `aria-pressed`.
- Abas com `role="tablist"`. Lista com `aria-current` no item selecionado.
- Pills não dependem só de cor: o texto do status está sempre escrito.
- Atalhos de letra não disparam com foco em campo de texto.
- Áreas clicáveis com no mínimo 32px de altura no desktop e 40px no mobile.

## 10. Voz da interface

Direta, em segunda pessoa e sem jargão de CRM. "Responderam: sua vez", não "Leads com interação
pendente". "Enviei", não "Confirmar envio". Sem travessão.
