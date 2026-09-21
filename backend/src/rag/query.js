import { retrieveContext } from "../services/retrievalService.js";
import { generateAnswer } from "../services/llmService.js";

/**
 * End-to-end RAG query orchestrator.
 * 
 * Flow:
 * 1. Takes user question & chatId
 * 2. Retrieves top 5 matching chunks from Pinecone filtered by chatId
 * 3. Formats chunks as context
 * 4. Sends grounded prompt to Gemini LLM
 * 5. Returns answer + source citations
 * 
 * @param {string} question - User question
 * @param {string} chatId - Isolated chat ID
 * @returns {Promise<{ answer: string, sources: Array<{ fileName: string, page: number, text: string }> }>}
 */
export async function queryRAG(question, chatId, documentPages = null) {
    if (!question || !question.trim()) {
        throw new Error("Question cannot be empty.");
    }
    if (!chatId) {
        throw new Error("chatId is required.");
    }

    console.log(`[RAG Query] Searching for context in chat "${chatId}" for query: "${question}"`);

    // 1. Retrieve top matching chunks
    const { context, sources } = await retrieveContext(question, chatId, 5, documentPages);

    console.log(`[RAG Query] Retrieved ${sources.length} matching chunks from Pinecone.`);

    // 2. Generate grounded answer
    const answer = await generateAnswer(question, context);

    return {
        answer,
        sources: sources.map((s) => ({
            fileName: s.fileName,
            page: s.page,
            text: s.text,
        })),
    };
}
