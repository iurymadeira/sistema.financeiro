# Financeiro

Sistema de finanças pessoais: saldo, movimentações e recorrências, histórico por mês e uma projeção de patrimônio com juros compostos e inflação. Projeto de portfólio, em desenvolvimento.

## Tecnologias

| Parte | Stack |
|---|---|
| Front-end (`frontend/`) | Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide |
| Back-end (`backend/`) | Node.js, Express 5 |
| Banco de dados | MySQL 8 (Docker); migração para PostgreSQL planejada |
| Qualidade | testes com `node:test`, ESLint, CI no GitHub Actions |

## Como rodar

Pré-requisitos: Node.js 22 e Docker.

```bash
# 1) Banco de dados
cp backend/.env_example backend/.env     # ajuste as senhas
docker compose up -d

# 2) Back-end (porta 5000)
cd backend
npm install
npm run dev

# 3) Front-end (porta 3000), em outro terminal
cd frontend
npm install
npm run dev
```

Abra http://localhost:3000.

## Testes e verificações

```bash
cd frontend && npm run lint && npm test && npm run build
cd backend  && npm test
```

O mesmo roda automaticamente a cada push e Pull Request (`.github/workflows/ci.yml`).

## Status

Em evolução. Já funcionam as telas do front (dashboard, movimentações e recorrências, histórico, projeção, movimentação rápida e configurações), com as regras de negócio cobertas por testes. Em construção: API por usuário com validação no servidor, autenticação e publicação online.

## Estrutura

```
frontend/   interface (Next.js)
backend/    API (Express): rotas, controllers, repositórios, serviços
docker-compose.yml   banco de dados para desenvolvimento
```
