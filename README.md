# BaristaPro

Este é um projeto desenvolvido em Next.js focado em oferecer uma plataforma robusta para gerenciamento de usuários e dados acadêmicos/administrativos.

## 🚀 Funcionalidades do Sistema

O sistema foi projetado com foco na experiência do usuário e segurança. Abaixo estão as principais funcionalidades implementadas:

### 🔐 Autenticação e Segurança

- **Gestão de Sessão Persistente:** O sistema gerencia automaticamente o ciclo de vida do login, utilizando `localStorage` para manter o usuário autenticado mesmo após recarregar a página.
- **Controle de Acesso:** Proteção de rotas que verifica a validade do token e do usuário antes de renderizar conteúdo restrito.
- **Alteração de Senha:** Interface dedicada (`ChangePasswordDialog`) para que usuários possam atualizar suas credenciais de forma segura.

### 👤 Perfil do Usuário

- **Edição de Perfil:** Permite a atualização de dados cadastrais.
- **Upload de Foto:** Funcionalidade para envio e atualização da foto de perfil, com feedback visual de sucesso ou erro.

### 🛠️ Utilitários e Integrações

- **Busca de CEP:** Integração para preenchimento automático de endereços baseada na busca por CEP.
- **Gestão de Disciplinas:** Módulo para busca e listagem de disciplinas (`fetchDisciplinas`), facilitando a organização acadêmica.

### ⚡ Experiência do Usuário (UX)

- **Feedback Visual:** Utilização de notificações (Toasts) para informar o usuário sobre o status das operações (ex: "Erro ao buscar CEP", "Foto enviada com sucesso").
- **Carregamento Otimizado:** Indicadores de carregamento durante transições de rota e operações assíncronas.
- **Fontes Otimizadas:** Uso da fonte `Geist` via `next/font` para melhor performance e legibilidade.

## Tecnologias Utilizadas

- **Framework:** Next.js
- **Estilização & UI:** React Toastify (Notificações)
- **Gerenciamento de Estado:** Context API (`AuthContext`)
- **Requisições:** Fetch API com tratamento de erros personalizado

---

_Este documento foca nas capacidades funcionais da aplicação. Para detalhes de implementação, consulte o código-fonte._
