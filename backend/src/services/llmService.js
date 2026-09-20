import { GoogleGenAI } from "@google/genai";
import { config, validateEnv } from "../config/env.js";

validateEnv();

const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
});

/**
 * Generates a grounded answer using Gemini LLM based strictly on retrieved context.
 * 
 * @param {string} question - The user's question
 * @param {string} context - The retrieved document chunks text
 * @returns {Promise<string>} - Grounded answer text
 */
export async function generateAnswer(question, context) {
    if (!question || !question.trim()) {
        throw new Error("Question is required for answer generation.");
    }

    if (!context || !context.trim()) {
        return "I could not find any relevant information in the uploaded document to answer this question.";
    }

    const isOverviewQuestion = /\b(what is|what's|about|overview|summari[sz]e|summary|main idea|key point|purpose|topic|subject|conclusion|conclusions)\b/i.test(question);
    const systemInstruction = `You are an AI assistant that answers questions based on the provided document context.
Rules:
- Answer using the provided context.
- Do not invent information that is not supported by the context.
- If the answer cannot be found in the context, clearly say that the information was not found in the uploaded document.
- ${isOverviewQuestion ? "For broad overview questions, synthesize the document's subject, purpose, and main points across all provided passages." : "For specific questions, answer directly from the most relevant passages."}
- Give a concise but useful explanation.
- Do not mention the retrieval system unless necessary.`;

    const prompt = `Context:
${context}

Question:
${question}

Answer:`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2, // Low temperature for high factual adherence to context
            },
        });

        return response.text ? response.text.trim() : "No answer generated.";
    } catch (error) {
        console.error("[LLM Service] Error generating response:", error);
        throw new Error(`Failed to generate answer from Gemini: ${error.message}`);
    }
}
