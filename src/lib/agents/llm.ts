import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

export function getLLM(temperature = 0) {
  // If OpenAI key is present and Gemini key is not, or if OpenAI is preferred:
  if (process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    console.log("Using OpenAI model: gpt-4o-mini");
    return new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Fallback to Google Gemini (which is free/default for this project)
  const geminiKey = process.env.GEMINI_API_KEY || "";
  console.log("Using Google Gemini model: gemini-2.5-flash");
  return new ChatGoogleGenerativeAI({
    modelName: "gemini-2.5-flash",
    temperature,
    apiKey: geminiKey,
  });
}
