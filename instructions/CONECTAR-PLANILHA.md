# CONECTAR-PLANILHA.md
### Ligar o leads-prospect à planilha Google (conta de serviço)

O app lê e grava a planilha pelo servidor, usando uma **conta de serviço** do Google: um "usuário
robô" com e-mail próprio, que só enxerga as planilhas compartilhadas com ele. Não precisa de
cartão de crédito, e a Google Sheets API é gratuita no seu volume de uso.

Tempo total: uns 15 minutos.

---

## Passo 0. Confirme que a planilha é uma Planilha Google de verdade

A API só edita planilhas no formato nativo do Google. Se você subiu o `.xlsx` e abriu direto,
pode estar editando o arquivo do Excel.

1. Abra a planilha `prospeccao_landing_pages`.
2. Olhe ao lado do nome do arquivo, no topo. **Se aparecer um selo `.XLSX`**, vá em
   **Arquivo → Salvar como Planilhas Google**. Isso cria uma cópia nativa: use essa daqui em
   diante (e apague ou arquive a outra para não confundir).
3. Confirme que a aba se chama exatamente **`Leads`**.

## Passo 1. Criar o projeto no Google Cloud

1. Acesse https://console.cloud.google.com com a **mesma conta Google dona da planilha**.
2. No seletor de projeto (topo da tela, à esquerda), clique em **Novo projeto**.
3. Nome: `leads-prospect`. Organização: "Sem organização". Clique em **Criar**.
4. Confirme que o seletor de projeto mostra `leads-prospect` antes de seguir.

## Passo 2. Ativar a Google Sheets API

1. Menu ☰ → **APIs e serviços → Biblioteca**.
2. Busque **Google Sheets API**, abra e clique em **Ativar**.

## Passo 3. Criar a conta de serviço

1. Menu ☰ → **IAM e administrador → Contas de serviço** → **Criar conta de serviço**.
2. Nome: `leads-app`. O ID é preenchido sozinho. Clique em **Criar e continuar**.
3. Na etapa de papéis (roles), **não escolha nada**: a conta não precisa de acesso ao projeto,
   só à planilha. Clique em **Continuar** e depois em **Concluir**.
4. Copie o e-mail da conta, algo como
   `leads-app@leads-prospect-123456.iam.gserviceaccount.com`.

## Passo 4. Gerar a chave JSON

1. Clique na conta `leads-app` → aba **Chaves** → **Adicionar chave → Criar nova chave** → **JSON**
   → **Criar**. Um arquivo `.json` é baixado.
2. **Guarde esse arquivo fora do repositório** (ex.: num gerenciador de senhas). Quem tem esse
   arquivo edita a sua planilha. Nunca faça commit dele.

> Se aparecer "A criação de chaves de conta de serviço está desativada", a conta está sob uma
> política de organização (comum em contas de trabalho). Use sua conta Gmail pessoal.

## Passo 5. Compartilhar a planilha com a conta de serviço

1. Na planilha, clique em **Compartilhar**.
2. Cole o e-mail da conta de serviço, permissão **Editor**.
3. Desmarque **Notificar pessoas** (o robô não lê e-mail) e clique em **Compartilhar**.

## Passo 6. Pegar o ID da planilha

Na URL da planilha:
```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0
                                       └────────────── SHEET_ID ──────────────┘
```

## Passo 7. Preencher o `.env.local`

Na raiz do projeto, copie `.env.example` para `.env.local` e preencha com os campos do JSON:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL="leads-app@leads-prospect-123456.iam.gserviceaccount.com"   # campo client_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"  # campo private_key, igual ao JSON, com os \n
SHEET_ID="1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"
SHEET_TAB="Leads"
APP_PASSWORD="uma senha forte só sua"
SESSION_SECRET="gere com: openssl rand -base64 32"
APP_TIMEZONE="America/Sao_Paulo"
```

- Copie o `private_key` **exatamente** como está no JSON, entre aspas duplas, com os `\n` literais.
  O app converte para quebras de linha de verdade.
- O `.gitignore` já ignora `.env*.local` e `*service-account*.json`. Confira antes do primeiro commit.

## Passo 8. Testar a conexão e migrar as colunas

Disponível a partir da Fase 2 do `prompts.md`:

```bash
npm run check:sheet
```
Saída esperada:
```
✓ Autenticado como leads-app@leads-prospect-123456.iam.gserviceaccount.com
✓ Planilha "prospeccao_landing_pages", aba "Leads"
✓ 245 linhas com Empresa
✓ Colunas encontradas: Prioridade, Nicho, Empresa, ... (22)
! Faltando: Place ID, URL atual, Variante  → rode npm run migrate
```

Depois:
```bash
npm run migrate
```
Ela cria as colunas que faltam, preenche `Place ID` e `URL atual` a partir dos links e aplica a
lista de status. Pode rodar mais de uma vez sem estragar nada.

## Passo 9. Configurar na Vercel

1. Em https://vercel.com/new, importe o repositório `douglasjtds/leads-prospect`.
2. Em **Environment Variables**, cadastre as 7 variáveis do passo 7, marcando **Production** e
   **Preview**.
   - Em `GOOGLE_PRIVATE_KEY`, cole o valor com os `\n` literais, **sem** as aspas externas.
3. Clique em **Deploy**. Abra a URL e faça login com o `APP_PASSWORD`.
4. Recomendado: em **Settings → Deployment Protection**, deixe a Vercel Authentication ligada
   para os previews. O login do app já protege, mas assim os previews ficam com duas camadas.

## Passo 10. Desligar o web app antigo do Apps Script

1. Na planilha: **Extensões → Apps Script → Implantar → Gerenciar implantações**.
2. Na implantação do web app, clique em **Arquivar**.
3. O `onEdit` pode ficar: ele só preenche a `Data contato` quando você muda o Status à mão na
   planilha, e isso não conflita com o app. Se preferir, apague o projeto do Apps Script inteiro.

---

## Problemas comuns

| Erro | Causa | Solução |
|---|---|---|
| `403 The caller does not have permission` | Planilha não compartilhada com a conta de serviço | Passo 5 |
| `404 Requested entity was not found` | `SHEET_ID` errado | Passo 6 |
| `This operation is not supported for this document` | Arquivo ainda é `.xlsx` | Passo 0 |
| `Unable to parse range: Leads!A1:ZZ` | Nome da aba diferente de `SHEET_TAB` | Renomeie a aba ou ajuste a variável |
| `error:1E08010C:DECODER routines::unsupported` ou `invalid_grant` | `GOOGLE_PRIVATE_KEY` com quebras erradas | Cole de novo com os `\n` literais |
| `Google Sheets API has not been used in project` | API não ativada no projeto certo | Passo 2, conferindo o seletor de projeto |
| Funciona local, falha na Vercel | Variável faltando ou com aspas sobrando | Confira as 7 variáveis e faça redeploy |
