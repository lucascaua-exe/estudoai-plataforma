# EstudoAI

> Plataforma web de preparação para concurso — **Analista de Tecnologia da Informação · Prefeitura Municipal de Araguaína/TO · 2026 (banca IMPAR)**.

Monorepo com API Django e SPA React, prontos para deploy em **Render** (backend) e **Netlify** (frontend). O banco de questões (~2.300 itens) vai versionado em fixture e é carregado automaticamente no primeiro boot do Render — **sem Shell pago**.

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Início rápido (local)](#início-rápido-local)
- [Banco de questões](#banco-de-questões)
- [Deploy — Render + Netlify](#deploy--render--netlify)
- [Admin e criação de usuários](#admin-e-criação-de-usuários)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [API (visão geral)](#api-visão-geral)
- [Planos](#planos)
- [Testes](#testes)
- [Licença e conteúdo](#licença-e-conteúdo)

---

## Sobre o projeto

O **EstudoAI** é um micro-SaaS de estudos orientado ao edital e aos materiais oficiais do concurso (PDFs de teoria, resumo e questões). O conteúdo pedagógico **não é inventado**: é ingerido a partir dos PDFs em `backend/data/pdfs/` e persistido no banco.

Objetivos do produto:

- Centralizar questões, simulados, revisão e acompanhamento de domínio
- Oferecer painel do aluno com metas, evolução e gamificação
- Expor landing comercial (Free / Pro / Premium) + área autenticada
- Permitir gestão de usuários e planos pelo **Django Admin**
- Subir em hosting gratuito (Render free + Netlify) com boot automatizado

---

## Funcionalidades

| Área | O que faz |
|------|-----------|
| **Landing** | Página pública, planos e CTA de cadastro/login |
| **Auth** | Registro, login JWT (access + refresh), perfil, troca de senha |
| **Painel** | Dashboard de desempenho e streak |
| **Questões** | Filtros por disciplina/assunto, resposta, favoritos, revisão |
| **Simulados** | Criar, responder e ver resultado |
| **Revisão** | Sessões baseadas em erros e recomendações |
| **Mapa / domínio** | Visão de mastery por assunto |
| **Metas** | Metas diárias e foco de estudo |
| **Assistente IA** | Chat com RAG sobre a base (requer `OPENAI_API_KEY`) |
| **Billing** | Visualização de plano, troca, cancelamento e faturas (modelo interno) |
| **Admin** | CRUD de usuários, perfis, planos e conteúdo |

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | Python 3.12 · Django 5 · Django REST Framework · SimpleJWT |
| Banco | SQLite (local) · PostgreSQL (Render / `DATABASE_URL`) |
| Frontend | React 19 · Vite 8 · TypeScript · Tailwind CSS 4 |
| Auth | JWT Bearer · Zustand (client) |
| Deploy API | Gunicorn · WhiteNoise · `render.yaml` |
| Deploy Web | Netlify (`netlify.toml`) |
| Conteúdo | pdfplumber · fixture `fixtures/banco.json` |
| IA (opcional) | OpenAI · ChromaDB |

---

## Estrutura do repositório

```text
concurso_plataforma/
├── backend/                 # API Django (rootDir no Render)
│   ├── apps/                # accounts, questions, simulados, ai, …
│   ├── config/              # settings, urls, wsgi
│   ├── data/pdfs/           # PDFs-fonte do edital
│   ├── fixtures/
│   │   └── banco.json       # ~2.375 questões + catálogo (boot Render)
│   ├── build.sh             # pip + collectstatic
│   ├── start.sh             # migrate → ensure_admin → load_banco → gunicorn
│   ├── Procfile
│   ├── runtime.txt          # python-3.12.8
│   └── requirements.txt
├── frontend/                # SPA (base no Netlify)
│   ├── public/
│   └── src/
├── netlify.toml
├── render.yaml              # Blueprint: web + Postgres free
├── .env.example
├── .gitignore
└── README.md
```

---

## Início rápido (local)

### Pré-requisitos

- Python 3.12+
- Node.js 20+ (recomendado 22)
- Git

### Backend

```bash
cp .env.example .env
# ajuste SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py ensure_admin
python manage.py load_banco_if_empty
python manage.py runserver
```

- API: http://127.0.0.1:8000/api/health/
- Admin: http://127.0.0.1:8000/admin/

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- Em desenvolvimento, o Vite faz proxy de `/api` → `http://127.0.0.1:8000`

---

## Banco de questões

O arquivo **`backend/fixtures/banco.json`** contém o dump do catálogo, documentos e questões já processados.

No boot do Render (`start.sh`):

1. `migrate`
2. `ensure_admin` — cria superusuário a partir de `ADMIN_*`
3. `load_banco_if_empty` — se não houver questões, executa `loaddata` da fixture
4. Gunicorn

Para regenerar a fixture após um novo ingest local:

```bash
cd backend
# Windows: $env:PYTHONUTF8=1
python manage.py dumpdata \
  catalog.Disciplina catalog.Assunto catalog.Subassunto \
  documents.Documento documents.PaginaDocumento documents.DocumentoChunk \
  questions.Questao questions.Alternativa \
  --natural-foreign --natural-primary --indent 1 \
  -o fixtures/banco.json
```

PDFs oficiais ficam em `backend/data/pdfs/` (também versionados para reprocessamento).

---

## Deploy — Render + Netlify

### Backend (Render)

1. Conecte este repositório no Render.
2. Use o Blueprint (`render.yaml`) **ou** Web Service:
   - **Root Directory:** `backend`
   - **Build Command:** `bash build.sh`
   - **Start Command:** `bash start.sh`
3. Defina no painel (obrigatórias):

| Variável | Descrição |
|----------|-----------|
| `ADMIN_EMAIL` | E-mail do superusuário |
| `ADMIN_PASSWORD` | Senha forte |
| `ADMIN_NAME` | Nome exibido |
| `CORS_ALLOWED_ORIGINS` | URL do Netlify, ex.: `https://seu-app.netlify.app` |
| `CSRF_TRUSTED_ORIGINS` | Mesma URL do Netlify |
| `OPENAI_API_KEY` | Opcional (assistente IA) |

O blueprint já configura `SECRET_KEY`, `DATABASE_URL` (Postgres free), `DEBUG=false` e health check em `/api/health/`.

> **Nota:** Postgres free no Render expira ~30 dias. Depois, renove o banco ou use Neon/Supabase e atualize `DATABASE_URL`.

### Frontend (Netlify)

1. New site from Git → este repositório.
2. Base directory: `frontend` (ou use o `netlify.toml` da raiz).
3. Variável de build:

```env
VITE_API_URL=https://SEU-SERVICO.onrender.com
```

(sem barra no final)

4. Após o deploy, atualize `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` no Render com a URL real do site.

---

## Admin e criação de usuários

1. Acesse `https://SEU-API.onrender.com/admin/`
2. Entre com `ADMIN_EMAIL` / `ADMIN_PASSWORD`
3. **Usuários → Adicionar** (e-mail, nome, senha). O perfil é criado automaticamente; edite o plano no inline do perfil.
4. Alternativa: cadastro público em `/register`

---

## Variáveis de ambiente

Veja `.env.example` e `backend/.env.example`.

Principais:

| Variável | Onde | Uso |
|----------|------|-----|
| `SECRET_KEY` | Backend | Django / JWT |
| `DEBUG` | Backend | `false` em produção |
| `DATABASE_URL` | Backend | Postgres (Render injeta) |
| `CORS_ALLOWED_ORIGINS` | Backend | Origens do frontend |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Backend | Superuser no boot |
| `VITE_API_URL` | Frontend (Netlify) | URL pública da API |

**Nunca** commite `.env` com secrets reais.

---

## API (visão geral)

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/health/` | Público |
| POST | `/api/auth/register/` | Público |
| POST | `/api/auth/login/` | Público |
| POST | `/api/auth/refresh/` | JWT refresh |
| GET/PATCH | `/api/auth/me/` | JWT |
| GET | `/api/questions/` | JWT |
| POST | `/api/questions/{id}/answer/` | JWT |
| CRUD | `/api/simulados/` | JWT (só do usuário) |
| GET | `/api/dashboard/` | JWT |
| GET/POST | `/api/billing/` … | JWT |
| POST | `/api/ai/chat/` | JWT |

Documentação interativa: use o Django Admin e os endpoints acima; a API é REST/JSON.

---

## Planos

| Plano | Ideia de produto |
|-------|------------------|
| **Free** | Acesso básico ao banco e painel |
| **Pro** | Recursos intermediários |
| **Premium** | Acesso completo + IA (quando configurada) |

O modelo de faturas é interno (útil para demo/UI). Para cobrança real, integre gateway (Stripe, Pix, etc.) antes de produção comercial.

---

## Testes

```bash
cd backend
python manage.py test apps.accounts.tests -v1
```

Cobre registro, login, billing, questões, dashboard e ciclo de simulado.

---

## Licença e conteúdo

Código deste repositório: ver arquivo [LICENSE](LICENSE).

Os PDFs e o banco de questões derivam de material de concurso (IMPAR / Prefeitura de Araguaína). Use apenas para **estudo pessoal** conforme os termos dos organizadores; redistribuição comercial do conteúdo pedagógico pode ser restrita.

---

## Autor

Desenvolvido como plataforma de estudos focada no concurso de **Analista de TI — Araguaína/TO 2026**.

Issues e melhorias: use a aba **Issues** deste repositório.
