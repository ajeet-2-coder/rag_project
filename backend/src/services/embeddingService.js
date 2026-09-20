import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { config, validateEnv } from "../config/env.js";
import { fileURLToPath } from "url";
import path from "path";

validateEnv();

/**
 * Shared GoogleGenerativeAIEmbeddings instance configured for gemini-embedding-001
 * with a fixed 1024 output dimensionality to match the Pinecone index.
 */
export const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: config.geminiApiKey,
    model: "gemini-embedding-001",
    outputDimensionality: 1024,
});

/**
 * Generates an embedding vector for a single string (e.g. user question or single chunk).
 * 
 * @param {string} text - The text string to embed
 * @returns {Promise<number[]>} - 1024-dimensional floating point vector
 */
export async function generateEmbedding(text) {
    if (!text || typeof text !== "string" || text.trim() === "") {
        throw new Error("Text must be a non-empty string to generate an embedding.");
    }

    // embedQuery is LangChain's standard method for embedding a single text string
    const vector = await embeddings.embedQuery(text);
    return vector;
}

/**
 * Generates embedding vectors for multiple strings in a batch.
 * 
 * @param {string[]} texts - Array of text strings to embed
 * @returns {Promise<number[][]>} - Array of 1024-dimensional vectors
 */
export async function generateBatchEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error("Texts must be a non-empty array of strings.");
    }

    const vectors = await embeddings.embedDocuments(texts);
    return vectors;
}

// Standalone execution for Phase 3 testing:
// node src/services/embeddingService.js "Your test text here"
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const sampleQuery = process.argv[2] || "What is dynamic programming and memoization?";

    console.log(`[Embedding Test] Input text: "${sampleQuery}"`);
    console.log("[Embedding Test] Requesting embedding from Gemini (gemini-embedding-001)...");

    const startTime = Date.now();
    generateEmbedding(sampleQuery)
        .then((vector) => {
            const elapsed = Date.now() - startTime;
            console.log(`[Embedding Test] Success! Generated in ${elapsed}ms`);
            console.log(`[Embedding Test] Vector dimension: ${vector.length}`);
            console.log(`[Embedding Test] First 5 values:`, vector.slice(0, 5));
            console.log(`[Embedding Test] Last 5 values:`, vector.slice(-5));
        })
        .catch((err) => {
            console.error("[Embedding Test] Failed:", err);
            process.exit(1);
        });
}
