# Sistema ERP - Gestão Industrial

Este projeto é um sistema de ERP para gestão industrial, com integrações para emissão de NF-e (Focus NFe) e sincronização bancária (Pluggy).

## Tecnologias Utilizadas

- **Frontend**: React, Tailwind CSS, Motion, Recharts.
- **Backend**: Node.js, Express.
- **Banco de Dados**: Firebase Firestore.
- **Autenticação**: Firebase Auth (Google Login).

## Como Rodar o Projeto Localmente

### 1. Clonar o Repositório

```bash
git clone <url-do-repositorio>
cd sistema-erp---gestão-industrial
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Preencha as variáveis no arquivo `.env` com suas credenciais do Firebase, Pluggy e Focus NFe.

**Importante:** No GitHub, se você for usar GitHub Actions ou algum serviço de deploy (como Vercel/Railway), lembre-se de configurar estas variáveis nos segredos (Secrets) do repositório.

| Variável | Descrição |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Chave de API do Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação do Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `VITE_FIREBASE_APP_ID` | ID do aplicativo Firebase |
| `VITE_FIREBASE_DATABASE_ID` | ID do banco de dados Firestore (opcional, padrão: (default)) |
| `PLUGGY_CLIENT_ID` | Client ID da API Pluggy |
| `PLUGGY_CLIENT_SECRET` | Client Secret da API Pluggy |
| `FOCUS_NFE_API_TOKEN` | Token da API Focus NFe |
| `GEMINI_API_KEY` | Chave de API do Google Gemini |

### 4. Rodar o Servidor de Desenvolvimento

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`.

## Estrutura do Projeto

- `src/`: Contém o código-fonte do frontend.
- `server.ts`: Servidor Express que gerencia as APIs e serve o frontend.
- `firebase.ts`: Configuração do Firebase utilizando variáveis de ambiente.
- `metadata.json`: Metadados do aplicativo para o AI Studio.

## Deploy

Para gerar a build de produção:

```bash
npm run build
```

Os arquivos estáticos serão gerados na pasta `dist/`.
