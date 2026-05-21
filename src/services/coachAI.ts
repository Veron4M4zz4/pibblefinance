const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MODELS = [
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
];

const SYSTEM_PROMPT = `
Você é o Coach Pibble, conselheiro financeiro do app PibbleFinance.

PERSONALIDADE:
- Você é um filhotinho fofo, amigável e esperto.
- Seja carinhoso, mas objetivo.
- Fale como um app financeiro moderno.

REGRAS:
- Responda sempre em português do Brasil.
- Seja curto, mas útil.
- Não responda sempre igual.
- Não use ##, # ou títulos markdown complexos.
- Use apenas texto simples, listas e **negrito**.
- Dê uma recomendação prática baseada nos dados.
- Termine com uma pergunta curta.

FORMATO:
🐾 Resumo

💡 Minha sugestão

❓ Próximo passo
`;

function extractValue(prompt: string, label: string) {
  const regex = new RegExp(`${label}:\\s*(.+)`, "i");
  return prompt.match(regex)?.[1]?.trim() || "não informado";
}

function getLocalFallback(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();

  const saldo = extractValue(prompt, "Saldo disponível");
  const creditoRestante = extractValue(prompt, "Crédito restante");
  const gastosCredito = extractValue(prompt, "Gastos no crédito");
  const gastosTotais = extractValue(prompt, "Gastos totais");
  const entradas = extractValue(prompt, "Entradas");
  const score = prompt.match(/Score financeiro:\s*(\d+)\/100/i)?.[1] || "0";

  if (lowerPrompt.includes("score")) {
    return `🐾 Resumo

Seu score atual é **${score}/100**. Isso indica que sua saúde financeira precisa de atenção.

💡 Minha sugestão

- Reduza gastos no crédito.
- Registre entradas de dinheiro.
- Priorize contas essenciais.

❓ Próximo passo

Quer que eu te explique o que mais derrubou seu score?`;
  }

  if (lowerPrompt.includes("saldo")) {
    return `🐾 Resumo

Seu saldo disponível é **${saldo}**. Ele parece apertado para cobrir novos gastos.

💡 Minha sugestão

- Evite compras não essenciais.
- Use crédito só se for realmente necessário.
- Separe uma reserva mínima para urgências.

❓ Próximo passo

Você ainda tem alguma conta para pagar este mês?`;
  }

  if (lowerPrompt.includes("crédito") || lowerPrompt.includes("credito")) {
    return `🐾 Resumo

Você tem **${creditoRestante}** de crédito restante, mas já gastou **${gastosCredito}** no cartão.

💡 Minha sugestão

- Evite parcelar novas compras.
- Confira a próxima fatura.
- Use saldo/pix para gastos pequenos.

❓ Próximo passo

Essa fatura cabe no seu próximo recebimento?`;
  }

  return `🐾 Resumo

Seu score está em **${score}/100**. Você tem **${saldo}** de saldo, **${entradas}** em entradas e **${gastosTotais}** em gastos.

💡 Minha sugestão

- Segure novos gastos por enquanto.
- Priorize contas essenciais.
- Registre qualquer entrada prevista.

❓ Próximo passo

Você tem previsão de receber algum valor?`;
}

async function requestOpenRouter(prompt: string, model: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "PibbleFinance",
    },
    body: JSON.stringify({
      model,
      max_tokens: 320,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT.trim(),
        },
        {
          role: "user",
          content: prompt.trim(),
        },
      ],
    }),
  });

  const data = await response.json();

  console.log(`OPENROUTER RESPONSE - ${model}:`, data);

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Falha no modelo ${model}`);
  }

  const content = data?.choices?.[0]?.message?.content?.trim();

  if (!content || content.length < 10) {
    throw new Error(`Modelo ${model} respondeu vazio`);
  }

  return content;
}

export async function askCoachPibble(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    return "Me manda uma dúvida financeira, fofinha 🐾";
  }

  if (!OPENROUTER_API_KEY) {
    return getLocalFallback(prompt);
  }

 for (const model of MODELS) {
  await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      return await requestOpenRouter(prompt, model);
    } catch (error) {
      console.warn(`Modelo falhou: ${model}`, error);
    }
  }

  return getLocalFallback(prompt);
}