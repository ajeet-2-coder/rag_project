import dotenv from "dotenv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Pinecone } from "@pinecone-database/pinecone";
import { generateBatchEmbeddings } from "../services/embeddingService.js";

dotenv.config();

export async function indexDocument(
    filePath,
    chatId,
    fileName
) {

    // ==========================================
    // 1. LOAD PDF
    // ==========================================

    const loader = new PDFLoader(filePath);

    const rawDocs = await loader.load();

    console.log("PDF pages:", rawDocs.length);


    // ==========================================
    // 2. SPLIT PDF INTO CHUNKS
    // ==========================================

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const chunkedDocs = (await textSplitter.splitDocuments(rawDocs))
        .filter((doc) => doc.pageContent && doc.pageContent.trim());

    if (chunkedDocs.length === 0) {
        throw new Error("The PDF does not contain extractable text.");
    }

    console.log("Chunks:", chunkedDocs.length);


    // ==========================================
    // 3. CONNECT TO PINECONE
    // ==========================================

    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });

    const pineconeIndex = pinecone.Index(
        process.env.PINECONE_INDEX_NAME
    );

    // A failed or repeated upload can leave old vectors under this chat ID.
    // Remove them before indexing so retrieval cannot mix different PDFs.
    await pineconeIndex.deleteMany({
        chatId: {
            $eq: chatId,
        },
    });


    // ==========================================
    // 4. EMBED + STORE EACH CHUNK
    // ==========================================

    const vectors = [];
    const embeddingBatchSize = 32;
    for (let start = 0; start < chunkedDocs.length; start += embeddingBatchSize) {
        const batch = chunkedDocs.slice(start, start + embeddingBatchSize);
        vectors.push(...await generateBatchEmbeddings(batch.map((doc) => doc.pageContent)));
    }

    if (vectors.length !== chunkedDocs.length || vectors.some((vector) => vector.length !== 1024)) {
        const dimensions = vectors.map((vector) => vector.length);
        throw new Error(`Embedding generation failed: expected ${chunkedDocs.length} vectors of dimension 1024, received ${vectors.length} vectors with dimensions [${dimensions.join(", ")}].`);
    }

    for (let i = 0; i < chunkedDocs.length; i++) {

        const doc = chunkedDocs[i];

        console.log(
            `Processing chunk ${i + 1}/${chunkedDocs.length}`
        );


        const values = vectors[i];


        console.log(
            `Vector dimension: ${values.length}`
        );


        // ======================================
        // STORE IN PINECONE
        // ======================================

        await pineconeIndex.upsert([
            {
                id: `${chatId}-${i}`,

                values: values,

                metadata: {
                    text: doc.pageContent,

                    page:
                        doc.metadata?.loc?.pageNumber ||
                        null,

                    chatId: chatId,

                    fileName: fileName,
                    chunkIndex: i,

                    totalChunks: chunkedDocs.length,
                },
            }
        ]);
    }


    console.log(
        `Successfully indexed ${fileName}`
    );


    return {
        pages: rawDocs.length,
        chunks: chunkedDocs.length,
        chatId,
        fileName
    };
}
