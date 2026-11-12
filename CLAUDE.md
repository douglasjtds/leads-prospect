# CLAUDE.md

Instruções para o Claude trabalhar no repositório `leads-prospect`.

## Antes de qualquer tarefa

1. Leia `instructions/PRODUCT-SPEC.md`, `instructions/ARCHITECTURE.md` e `instructions/DESIGN-GUIDELINES.md` por inteiro. Eles são a
   fonte de verdade. Se algo não estiver definido neles, **pergunte antes de decidir**.
2. Siga a fase atual de `instructions/prompts.md`. Uma fase por vez. Não adiante trabalho de fases seguintes.
3. Next.js 16: as APIs mudaram desde o seu treino. Antes de usar uma API do Next, leia o guia em
   `node_modules/next/dist/docs/` (veja `AGENTS.md`). Ex.: `middleware.ts` agora é `src/proxy.ts`.

## Git

- **Nunca faça commit, push ou abra PR.** O Douglas commita.
- Ao fim de cada fase, entregue a mensagem de commit pronta em Conventional Commits
  (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`), em português.
- **Nunca** adicione `Co-Authored-By`, "Generated with Claude Code" ou link de sessão em mensagens
  de commit ou PR.

## Regras de código

- TypeScript strict. Sem `any`. Sem `// @ts-ignore`.
- **Toda leitura e escrita na planilha passa por `src/lib/sheets/leads-repo.ts`.** Nenhum
  componente, rota ou script chama a Sheets API diretamente.
- **Lógica de negócio fica em `src/lib/domain/`**, em funções puras e testadas com Vitest
  (próxima ação, transições de status, seções do "Hoje", mensagens). Componentes só exibem e
  chamam ações.
- Credenciais do Google e a senha do app **nunca** chegam ao cliente. Nada de
  `NEXT_PUBLIC_` para essas variáveis.
- Colunas da planilha são encontradas **pelo nome do cabeçalho**, nunca pela letra ou posição.
  O Douglas pode reordenar ou adicionar colunas à mão.
- A linha de um lead é localizada pelo `Place ID` no momento da escrita, nunca por um número de
  linha guardado no cliente. A planilha pode ser reordenada a qualquer momento.
- Datas em America/Sao_Paulo. "Hoje" é sempre calculado no fuso de São Paulo, no servidor.
- **O app nunca envia mensagens.** Ele copia o texto e abre o chat. Não integre Evolution API,
  Baileys, extensões de disparo nem a API oficial do WhatsApp.

## Regras de interface e texto

- Interface em português do Brasil.
- **Sem travessão (em dash) em nenhum texto da interface ou das mensagens.** Use vírgula,
  dois-pontos, parênteses ou frases separadas.
- Nenhum hex fora de `src/app/globals.css` (tokens). Siga `instructions/DESIGN-GUIDELINES.md`.
- Textos das mensagens de WhatsApp vêm de `src/lib/domain/messages.ts` e seguem exatamente
  `instructions/PRODUCT-SPEC.md` §6. Não reescreva a copy sem pedir.

## Validação ao fim de cada fase

- `npm run lint`, `npm run typecheck` e `npm test` passando.
- Para fases com interface: passe visual real (navegador ou screenshot) em 1280px e em 390px.
- Liste o que ficou pendente ou o que você decidiu sem estar no documento.
