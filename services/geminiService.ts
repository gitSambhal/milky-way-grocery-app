
import { GoogleGenAI } from "@google/genai";
import { MilkRecord, AppSettings } from "../types";

const getSystemPrompt = (currency: string, unit: string) => `
You are a smart assistant for a milk/grocery tracking app. 
Analyze the provided JSON data of milk purchases and payments.
Provide a concise, friendly summary in markdown.
Focus on:
1. Total spending vs Total payments made.
2. Current balance (if they owe money or have credit).
3. Average daily consumption.
4. Any interesting patterns (e.g., "You tend to buy more on weekends").
5. A customized tip for saving money.

The currency is ${currency} and unit is ${unit}.
Keep the tone helpful and encouraging. 
Do not output JSON, output readable Markdown.
`;

export const analyzeData = async (records: MilkRecord[], settings: AppSettings): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key is missing. Please set the environment variable.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Sort records by date for better context
    const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Filter to last 90 days
    const recentRecords = sortedRecords.slice(-90);
    
    const dataStr = JSON.stringify(recentRecords.map(r => ({
      date: r.date,
      qty: r.quantity,
      cost: r.quantity * r.pricePerUnit,
      paidAmount: r.paymentAmount || 0
    })));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Here is my milk purchase history and payment log:\n${dataStr}\n\nPlease analyze this.`,
      config: {
        systemInstruction: getSystemPrompt(settings.currencySymbol, settings.unitLabel),
      }
    });

    return response.text || "Could not generate insights at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error while analyzing your data. Please try again later.";
  }
};
