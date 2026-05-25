import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "goodsmell_gabi_2026";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v23.0";

const produtos = [
  {
    nome: "Shampoo Automotivo com Cera",
    tamanhos: ["300 ml", "500 ml", "1 litro", "5 litros"],
    descricao: "Indicado para lavagem externa da pintura, ajudando no brilho e acabamento.",
    cuidados: "Não aplicar sob sol forte. Não deixar secar na superfície. Fazer teste prévio."
  },
  {
    nome: "APC / Multiuso Automotivo",
    tamanhos: ["300 ml", "500 ml", "1 litro", "5 litros"],
    descricao: "Indicado para limpeza interna e externa, plásticos, borrachas, painel, tecido e sujeiras gerais.",
    cuidados: "Usar com cuidado em superfícies sensíveis. Sempre testar em uma pequena área."
  },
  {
    nome: "Revitalizador de Plástico",
    tamanhos: ["300 ml", "500 ml", "1 litro"],
    descricao: "Ajuda a renovar o aspecto de plásticos internos e externos.",
    cuidados: "Aplicar em superfície limpa e seca. Evitar excesso."
  },
  {
    nome: "Aromatizantes e Pingentes",
    tamanhos: ["unidade", "atacado"],
    descricao: "Produtos para deixar o veículo perfumado e com identidade Goodsmell.",
    cuidados: "Evitar contato direto com painel, pintura e superfícies sensíveis."
  }
];

app.get("/", (req, res) => {
  res.status(200).send("Servidor da Gabi Goodsmell está online.");
});

// Verificação do Webhook pela Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Verificação de webhook recebida:", { mode, token });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso.");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Recebimento de mensagens do WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const nomeCliente = contact?.profile?.name || "cliente";
    const textoRecebido = getTextoMensagem(message);

    console.log("Mensagem recebida:", {
      from,
      nomeCliente,
      textoRecebido
    });

    const resposta = gerarRespostaGabi(textoRecebido, nomeCliente);
    await enviarMensagemTexto(from, resposta);

    return res.sendStatus(200);
  } catch (error) {
    console.error("Erro no webhook:", error?.response?.data || error.message);
    return res.sendStatus(500);
  }
});

function getTextoMensagem(message) {
  if (message.type === "text") {
    return message.text?.body || "";
  }

  if (message.type === "button") {
    return message.button?.text || "";
  }

  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      ""
    );
  }

  return "";
}

function gerarRespostaGabi(textoOriginal, nomeCliente) {
  const texto = normalizarTexto(textoOriginal);

  if (!texto) {
    return mensagemMenuPrincipal(nomeCliente);
  }

  if (
    texto.includes("menu") ||
    texto.includes("oi") ||
    texto.includes("ola") ||
    texto.includes("olá") ||
    texto.includes("bom dia") ||
    texto.includes("boa tarde") ||
    texto.includes("boa noite")
  ) {
    return mensagemMenuPrincipal(nomeCliente);
  }

  if (texto === "1" || texto.includes("produto") || texto.includes("automotiva") || texto.includes("limpeza")) {
    return mensagemProdutos();
  }

  if (texto === "2" || texto.includes("aromatizante") || texto.includes("pingente")) {
    return mensagemAromatizantes();
  }

  if (texto === "3" || texto.includes("desengraxante") || texto.includes("limpeza pesada")) {
    return mensagemLimpezaPesada();
  }

  if (
    texto === "4" ||
    texto.includes("orcamento") ||
    texto.includes("orçamento") ||
    texto.includes("comprar") ||
    texto.includes("valor") ||
    texto.includes("preco") ||
    texto.includes("preço")
  ) {
    return mensagemOrcamento();
  }

  if (texto === "5" || texto.includes("suporte") || texto.includes("ajuda")) {
    return mensagemSuporte();
  }

  if (
    texto === "6" ||
    texto.includes("atendente") ||
    texto.includes("humano") ||
    texto.includes("falar com alguem") ||
    texto.includes("falar com alguém")
  ) {
    return mensagemAtendenteHumano();
  }

  if (texto.includes("pix") || texto.includes("pagar") || texto.includes("pagamento") || texto.includes("comprovante")) {
    return mensagemPagamento();
  }

  if (texto.includes("nota") || texto.includes("fiscal") || texto.includes("nf")) {
    return mensagemNotaFiscal();
  }

  return mensagemRespostaPadrao(nomeCliente);
}

function mensagemMenuPrincipal(nomeCliente) {
  return `Olá, ${nomeCliente}, tudo bem? 😊
Aqui é a Gabi, atendente virtual da Goodsmell.

Como posso te ajudar hoje?

1️⃣ Produtos para estética automotiva
2️⃣ Aromatizantes e pingentes
3️⃣ Limpeza pesada / desengraxante
4️⃣ Fazer um orçamento
5️⃣ Suporte de compra
6️⃣ Falar com um atendente

Digite o número da opção desejada.`;
}

function mensagemProdutos() {
  const lista = produtos
    .filter((p) => p.nome !== "Aromatizantes e Pingentes")
    .map((p, index) => `${index + 1}. ${p.nome}
${p.descricao}
Tamanhos: ${p.tamanhos.join(", ")}`)
    .join("\n\n");

  return `Temos algumas opções para limpeza e estética automotiva:

${lista}

Me diga qual produto você procura e onde pretende aplicar para eu te orientar melhor.

Antes de aplicar em toda a área, recomendamos testar em uma pequena parte escondida.`;
}

function mensagemAromatizantes() {
  return `Temos aromatizantes e pingentes Goodsmell 😊

Eles são indicados para deixar o veículo cheiroso e com acabamento mais agradável.

Você procura unidade, kit ou atacado?`;
}

function mensagemLimpezaPesada() {
  return `Para limpeza pesada, preciso entender melhor antes de indicar o produto correto.

Me informe, por favor:

1. Onde será aplicado?
2. A sujeira é óleo, graxa, barro, encardido ou outro tipo?
3. A superfície é pintura, roda, motor, plástico, piso ou tecido?

Assim evito te passar uma orientação errada. Sempre recomendamos teste prévio antes da aplicação completa.`;
}

function mensagemOrcamento() {
  return `Claro, monto o orçamento para você 😊

Me envie por favor:

Nome:
Cidade:
Produto desejado:
Quantidade:
Retirada ou entrega:
Forma de pagamento:

Assim que eu receber, organizo as informações para o atendimento confirmar.`;
}

function mensagemSuporte() {
  return `Claro, vou te ajudar.

Me explique o que aconteceu e, se possível, envie foto do produto ou da aplicação.

Se for uma dúvida técnica mais específica, vou encaminhar para um atendente da Goodsmell confirmar certinho.`;
}

function mensagemAtendenteHumano() {
  return `Perfeito. Vou encaminhar seu atendimento para um responsável da Goodsmell.

Enquanto isso, me envie por favor seu nome e o motivo do atendimento para agilizar.`;
}

function mensagemPagamento() {
  return `Dados para pagamento via Pix:

Chave Pix CNPJ: 27.357.578/0001-56

Após realizar o pagamento, por gentileza envie o comprovante por aqui para darmos baixa no pedido.`;
}

function mensagemNotaFiscal() {
  return `Emitimos nota fiscal sim.

Para emissão, envie por favor:

Nome ou razão social:
CPF ou CNPJ:
E-mail:
Endereço completo:

Se preferir, também posso encaminhar para um atendente confirmar os dados.`;
}

function mensagemRespostaPadrao(nomeCliente) {
  return `${nomeCliente}, entendi. Para eu te ajudar melhor, escolha uma opção:

1️⃣ Produtos para estética automotiva
2️⃣ Aromatizantes e pingentes
3️⃣ Limpeza pesada / desengraxante
4️⃣ Fazer um orçamento
5️⃣ Suporte de compra
6️⃣ Falar com um atendente

Se preferir, pode me explicar em uma frase o que você precisa.`;
}

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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
    text: {
      preview_url: false,
      body
    }
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
