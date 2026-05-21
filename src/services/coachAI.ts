const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MODELS = [
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.3-8b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
];

const SYSTEM_PROMPT = `
Você é o Coach Pibble, conselheiro financeiro inteligente do app PibbleFinance.

PERSONALIDADE:
- Você é um filhotinho fofo, amigável e esperto.
- Seja acolhedor, mas inteligente.
- Fale como um coach financeiro moderno.
- Evite respostas genéricas e repetidas.

REGRAS:
- Responda sempre em português do Brasil.
- Seja curto e útil.
- Use respostas naturais.
- Nunca repita exatamente a mesma estrutura.
- Não use markdown complexo.
- Não use títulos com ##.
- Use emojis com moderação.
- Faça análises baseadas nos dados reais recebidos.
- Termine com uma pergunta curta para continuar a conversa.

ESTILO:
- Explique de forma simples.
- Dê sugestões práticas.
- Seja conversacional.

FORMATO IDEAL:
🐾 Resumo

💡 Sugestão prática

❓ Próximo passo
`;

function extractValue(prompt: string, label: string) {
  const regex = new RegExp(`${label}:\\s*(.+)`, "i");
  return prompt.match(regex)?.[1]?.trim() || "não informado";
}

function getUserQuestion(prompt: string) {
  const match = prompt.match(/Pergunta do usuário:\s*(.+)/i);

  return match?.[1]?.trim().toLowerCase() || "";
}

function getLocalFallback(prompt: string) {
  const userQuestion = getUserQuestion(prompt);

  const saldo = extractValue(prompt, "Saldo disponível");
  const creditoRestante = extractValue(prompt, "Crédito restante");
  const gastosCredito = extractValue(prompt, "Gastos no crédito");
  const gastosTotais = extractValue(prompt, "Gastos totais");
  const entradas = extractValue(prompt, "Entradas");

  const score =
    prompt.match(/Score financeiro:\s*(\d+)\/100/i)?.[1] || "0";

  // SCORE
  if (
    userQuestion.includes("score") ||
    userQuestion.includes("pontuação")
  ) {
    return `🐾 Resumo

Seu score financeiro atual é **${score}/100**.

💡 Sugestão prática

- Seus gastos podem estar altos em relação às entradas.
- Evite depender demais do crédito.
- Tente manter uma sobra no final do mês.

❓ Próximo passo

Quer que eu te mostre o principal fator que afetou seu score?`;
  }

  // CRÉDITO
  if (
    userQuestion.includes("crédito") ||
    userQuestion.includes("credito") ||
    userQuestion.includes("cartão") ||
    userQuestion.includes("fatura")
  ) {
    return `🐾 Resumo

Você ainda possui **${creditoRestante}** de crédito disponível e já utilizou **${gastosCredito}** no cartão.

💡 Sugestão prática

- Evite novas parcelas agora.
- Confira se sua próxima fatura cabe no orçamento.
- Use saldo em conta para gastos menores.

❓ Próximo passo

Quer que eu avalie se seu uso de crédito está saudável?`;
  }

  // SALDO
  if (
    userQuestion.includes("saldo") ||
    userQuestion.includes("dinheiro") ||
    userQuestion.includes("conta")
  ) {
    return `🐾 Resumo

Seu saldo disponível atual é **${saldo}**.

💡 Sugestão prática

- Priorize gastos essenciais.
- Evite compras impulsivas por enquanto.
- Mantenha uma pequena reserva de emergência.

❓ Próximo passo

Você ainda tem contas importantes para pagar este mês?`;
  }

  // GASTOS
  if (
    userQuestion.includes("gasto") ||
    userQuestion.includes("despesa")
  ) {
    return `🐾 Resumo

Você registrou **${gastosTotais}** em gastos até agora.

💡 Sugestão prática

- Reveja despesas recorrentes.
- Pequenos gastos acumulam rápido.
- Corte o que não estiver sendo usado.

❓ Próximo passo

Quer ajuda para identificar onde economizar mais?`;
  }

  // ENTRADAS
  if (
    userQuestion.includes("entrada") ||
    userQuestion.includes("receber") ||
    userQuestion.includes("receita")
  ) {
    return `🐾 Resumo

Você possui **${entradas}** registrados como entradas de dinheiro.

💡 Sugestão prática

- Tente manter entradas maiores que os gastos.
- Organize recebimentos previstos.
- Evite gastar antes de receber.

❓ Próximo passo

Você tem algum valor previsto para entrar nos próximos dias?`;
  }

  // RESPOSTA GERAL
  return `🐾 Resumo

Seu score atual está em **${score}/100**.
Você possui **${saldo}** disponíveis, com **${entradas}** em entradas e **${gastosTotais}** em gastos.

💡 Sugestão prática

- Continue acompanhando seus gastos diariamente.
- Evite usar crédito sem necessidade.
- Organizar pequenas despesas já faz diferença.

❓ Próximo passo

Quer que eu analise qual área financeira precisa mais de atenção agora?`;
}

async function requestOpenRouter(prompt: string, model: string) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "PibbleFinance",
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 220,
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
    }
  );

  const data = await response.json();

  console.log(`OPENROUTER RESPONSE (${model})`, data);

  if (!response.ok || data.error) {
    throw new Error(
      data?.error?.message || `Erro ao usar modelo ${model}`
    );
  }

  const content =
    data?.choices?.[0]?.message?.content?.trim();

  if (!content || content.length < 10) {
    throw new Error(`Resposta inválida do modelo ${model}`);
  }

  return content;
}

export async function askCoachPibble(
  prompt: string
): Promise<string> {
  if (!prompt.trim()) {
    return "Me conta sua dúvida financeira 🐾";
  }

  // fallback local
  if (!OPENROUTER_API_KEY) {
    return getLocalFallback(prompt);
  }

  for (const model of MODELS) {
    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      const response = await requestOpenRouter(
        prompt,
        model
      );

      if (response) {
        return response;
      }
    } catch (error) {
      console.warn(`Modelo falhou (${model})`, error);
    }
  }

  // fallback final
  return getLocalFallback(prompt);
}