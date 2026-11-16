# PRODUCT-SPEC.md
### leads-prospect: ferramenta pessoal de prospecção por WhatsApp

> Fonte de verdade sobre **o que** o produto faz. Como ele é construído está em `ARCHITECTURE.md`.
> Como ele parece está em `DESIGN-GUIDELINES.md`.

---

## 1. Contexto e problema

O Douglas vende landing pages para pequenos negócios de serviço (dentistas, nutricionistas,
psicólogos, advogados, estética, pet shops etc.). Os leads vêm do Google Maps via Apify:
negócios **sem site próprio** e com **celular (WhatsApp) ou Instagram**. Eles ficam numa planilha
Google com cerca de 245 linhas por leva.

Na primeira leva, de 30 contatos saíram 3 respostas humanas (10%, um resultado normal para
contato frio). O problema não é a taxa de resposta, é o **vazamento no acompanhamento**:

- **Respostas automáticas abandonadas.** A maioria dos leads respondeu com mensagem automática
  ("em breve retornaremos"). Ninguém respondeu de volta, e esses leads ficaram parados. Quem tem
  resposta automática é justamente o perfil de cliente que leva o WhatsApp a sério.
- **Envio lento e com atrito.** Era preciso achar a coluna da mensagem, copiar e colar, porque o
  link `wa.me?text=` cortava mensagens longas. Status e data eram atualizados à mão.
- **Sem visão do que fazer hoje.** Follow-ups do dia 3 e do dia 7 dependiam de filtrar a planilha.
- **Difícil achar o lead** quando alguém respondia: no WhatsApp aparece só o número ou o nome
  do contato, e era preciso procurar na planilha.

## 2. Usuário

Um só: o Douglas. Usa no desktop com o WhatsApp (Web ou app) aberto ao lado, e às vezes pelo
celular. Não existe multiusuário, convite ou papéis.

## 3. Princípios

1. **Um clique por lead, nunca disparo automático.** Envio em massa leva ao banimento do número.
   O app prepara, copia e abre o chat. O Douglas cola e envia. O teto seguro é de 20 a 30 novos
   contatos por dia.
2. **A planilha é o banco.** Tudo que o app grava aparece na planilha na hora, e o que o Douglas
   edita na planilha aparece no app ao recarregar.
3. **A tela principal responde "o que eu faço agora?"**, não "como está o funil". Por isso não
   existe kanban.
4. **Cada status tem uma próxima ação com a mensagem certa.** O Douglas não precisa lembrar qual
   mensagem mandar em qual etapa.

## 4. Dados de um lead

Colunas da aba `Leads` (os nomes do cabeçalho são o contrato; a ordem pode mudar):

| Coluna | Tipo | Origem | Observação |
|---|---|---|---|
| `Prioridade` | Alta, Média, Baixa | importação | Ordem de envio dos novos |
| `Nicho` | texto curto | importação | Ex.: Dentista, Pet shop |
| `Empresa` | texto | importação | Nome limpo do Google |
| `Cidade`, `UF` | texto | importação | |
| `Telefone` | texto | importação | Ex.: `+55 18 99771-7770` |
| `Situação` | enum (§4.1) | importação | Define a variação da 1ª mensagem |
| `Link atual` | texto com hyperlink | importação | Instagram, Linktree, site amador |
| `Nota`, `Avaliações` | número | importação | Prova de personalização na mensagem |
| `Google Maps` | texto com hyperlink | importação | URL com `place_id` |
| `Place ID` | texto | importação | **Chave única.** Criada na Fase 2 a partir do link do Maps |
| `URL atual` | texto | importação | URL em texto puro do `Link atual` (a API não lê hyperlinks) |
| `Status` | enum (§5) | app | |
| `Data contato` | data | app | Data da 1ª mensagem |
| `Próx. ação` | data ou vazio | app | Quando o lead volta para o "Hoje" |
| `Toques` | inteiro | app | Quantas mensagens o Douglas já mandou |
| `Histórico` | texto | app | Eventos separados por ` · `, cada um `dd/MM texto` |
| `Observações` | texto | app e manual | Anotações livres |
| `Variante` | curta, completa ou vazio | app | Versão da 1ª mensagem usada (teste A/B) |
| `Mensagem (texto)` | texto | importação | Versão completa pré-gerada da 1ª mensagem |

Colunas legadas que o app **ignora** (podem continuar na planilha): `Enviar 1ª msg`,
`Próximo passo`, `Follow-up dia 3`, `Follow-up dia 7`.

### 4.1 Situação

| Valor | Significado |
|---|---|
| `Sem site` | Perfil do Google sem site |
| `Instagram no lugar do site` | O botão "Site" do Google leva ao Instagram |
| `Facebook no lugar do site` | Idem, para o Facebook |
| `WhatsApp no lugar do site` | Idem, link direto de WhatsApp |
| `Link na bio / plataforma` | Linktree, Doctoralia e afins |
| `Site amador (construtor grátis)` | Wix, Google Sites, Lovable etc.: lead de upgrade |

### 4.2 Celular

Um lead tem celular quando os dígitos do telefone têm 13 caracteres, começam com `55` e o quinto
dígito é `9`. Sem celular, o app não abre o chat: ele copia a mensagem e abre o `Link atual`
(normalmente o Instagram) para envio por DM.

## 5. Status e próxima ação

### 5.1 Status

`A contatar` → `Contatado` → `Resposta automática` → `Respondeu` → `Reunião marcada` →
`Proposta enviada` → `Fechado` / `Sem interesse`

O Douglas pode mudar o status manualmente a qualquer momento (chips na tela do lead).

### 5.2 Máquina de próxima ação

`hoje` = data atual em America/Sao_Paulo. `+N` = hoje mais N dias.

| Status | Condição | Próxima ação | Mensagem (§6) | Ao confirmar "Enviei" |
|---|---|---|---|---|
| A contatar | celular ou link atual | 1ª mensagem | `primeira` (curta ou completa) | status Contatado, Toques 1, Data contato hoje (se vazia), Próx. ação +3, Variante, histórico `1ª msg (curta)` |
| Contatado | Toques = 0 | **Revisar** (§5.3) | nenhuma | depende do botão |
| Contatado | Toques = 1 | Follow-up dia 3 | `fu3` | Toques 2, Próx. ação +4, histórico `follow-up dia 3` |
| Contatado | Toques = 2 | Follow-up final | `fu7` | Toques 3, Próx. ação vazia, histórico `follow-up final` |
| Contatado | Toques ≥ 3 | Sequência encerrada | nenhuma | |
| Resposta automática | histórico sem `furou fila` | Furar a resposta automática | `furar` | Toques +1, Próx. ação +2, histórico `furou fila` |
| Resposta automática | histórico com `furou fila` e sem `cobrou resposta` | Cobrar retorno | `cobrarRA` | Toques +1, Próx. ação vazia, histórico `cobrou resposta` |
| Resposta automática | já cobrou | Aguardando | nenhuma | |
| Respondeu, Reunião marcada | histórico sem `enviou site` | Mandar o site | `site` | Próx. ação +2, histórico `enviou site` |
| Respondeu, Reunião marcada | já enviou o site | Em conversa | respostas rápidas | |
| Proposta enviada | | Cobrar a proposta | `proposta` | Próx. ação +3, histórico `cobrou proposta` |
| Fechado, Sem interesse | | nenhuma | | |

**Mudança manual de status** (chip) grava histórico `status → X` e ajusta a Próx. ação:
- para `Respondeu`, `Reunião marcada`, `Resposta automática`, `Fechado`, `Sem interesse`: vazia;
- para `Proposta enviada`: +3;
- para `Contatado` com Toques 0: Toques 1, Data contato hoje (se vazia), Próx. ação +3.

**Pular** (só em `A contatar`): status `Sem interesse`, histórico `pulado: <motivo>`. Motivos:
número errado, rede ou franquia, já tem site, outro.

### 5.3 Revisar

São os leads `Contatado` com `Toques = 0`: a 1ª mensagem saiu antes do app existir, e o que veio
depois não foi registrado (são os cerca de 30 primeiros). Quatro botões:

| Botão | Efeito |
|---|---|
| Ainda sem resposta | Toques 1, Próx. ação hoje (entra direto no follow-up), histórico `revisado: sem resposta` |
| Resposta automática | status Resposta automática, Próx. ação vazia, histórico `revisado: resposta automática` |
| Respondeu | status Respondeu, Próx. ação vazia, histórico `revisado: respondeu` |
| Sem interesse | status Sem interesse, histórico `revisado: sem interesse` |

## 6. Mensagens (textos padrão)

Regras: sem travessão; nunca escrever "encontrei a {empresa}" (erra o gênero com profissionais
homens), usar "encontrei vocês" e citar o nome só como "pra {empresa}", sem artigo; nota com vírgula decimal (`5,0`). O texto aparece numa caixa editável
antes de copiar.

### 6.1 Mensagens personalizáveis ("Salvar para todos")

Os textos desta seção são os **padrões**. Cada um é um modelo que o Douglas pode trocar pela tela:

- A caixa mostra o texto do lead aberto. Os trechos que mudam a cada lead são **variáveis** e
  aparecem destacados como etiquetas, com o valor do lead. Não dá para editar uma etiqueta por
  dentro, só apagá-la inteira. Digitar `{empresa}` (ou outra variável) põe a etiqueta de volta.
- Editar a caixa vale só para aquele envio. Quando o texto difere do modelo em uso, aparece
  **Salvar para todos**, que grava o modelo (com as variáveis, não com os valores do lead).
- Antes de gravar, o app confere o modelo e pede confirmação se:
  - uma variável que estava no modelo sumiu ("Sumiu do texto: empresa...");
  - um valor do lead aberto foi escrito à mão no texto (ex.: o nome da empresa), porque vai sair
    igual para todos;
  - e **impede** gravar se houver `{algo}` que não é variável.
- Com modelo salvo, aparece **Restaurar padrão** (com confirmação), que volta ao texto abaixo.
- A variante completa (coluna `Mensagem (texto)`) é por lead e não tem "Salvar para todos".
- As respostas rápidas se editam em "Editar respostas", com o mesmo fluxo.

Variáveis (valem em qualquer mensagem):

| Variável | Valor |
|---|---|
| `{empresa}` | nome do lead; vazio vira `vocês` |
| `{nicho}` | nicho no plural (regra abaixo) |
| `{cidade}` | cidade do lead |
| `{elogio}` | `: {N} avaliações com nota {nota}, parabéns!` se Avaliações ≥ 5 e houver Nota; senão `.` |
| `{observacao}` | frase da situação (abaixo); pode ser vazia |

Os modelos salvos ficam na aba `Mensagens` da planilha (colunas `Chave` e `Texto`). Chave sem
linha, ou com Texto vazio, usa o padrão. Chaves: `primeiraPadrao`, `primeiraSiteAmador`, `fu3`,
`fu7`, `furar`, `cobrarRA`, `site`, `proposta`, `rrPreco`, `rrInstagram`, `rrAgoraNao`, `rrLink`.

**Nicho no plural:** Clínica de estética → clínicas de estética, Dentista → dentistas, Psicólogo →
psicólogos, Nutricionista → nutricionistas, Advogado → advogados, Contabilidade → escritórios de
contabilidade, Personal trainer → personal trainers, Marcenaria → marcenarias, Estética automotiva
→ estética automotiva, Pet shop → pet shops.

### `primeira` · variante curta (padrão)

`{prova}`, sempre citando a pesquisa:
- se Avaliações ≥ 5 e houver Nota: `Estava pesquisando {nicho no plural} em {cidade} no Google e encontrei vocês: {N} avaliações com nota {nota}, parabéns!`
- senão: `Estava pesquisando {nicho no plural} em {cidade} no Google e encontrei vocês.`

`{empresa}` é o nome do lead como está na planilha, sempre depois de "pra" e sem artigo. Se o
nome estiver vazio, usa `vocês`.

Sem site, ou rede social, ou link na bio:
```
Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

{prova} {observação}

Posso te mostrar como ficaria uma página pra {empresa}?
```
`{observação}`: `Reparei que vocês ainda não têm site no perfil.` (Sem site) ou
`Reparei que o botão "Site" de vocês leva {destino}.`, com destino `pro Instagram`,
`pro Facebook`, `direto pro WhatsApp` ou `pra uma página de links`.

Site amador:
```
Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

{prova} Dei uma olhada na página de vocês e tenho 2 ou 3 ideias pra ela trazer mais clientes.

Posso te mandar o que pensei pra {empresa}?
```

### `primeira` · variante completa

Usa a coluna `Mensagem (texto)`. Se estiver vazia, cai para a curta.

### Demais mensagens

`fu3`
```
Oi! Passando só pra ver se você viu minha mensagem. Se não for o momento, sem problema, é só me avisar 🙂
```
`fu7`
```
Última mensagem por aqui, prometo. Se um dia quiserem uma página pra receber quem chega pelo Google, é só me chamar. Sucesso pra vocês!
```
`furar`
```
Oi! Aqui é o Douglas, desenvolvedor web. Queria falar com o responsável sobre uma página pra vocês receberem melhor quem chega pelo Google. Consegue me direcionar?
```
`cobrarRA`
```
Oi! Passando pra ver se conseguiram ver minha mensagem sobre a página de vocês 🙂
```
`site`
```
Show! Esse é o meu site, com páginas que já estão no ar e como funciona:
https://douglastertuliano.vercel.app/

Pra vocês, eu pensaria numa página com quem vocês são, os principais serviços, as avaliações do Google em destaque e um botão direto pro WhatsApp. A entrega é em até 10 dias úteis.

Me conta: hoje a maioria dos clientes chega como? Indicação, Instagram ou Google?
```
`proposta`
```
Oi! Conseguiu dar uma olhada na proposta? Fico à disposição pra ajustar o que precisar.
```

### Respostas rápidas

Aparecem para Resposta automática, Respondeu, Reunião marcada e Proposta enviada. Um clique copia.

| Rótulo | Texto |
|---|---|
| Quanto custa? | O plano essencial começa em R$ 500, tá explicado no site. Se quiser, te digo o que entraria no caso de vocês pra ficar mais claro. |
| Já tenho Instagram | Faz sentido, e o Instagram continua sendo a vitrine. A página não substitui, ela complementa: no Instagram a pessoa precisa rolar o feed pra achar endereço, serviços e horários. Na página ela acha tudo em 5 segundos e clica no WhatsApp. |
| Agora não | Tranquilo! Posso te chamar de novo em janeiro? Começo de ano é quando o pessoal costuma organizar essas coisas. |
| Link do site | https://douglastertuliano.vercel.app/ |

## 7. Telas

### 7.1 Login
Campo de senha único. Sessão de 30 dias.

### 7.2 Layout geral
Header fixo: marca `Douglas Tertuliano / prospecção`, **busca**, contador `hoje 12/25 novos`.
Abas: **Hoje** (com contagem), **Todos** (com contagem), **Números**.
Desktop: lista à esquerda (até 420px) e detalhe à direita. Abaixo de 860px: lista ou detalhe,
com botão "← Lista".

### 7.3 Busca
Sempre visível. Atalho `/`. Busca sem acento e sem diferenciar maiúsculas por empresa, cidade e
nicho, e **por dígitos do telefone** a partir de 3 dígitos (no WhatsApp, contato desconhecido
aparece só como número). `Esc` limpa. Enquanto há busca, a lista mostra os resultados no lugar
da aba.

### 7.4 Hoje
Seções nesta ordem, cada uma com título, contagem e dica. Só aparecem se tiverem itens.

1. **Responderam: sua vez.** Status Respondeu ou Reunião marcada, com Próx. ação vazia ou ≤ hoje.
2. **Respostas automáticas para furar.** Status Resposta automática, Próx. ação vazia ou ≤ hoje,
   e com mensagem pendente.
3. **Follow-ups vencidos.** Contatado com Toques 1 ou 2 e Próx. ação ≤ hoje; Proposta enviada
   com Próx. ação vazia ou ≤ hoje.
4. **Revisar no WhatsApp.** Contatado com Toques 0.
5. **Novos envios.** A contatar, na ordem da planilha (já priorizada), limitado ao que falta para
   a meta do dia (mínimo de 3 visíveis mesmo com a meta batida).

Ao abrir, o primeiro item da fila fica selecionado (no desktop).

### 7.5 Detalhe do lead
- Kicker mono: `linha 32 / pet shop / prioridade alta`
- Nome (h1), cidade/UF, nota e avaliações, telefone, situação, links "Google Maps ↗" e
  "Link atual ↗"
- **Status:** chips com todos os status, o atual preenchido
- **Próxima ação:** título, explicação de uma linha, caixa de texto editável com a mensagem,
  seletor `curta | completa` (só na 1ª mensagem), botões:
  - **Copiar e abrir WhatsApp** (`C`): copia o texto da caixa e abre o chat do número, sem texto
    na URL
  - **Enviei** (`E`): aplica a transição da §5.2 e seleciona o próximo item da mesma fila
  - **Pular** (só em A contatar), com motivo
  - Seletor `abrir no: whatsapp web | app` (lembrado no navegador)
- **Respostas rápidas** (quando aplicável)
- **Observações:** textarea com botão Salvar
- **Histórico:** lista do mais recente para o mais antigo, data em mono

### 7.6 Todos
Filtro por status, lista paginada de 60 em 60.

### 7.7 Números
- Funil: contagem por status com barra proporcional
- Resumo: contatados, conversas reais (Respondeu, Reunião, Proposta, Fechado) e percentual,
  respostas automáticas
- **Teste A/B da 1ª mensagem:** por variante, enviadas, % com qualquer resposta (inclui
  automática) e % com resposta humana. Aviso: conclusões só depois de uns 30 envios por variante
- Meta diária de novos envios (padrão 25, lembrada no navegador)

### 7.8 Atalhos
`/` busca · `Esc` limpa e tira o foco · `C` copiar e abrir · `E` enviei · `J` / `K` próximo e
anterior na lista. Atalhos de letra não disparam com foco em campo de texto.

## 8. Importação de novos leads

Novas levas vêm do fluxo Apify (skill `prospeccao-google-maps`), que gera um `.xlsx` com as
colunas da §4. Duas formas de entrar:

1. **Manual:** colar as linhas no fim da aba `Leads`.
2. **Pelo app** (Fase 9): `POST /api/leads/import` recebe as linhas em JSON, **descarta as que já
   existem** (mesmo `Place ID` ou mesmos dígitos de telefone), anexa o resto no fim e devolve
   quantas entraram e quantas foram descartadas. Também existe o script `npm run import -- arquivo.xlsx`.

## 9. Fora de escopo

- Envio automático de mensagens, agendamento de disparos, integração com API do WhatsApp
- Multiusuário, papéis, convite
- Kanban
- Leitura das conversas do WhatsApp
- Edição dos dados de importação (nome, telefone) pelo app: isso se faz na planilha
