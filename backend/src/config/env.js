import dotenv from "dotenv";

dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
    pineconeApiKey: process.env.PINECONE_API_KEY?.trim(),
    pineconeIndexName: process.env.PINECONE_INDEX_NAME?.trim(),
    mongodbUri: process.env.MONGODB_URI?.trim(),
    mongodbDatabase: process.env.MONGODB_DB_NAME?.trim() || "rag-project",
    mongodbDirectHosts: process.env.MONGODB_DIRECT_HOSTS?.trim(),
    mongodbReplicaSet: process.env.MONGODB_REPLICA_SET?.trim(),
    jwtSecret: process.env.JWT_SECRET?.trim(),
};

/**
 * Validates that all required environment variables are present.
 */
export function validateEnv() {
    const missing = [];
    if (!config.geminiApiKey) missing.push("GEMINI_API_KEY");
    if (!config.pineconeApiKey) missing.push("PINECONE_API_KEY");
    if (!config.pineconeIndexName) missing.push("PINECONE_INDEX_NAME");
    if (!config.mongodbUri) missing.push("MONGODB_URI");
    if (!config.jwtSecret) missing.push("JWT_SECRET");

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variable(s): ${missing.join(", ")} in .env`
        );
    }
}
