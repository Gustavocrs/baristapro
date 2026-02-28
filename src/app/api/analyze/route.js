/**
 * @file route.js
 * @description Rota de servidor para integração com Gemini AI.
 * Implementa Prompting Estrutural injetando marcação Tailwind diretamente na saída do LLM.
 */

import {GoogleGenerativeAI} from "@google/generative-ai";
import {NextResponse} from "next/server";

export const POST = async (request) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {error: "Chave de API ausente no servidor."},
        {status: 500},
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_AI_MODEL,
    });

    const {extraction, activeSetup, imageParts} = await request.json();

    const accessoriesString =
      activeSetup.accessories?.length > 0
        ? activeSetup.accessories.join(", ")
        : "Nenhum";

    const dose = parseFloat(extraction.dose) || 0;
    const cupYield = parseFloat(extraction.cupYield) || 0;
    const ratio =
      dose > 0 && cupYield > 0 ? (cupYield / dose).toFixed(1) : "N/A";

    const textPrompt = `
      Você é um Barista Campeão Mundial. Analise esta extração com rigor técnico.

      REGRA ABSOLUTA DE SAÍDA: 
      - Retorne APENAS código HTML válido. NADA DE TEXTO FORA DAS TAGS.
      - NÃO inicie com saudações (ex: "Olá", "Prezado").
      - NÃO use marcação Markdown (proibido usar ###, ** ou blocos \`\`\`html).
      - Você DEVE seguir EXATAMENTE a estrutura de classes Tailwind CSS abaixo, apenas preenchendo os colchetes com sua análise:

      <div class="space-y-5">
        <div class="p-5 bg-red-50 border-l-4 border-red-500 rounded-r-2xl shadow-sm">
          <h3 class="text-red-800 font-black text-sm mb-1 uppercase tracking-wider flex items-center gap-2">🎯 Diagnóstico Clínico</h3>
          <p class="text-red-950 font-medium text-sm leading-relaxed">[Seu diagnóstico direto]</p>
        </div>
        
        <div class="p-5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl shadow-sm">
          <h3 class="text-emerald-800 font-black text-sm mb-1 uppercase tracking-wider flex items-center gap-2">💡 Plano de Ação</h3>
          <p class="text-emerald-950 font-medium text-sm leading-relaxed">[Sua ação técnica recomendada no equipamento]</p>
        </div>
        
        <div class="p-5 bg-neutral-100 border border-neutral-200 rounded-2xl shadow-sm">
          <h3 class="text-neutral-800 font-black text-sm mb-3 uppercase tracking-wider flex items-center gap-2">🔬 Análise Detalhada</h3>
          <ul class="space-y-3">
            <li class="text-sm text-neutral-700 leading-relaxed border-b border-neutral-200 pb-3 last:border-0 last:pb-0">
              <strong class="text-neutral-900 block mb-0.5">[Variável/Ponto de Análise]</strong> [Explicação técnica profunda]
            </li>
          </ul>
        </div>
      </div>

      SETUP ATIVO:
      - Perfil: ${activeSetup.name}
      - Método: ${activeSetup.method.toUpperCase()}
      - Equipamento: ${activeSetup.machine} + ${activeSetup.grinder}
      - Acessórios: ${accessoriesString}
      
      DADOS TÉCNICOS:
      - Dose: ${extraction.dose}g | Rendimento: ${extraction.cupYield}g (Ratio 1:${ratio})
      - Moagem: ${extraction.clicks} cliques | Tempo: ${extraction.extractionTime}s
      
      PERCEPÇÃO SENSORIAL:
      - Acidez: ${extraction.sensory.acidity}
      - Amargor: ${extraction.sensory.bitterness}
      - Corpo: ${extraction.sensory.body}
    `;

    const formattedImageParts = (imageParts || []).map((part) => ({
      inlineData: {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      },
    }));

    const result = await model.generateContent([
      {text: textPrompt},
      ...formattedImageParts,
    ]);

    const response = await result.response;
    let text = response.text();

    text = text
      .replace(/```html/gi, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({analysis: text});
  } catch (error) {
    console.error("❌ Erro na API:", error);
    return NextResponse.json(
      {
        error: "Erro na análise da IA.",
        details: error instanceof Error ? error.message : String(error),
      },
      {status: 500},
    );
  }
};
