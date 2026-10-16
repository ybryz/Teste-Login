# Teste Login

Sistema simples de login com cadastro de usuários, em modo escuro, feito com HTML, CSS, JavaScript e Node.js — sem nenhuma dependência externa.

## Funcionalidades

- **Login:** quem acerta e-mail e senha chega à tela "Você está logado".
- **Cadastro de usuários:** nome, e-mail, senha e confirmação de senha. Bloqueia e-mail repetido, e-mail inválido e senha com menos de 6 caracteres.
- **Esqueci minha senha:** orienta o usuário a chamar um administrador.
- **Tela protegida:** `/logado` só abre para quem fez login; os demais são redirecionados ao login.
- **Sair:** encerra a sessão.

## Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML e CSS | Telas e visual em modo escuro (responsivo) |
| JavaScript | Comportamento das telas (envio do formulário, mensagens) |
| Node.js | Servidor: cadastro, login, sessão e proteção de páginas |

O servidor usa apenas módulos nativos do Node (`http`, `fs`, `path`, `crypto`).

## Como executar

Pré-requisito: [Node.js](https://nodejs.org/) instalado.

```bash
node server.js
```

Depois abra http://localhost:5500.

1. Acesse `/cadastro` e crie uma conta.
2. Volte ao login (`/`) e entre com a conta criada.

## Estrutura

```
.
├── server.js              # Servidor e API (cadastro, login, logout, sessão)
├── users.json             # Usuários cadastrados (criado automaticamente, não vai para o Git)
└── public/
    ├── style.css          # Estilo compartilhado (modo escuro)
    ├── login.html         # Tela de login
    ├── cadastro.html      # Tela de cadastro
    ├── esqueci-senha.html # Aviso para chamar um administrador
    └── logado.html        # Tela "Você está logado"
```

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Tela de login |
| GET | `/cadastro` | Tela de cadastro |
| GET | `/esqueci-senha` | Tela de senha esquecida |
| GET | `/logado` | Tela interna (exige login) |
| POST | `/api/cadastro` | Cria um usuário |
| POST | `/api/login` | Autentica e cria a sessão |
| POST | `/api/logout` | Encerra a sessão |
| GET | `/api/me` | Retorna o usuário logado |

## Segurança

- Senhas **nunca** são salvas em texto puro: usa-se hash `scrypt` com salt individual por usuário.
- Comparação de senha em tempo constante (`timingSafeEqual`).
- Cookie de sessão `HttpOnly` e `SameSite=Strict`.
- A mensagem de erro do login é a mesma para e-mail inexistente e senha errada.
- Proteção contra acesso a arquivos fora da pasta `public`.

## Limitações

Este é um projeto simples, para estudo e demonstração. Antes de usar em produção seria preciso:

- Guardar sessões fora da memória (hoje, reiniciar o servidor desloga todo mundo).
- Trocar o `users.json` por um banco de dados.
- Limitar tentativas de login.
- Servir por HTTPS.
- Criar uma tela de administrador para redefinir senhas (hoje a redefinição é manual, editando o `users.json`).
