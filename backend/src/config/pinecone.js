import { Pinecone } from "@pinecone-database/pinecone";
import { config, validateEnv } from "./env.js";

validateEnv();

let pineconeInstance = null;

/**
 * Returns a cached Pinecone client instance.
 */
export function getPineconeClient() {
    if (!pineconeInstance) {
        pineconeInstance = new Pinecone({
            apiKey: config.pineconeApiKey,
        });
    }
    return pineconeInstance;
}

/**
 * Returns the target Pinecone Index instance.
 */
export function getPineconeIndex() {
    const pc = getPineconeClient();
    return pc.Index(config.pineconeIndexName);
}
