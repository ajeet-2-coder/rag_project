import dotenv from "dotenv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";

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

    const chunkedDocs =
        await textSplitter.splitDocuments(rawDocs);

    console.log("Chunks:", chunkedDocs.length);


    // ==========================================
    // 3. GEMINI EMBEDDINGS
    // ==========================================

    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-embedding-001",
        outputDimensionality: 1024,
    });


    // ==========================================
    // 4. CONNECT TO PINECONE
    // ==========================================

    const pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });

    const pineconeIndex = pinecone.Index(
        process.env.PINECONE_INDEX_NAME
    );


    // ==========================================
    // 5. EMBED + STORE EACH CHUNK
    // ==========================================

    for (let i = 0; i < chunkedDocs.length; i++) {

        const doc = chunkedDocs[i];

        console.log(
            `Processing chunk ${i + 1}/${chunkedDocs.length}`
        );


        // Generate embedding
        const vector =
            await embeddings.embedDocuments([
                doc.pageContent
            ]);

        const values = vector[0];


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
