
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCaption = async (imagePrompt?: string, context?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a social media manager. Write a short, engaging Telegram post based on this context: ${context || 'General update'}. ${imagePrompt ? 'The post is accompanied by an image showing: ' + imagePrompt : ''}. Use emojis, keep it professional yet friendly. Response should be only the text for the post.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

export const analyzeImageAndSuggest = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        { text: "Analyze this image and suggest a catchy Telegram post caption. Make it brief and punchy." }
      ],
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return null;
  }
};
