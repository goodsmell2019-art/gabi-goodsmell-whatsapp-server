import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "goodsmell_gabi_2026";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v23.0";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const baseConhecimento = JSON.parse(fs.readFileSync("./goodsmell-knowledge.json", "utf8"));

app.get("/", (req, res) => {
  res.status(200).send("Servidor da Gabi Goodsmell Fase 1 IA está online.");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") return res.sendStatus(404);

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const nomeCliente = contact?.profile?.name || "cliente";
    const textoRecebido = getTextoMensagem(message);

    console.log("Mensagem recebida:", { from, nomeCliente, textoRecebido });

    const resposta = await gerarRespostaGabiIA(textoRecebido, nomeCliente);
    await enviarMensagemTexto(from, resposta);

    return res.sendStatus(200);
  } catch (error) {
    console.error("Erro no webhook:", error?.response?.data || error.message);
    return res.sendStatus(500);
  }
});

function getTextoMensagem(message) {
  if (message.type === "text") return message.text?.body || "";
  if (message.type === "button") return message.button?.text || "";
  if (message.type === "interactive") return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "";
  return "";
}

async function gerarRespostaGabiIA(textoCliente, nomeCliente) {
  if (!process.env.OPENAI_API_KEY) return mensagemFallbackSemIA(nomeCliente);

  const promptSistema = `
Você é a Gabi, atendente virtual da Goodsmell.

Sua função é atender clientes no WhatsApp sobre produtos automotivos da Goodsmell.

Regras obrigatórias:
- Responda em português do Brasil.
- Seja educada, simpática, objetiva e profissional.
- Use linguagem natural de WhatsApp.
- Use APENAS a base de conhecimento fornecida.
- Nunca invente preço, estoque, prazo ou diluição.
- Quando não tiver preço, estoque, prazo ou diluição, diga que precisa confirmar com um atendente.
- Sempre recomende teste em pequena área antes da aplicação completa.
- Não recomende misturas químicas perigosas.
- Não fale sobre higienização de ar-condicionado.
- Se o cliente pedir algo complexo, dano, reclamação, compra grande, revenda ou formulação química, encaminhe para atendente humano.
- Se o cliente mandar "menu", "oi", "bom dia" ou algo genérico, apresente o menu principal.
- Se o cliente pedir produtos, mostre as linhas de produtos primeiro.
- Se o cliente citar uma linha, mostre os produtos daquela linha.
- Se o cliente citar um produto, explique indicação, cuidado e pergunte tamanho/quantidade/cidade para orçamento.
- Mantenha a resposta curta, idealmente até 1200 caracteres.
`;

  const entrada = `
Nome do cliente: ${nomeCliente}

Mensagem do cliente:
${textoCliente}

Base de conhecimento Goodsmell:
${JSON.stringify(baseConhecimento, null, 2)}
`;

  try {
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: promptSistema },
        { role: "user", content: entrada }
      ]
    });

    return limparResposta(response.output_text || mensagemFallbackSemIA(nomeCliente));
  } catch (error) {
    console.error("Erro ao chamar OpenAI:", error?.response?.data || error.message);
    return mensagemFallbackSemIA(nomeCliente);
  }
}

function limparResposta(texto) {
  const resposta = String(texto || "").trim();
  if (resposta.length <= 3500) return resposta;
  return resposta.slice(0, 3400) + "\n\nPara continuar, me envie mais detalhes ou escolha uma opção do menu.";
}

function mensagemFallbackSemIA(nomeCliente) {
  return `Olá, ${nomeCliente}, tudo bem? 😊
Aqui é a Gabi, atendente virtual da Goodsmell.

Como posso te ajudar hoje?

1️⃣ Produtos automotivos
2️⃣ Compra no atacado / revenda
3️⃣ Financeiro / pagamento
4️⃣ Falar com atendente

Você também pode escrever direto o que precisa.
Exemplo: "produto para limpar painel", "shampoo automotivo", "produto para pneu", "vidro manchado".`;
}

async function enviarMensagemTexto(to, body) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("WHATSAPP_TOKEN ou PHONE_NUMBER_ID não configurado.");
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body }
  };

  const headers = {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    "Content-Type": "application/json"
  };

  const response = await axios.post(url, payload, { headers });
  console.log("Mensagem enviada:", response.data);
  return response.data;
}

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
