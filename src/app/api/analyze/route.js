/**
 * @file route.js
 * @description Rota de servidor para integração com Gemini AI.
 * Formata os dados aninhados do método ativo e o array de acessórios antes de injetar no LLM.
 */

import {GoogleGenerativeAI} from "@google/generative-ai";
import {NextResponse} from "next/server";

<<<<<<< HEAD
export const POST = async (request) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
=======
export async function POST(request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    // console.log("🔍 GOOGLE_API_KEY:", apiKey ? "OK" : "❌ ausente");
>>>>>>> 149af2cc9c1be95aff3bccbfdb0391aff14badd3

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chave de API ausente no servidor. Configure GOOGLE_API_KEY no .env.local.",
        },
<<<<<<< HEAD
        {status: 500},
=======
        {status: 500}
>>>>>>> 149af2cc9c1be95aff3bccbfdb0391aff14badd3
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({model: "gemini-2.5-flash-lite"});

    const {inputs, imageParts} = await request.json();

    // Extrai dados do método ativo
    const methodData = inputs[inputs.method] || {};
    const accessoriesString =
      Array.isArray(inputs.accessories) && inputs.accessories.length > 0
        ? inputs.accessories.join(", ")
        : "Nenhum informado";

    // Calcula proporção com segurança
    const dose = parseFloat(methodData.dose) || 0;
    const cupYield = parseFloat(methodData.cupYield) || 0;
    const ratioCalc =
      dose > 0 && cupYield > 0 ? (cupYield / dose).toFixed(1) : "N/A";

    const textPrompt = `
      Você é um barista especialista com conhecimento em equipamentos caseiros e profissionais. 
      Analise os seguintes dados e imagens de uma extração de café e forneça um diagnóstico técnico, direto e avançado.
      
      A resposta DEVE ser em HTML. Use o formato <h3><strong>Título</strong></h3> para os títulos "Diagnóstico", "Sugestão Principal" e "Análise Detalhada".
<<<<<<< HEAD
      Pule uma linha ao final de cada bloco. Use <p> para os parágrafos de texto e <ul>/<li> para a análise detalhada.
      Use <b> para destaques. Não use markdown (###).
=======
      Pule uma linha ao final de cada bloco e coloque os títulos em uppercase.
      Use <p> para os parágrafos de texto. Para a "Análise Detalhada", use uma lista <ul> com itens <li>.
      Use <b> para destacar termos importantes. Não use markdown (###).
      Se houver imagens, relacione sua análise com o que você vê nelas (ex: cor da crema, uniformidade, etc.). Se não houver imagens, baseie-se apenas nos dados.
>>>>>>> 149af2cc9c1be95aff3bccbfdb0391aff14badd3

      SETUP DO USUÁRIO:
      - Máquina/Método Base: ${inputs.machine || "Não informado"}
      - Moedor: ${inputs.grinder || "Não informado"}
      - Acessórios extras: ${accessoriesString}
      
      DADOS DA EXTRAÇÃO:
      - Método selecionado: ${inputs.method.toUpperCase()}
      - Dose (pó): ${methodData.dose}g
      - Rendimento Final: ${methodData.cupYield}g (Proporção resultante: 1:${ratioCalc})
      - Moagem: ${methodData.clicks} clicks
      - Nível de Torra: ${methodData.roast}
      - Tempo Registrado: ${methodData.extractionTime}s
      - Crema reportada: ${inputs.method === "espresso" ? methodData.crema : "N/A (Filtro)"}
      - Sabor: ${methodData.taste} (1=Ácido/Sub, 2=Equilibrado, 3=Amargo/Super)

      Se o método for ESPRESSO, o foco deve ser retenção no moedor, canais (WDT), e tempo alvo de 25-35s. Considere as limitações do moedor ou da máquina reportada.
      Se o método for V60, foque no tempo de bypass, retenção de fluxo do filtro e alvos na casa dos 2 minutos para concentrados.
      
      Diagnóstico:
      [Diagnóstico claro]

      Sugestão Principal:
      [Ação direta, ex: "Suba o clique", "Ajuste o WDT", etc.]

      Análise Detalhada:
      [Explicação do porquê, linkando os sintomas às peças do setup.]
    `;

    const formattedImageParts = (imageParts || []).map((part) => ({
      inlineData: {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      },
    }));

    const promptParts = [{text: textPrompt}, ...formattedImageParts];

    const result = await model.generateContent(promptParts).catch((err) => {
<<<<<<< HEAD
      console.error("❌ Erro na geração:", err);
=======
      console.error("❌ Erro na geração de conteúdo Gemini:", err);
>>>>>>> 149af2cc9c1be95aff3bccbfdb0391aff14badd3
      throw err;
    });

    const response = result.response;
    let text = response.text();
<<<<<<< HEAD
=======

>>>>>>> 149af2cc9c1be95aff3bccbfdb0391aff14badd3
    text = text.replace(/^```html\s*/i, "").replace(/\s*```$/i, "");

    console.log("✅ Resposta do Gemini recebida com sucesso!");
    return NextResponse.json({analysis: text.trim()});
  } catch (error) {
<<<<<<< HEAD
    console.error("❌ Erro na API:", error);
=======
    console.error("❌ Erro na API do Gemini:", error);
>>>>>>> 149af2cc9c1be95aff3bccbfdb0391aff14badd3
    return NextResponse.json(
      {error: "Erro na análise. Verifique a chave de API e a conexão."},
      {status: 500},
    );
  }
};
