import {GoogleGenerativeAI} from "@google/generative-ai";
import {NextResponse} from "next/server";

export async function POST(request) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({model: "gemini-2.5-flash-lite"});

  try {
    const {inputs, imageParts} = await request.json();

    const textPrompt = `
      Você é um barista especialista em café expresso. Analise os seguintes dados e imagens de uma extração de café e forneça um diagnóstico e sugestões de ajuste.
      Seja direto, técnico e amigável.
      A resposta DEVE ser em HTML. Use o formato <h3><strong>Título</strong></h3> para os títulos "Diagnóstico", "Sugestão Principal" e "Análise Detalhada".
      Pule uma linha ao final de cada bloco e coloque em os titulos em uppercase.
      Use <p> para os parágrafos de texto. Para a "Análise Detalhada", use uma lista <ul> com itens <li>.
      Use <b> para destacar termos importantes. Não use markdown (###).
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
      [Diagnóstico claro: sub-extraído, super-extraído, etc.]

      Sugestão Principal:
      [Ação principal a ser tomada. Ex: "Moer mais fino para X clicks".]

      Análise Detalhada:
      [Explicação detalhada do porquê da sugestão, conectando os dados.]
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
    let text = response.text();

    // Limpa o markdown que o modelo pode adicionar ao redor do HTML
    text = text.replace(/^```html\s*/, "").replace(/\s*```$/, "");

    return NextResponse.json({analysis: text.trim()});
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
