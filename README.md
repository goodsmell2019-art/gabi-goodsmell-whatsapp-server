# Servidor da Gabi Goodsmell — WhatsApp Cloud API

Este projeto é a primeira versão do servidor da Gabi, atendente virtual da Goodsmell.

## O que ele faz

- Valida webhook da Meta.
- Recebe mensagens do WhatsApp.
- Responde com menu automático.
- Responde sobre produtos, orçamento, Pix, nota fiscal e atendente humano.
- Fica pronto para integrar futuramente com o app de vendas Goodsmell.

## Variáveis de ambiente

Configure estas variáveis no Render ou no seu servidor:

```env
VERIFY_TOKEN=goodsmell_gabi_2026
WHATSAPP_TOKEN=COLE_AQUI_SEU_TOKEN_DA_META
PHONE_NUMBER_ID=1176720558864271
GRAPH_API_VERSION=v23.0
PORT=3000
```

## URL para colocar na Meta

Depois que subir no Render, use:

```text
https://SEU-LINK-DO-RENDER.onrender.com/webhook
```

## Token de verificação

Use exatamente:

```text
goodsmell_gabi_2026
```

## Comandos locais

```bash
npm install
npm start
```

Depois acesse:

```text
http://localhost:3000
```

## Observação

O token da Meta não deve ser colocado em grupos, prints públicos ou enviado para terceiros.
