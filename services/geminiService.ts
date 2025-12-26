
import { GoogleGenAI } from "@google/genai";
import { ProductionLog, Item, DefectType, WorkOrder } from "../types";

export const getProductionInsight = async (
  logs: ProductionLog[], 
  items: Item[], 
  defectTypes: DefectType[],
  orders: WorkOrder[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const context = `
    You are a manufacturing expert analyzer. Analyze these production logs and defect data:
    Items: ${JSON.stringify(items)}
    Defect Types: ${JSON.stringify(defectTypes)}
    Recent Logs: ${JSON.stringify(logs.slice(-10))}
    Active Orders: ${JSON.stringify(orders)}
    
    IMPORTANT: You must respond in Korean (한국어). 
    Provide a professional analysis for the factory manager.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "제공된 생산 데이터를 바탕으로, 현재 생산 현황의 건강도를 3문장으로 요약하고 개선 방안 1가지를 제안해줘.",
      config: {
        systemInstruction: context,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "생산 데이터를 분석하는 중 오류가 발생했습니다.";
  }
};
