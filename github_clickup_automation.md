# 📚 Sistema de Automação GitHub → ClickUp

## 🧠 Visão Geral

Sistema backend leve para: - Ler issues do GitHub - Processar com lógica
inteligente - Criar tasks no ClickUp - Distribuir automaticamente entre
o time

------------------------------------------------------------------------

# 🤖 Prompt Final (Agente de Decisão - Opus 4.6)

Você é um agente de automação responsável por gerenciar tarefas de um
projeto de software (sistema de biblioteca).

Seu papel NÃO é criar tarefas do zero. Seu papel é PROCESSAR issues do
GitHub e transformá-las em tarefas bem estruturadas no ClickUp.

## CONTEXTO DO TIME

Backend: - isaque - higor 

Frontend: - breno - joao - isaque

QA: - mendonca

Docs: - mendonca

## OBJETIVO

Para cada issue: 1. Identificar área 2. Escolher responsável com menor
workload

## SAÍDA (JSON)

{ "area": "backend", "assignee": "higor", "priority": "high", "tags":
\["backend"\], "justification": "Menor carga de trabalho" }

------------------------------------------------------------------------

# 🧩 Estrutura do ClickUp

## Space

Projeto Biblioteca

## Lists

-   Backlog
-   Sprint Atual
-   QA
-   Documentação

## Status

Backlog → To Do → In Progress → Review → Done

## Tags

-   backend
-   frontend
-   qa
-   docs

## Custom Fields

Tipo: Feature \| Bug \| Task\
Prioridade: High \| Medium \| Low

------------------------------------------------------------------------

# 📄 Template de Task

## Descrição

{description}

## Critérios de aceitação

-   [ ] ...

## Origem

GitHub: {url}

## \## Observações técnicas

## Área

{backend/frontend/qa/docs}

------------------------------------------------------------------------

# 🏗️ Estrutura do Projeto Backend

/src /services github.service.js clickup.service.js /core assigner.js
processor.js /db database.js /utils logger.js index.js

------------------------------------------------------------------------

# ⚙️ Fluxo do Sistema

1.  Buscar issues no GitHub
2.  Filtrar não processadas
3.  Calcular workload
4.  Decidir responsável
5.  Criar task no ClickUp
6.  Salvar no banco

------------------------------------------------------------------------

# 🗄️ Banco de Dados (SQLite)

Tabela tasks:

-   issue_id  
-   clickup_task_id
-   assigned_to
-   created_at

------------------------------------------------------------------------

# 🚀 Execução

node index.js
