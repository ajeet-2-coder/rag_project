import { getPineconeIndex } from "../config/pinecone.js";
import { generateEmbedding } from "./embeddingService.js";

/**
 * Retrieves the most relevant chunks from Pinecone strictly filtered by chatId.
 * 
 * @param {string} question - The user's natural language question
 * @param {string} chatId - Unique chat session ID for vector isolation
 * @param {number} topK - Number of top similar chunks to retrieve (default: 5)
 * @returns {Promise<{ context: string, sources: Array<{ fileName: string, page: number, text: string, score: number }> }>}
 */
export async function retrieveContext(question, chatId, topK = 5) {
    if (!question || !question.trim()) {
        throw new Error("Question cannot be empty for retrieval.");
    }
    if (!chatId) {
        throw new Error("chatId is required for isolated document retrieval.");
    }

    const normalizedQuestion = question.trim().toLowerCase();
    const overviewQuestion = /\b(what is|what's|about|overview|summari[sz]e|summary|main idea|key point|purpose|topic|subject|conclusion|conclusions)\b/.test(normalizedQuestion);

    // 1. Generate query embedding vector (1024-dim)
    const queryVector = await generateEmbedding(question.trim());

    // 2. Query Pinecone with strict chatId filter
    const index = getPineconeIndex();
    const chatFilter = { chatId: { $eq: chatId } };
    const queryMatches = async (limit, extraFilter = {}) => {
        const result = await index.query({
            vector: queryVector,
            topK: limit,
            includeMetadata: true,
            filter: { ...chatFilter, ...extraFilter },
        });
        return result.matches || [];
    };

    const semanticMatches = await queryMatches(overviewQuestion ? 8 : topK);
    let matches = semanticMatches;

    // Broad questions often need the abstract/introduction and conclusion,
    // which may not be among the nearest chunks to the exact query wording.
    if (overviewQuestion && semanticMatches.length > 0) {
        const totalChunks = Number(semanticMatches[0].metadata?.totalChunks || 0);
        const openingMatches = await queryMatches(4, { chunkIndex: { $lte: 3 } });
        const endingMatches = totalChunks > 0
            ? await queryMatches(4, { chunkIndex: { $gte: Math.max(0, totalChunks - 4) } })
            : [];
        matches = [...semanticMatches, ...openingMatches, ...endingMatches];
    }

    const uniqueMatches = Array.from(new Map(matches.map((match) => [match.id, match])).values());

    // 3. Extract source items
    const sources = uniqueMatches
        .filter((match) => match.metadata && match.metadata.text)
        .map((match) => ({
            fileName: match.metadata.fileName || "document.pdf",
            page: match.metadata.page || 1,
            text: match.metadata.text,
            score: match.score || 0,
        }));

    // 4. Build consolidated context string for the LLM
    const context = sources
        .map((src, i) => `[Chunk ${i + 1} | File: ${src.fileName} | Page: ${src.page}]:\n${src.text}`)
        .join("\n\n---\n\n");

    return {
        context,
        sources,
    };
}
