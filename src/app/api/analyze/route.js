import {GoogleGenerativeAI} from "@google/generative-ai";
import {NextResponse} from "next/server";

export async function POST(request) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY, {
    apiVersion: "v1",
  });
  const model = genAI.getGenerativeModel({model: "gemini-2.5-flash-lite"});

  try {
    const {inputs, imageParts} = await request.json();

    const textPrompt = `
      Você é um barista especialista em café expresso. Analise os seguintes dados e imagens de uma extração de café e forneça um diagnóstico e sugestões de ajuste.
      Seja direto, técnico e amigável, como um especialista ajudando um amigo. Formate a resposta em HTML simples, usando <h3>, <ul>, <li> e <b> para destacar pontos importantes.
      Se houver imagens, relacione sua análise com o que você vê nelas (ex: cor da crema, uniformidade, etc.). Se não houver imagens, baseie-se apenas nos dados.

      Dados da Extração:
      - Dose (quantidade de pó): ${inputs.dose}g
      - Proporção: 1:${inputs.ratio}
      - Moagem (clicks): ${inputs.clicks} clicks
      - Nível de Torra: ${inputs.roast}
      - Tempo de Extração: ${inputs.extractionTime}s
      - Crema: ${inputs.crema}
      - Sabor (1=Ácido, 2=Ideal, 3=Amargo): ${inputs.taste}

      Diagnóstico:
      [Forneça um diagnóstico claro sobre o que provavelmente está acontecendo com a extração: sub-extraído, super-extraído, canalização, etc.]

      Sugestão Principal:
      [Indique a principal ação a ser tomada. Ex: "Moer mais fino para X clicks", "Ajustar a dose para Y gramas".]

      Análise Detalhada:
      [Explique o porquê da sua sugestão, conectando os dados. Ex: "O tempo de ${inputs.extractionTime}s é muito rápido, indicando que a água passou com pouca resistência. Moer mais fino aumentará a resistência e o tempo de contato."]
    `;

    // Constrói o prompt multimodal (texto + imagens)
    const formattedImageParts = (imageParts || []).map((part) => ({
      inlineData: {
        data: part.inlineData.data,
        mime_type: part.inlineData.mimeType,
      },
    }));
    const promptParts = [{text: textPrompt}, ...formattedImageParts];

    const result = await model.generateContent(promptParts);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({analysis: text});
  } catch (error) {
    console.error("Erro na API do Gemini:", error);
    return NextResponse.json(
      {
        error:
          "Desculpe, não foi possível realizar a análise. Verifique se a chave de API do Google está configurada corretamente no seu ambiente.",
      },
      {status: 500}
    );
  }
}
