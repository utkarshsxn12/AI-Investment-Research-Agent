import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

let currentKeyIndex = 0;

export function getLLM(temperature = 0) {
  const geminiKeys: string[] = [
    process.env.GEMINI_API_KEY || "",
    process.env.GEMINI_API_KEY_2 || "",
    process.env.GEMINI_API_KEY_3 || "",
  ].filter((key) => key.trim() !== "");

  if (process.env.OPENAI_API_KEY && geminiKeys.length === 0) {
    const isOpenRouter = process.env.OPENAI_API_KEY.startsWith("sk-or-v1-");
    return new ChatOpenAI({
      model: isOpenRouter ? "google/gemini-2.5-flash" : "gpt-4o-mini",
      temperature,
      apiKey: process.env.OPENAI_API_KEY,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: isOpenRouter ? 1200 : undefined,
      configuration: isOpenRouter ? {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": "http://localhost:3000", "X-Title": "Altuni Research Agent" },
      } : undefined,
      maxRetries: 5,
    });
  }

  const activeKeyIndex = currentKeyIndex % (geminiKeys.length || 1);
  const activeKey = geminiKeys[activeKeyIndex] || "";
  currentKeyIndex++;

  if (activeKey.startsWith("sk-or-v1-")) {
    return new ChatOpenAI({
      model: "google/gemini-2.5-flash",
      temperature,
      apiKey: activeKey,
      openAIApiKey: activeKey,
      maxTokens: 1200,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": "http://localhost:3000", "X-Title": "Altuni Research Agent" },
      },
      maxRetries: 5,
    });
  }

  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature,
    apiKey: activeKey,
    maxRetries: 5,
  });
}
