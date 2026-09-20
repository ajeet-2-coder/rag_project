import { indexDocument } from "../rag/ingest.js";
import { getChat, updateChat, saveDocument } from "../data/chatStore.js";

/**
 * POST /api/chats/:chatId/document
 * Ingests a single PDF file for the specified chat session.
 * Enforces the rule: Exactly ONE PDF per chat.
 */
export async function uploadDocument(req, res) {
    try {
        const { chatId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: "No PDF file was provided." });
        }

        const chat = await getChat(chatId, req.user.sub);
        if (!chat) return res.status(404).json({ error: "Chat not found." });

        // Enforce: Each chat must be associated with exactly one PDF
        if (chat.document) {
            return res.status(400).json({
                error: `This chat already has a document ("${chat.document.fileName}"). Each chat can only have exactly one PDF. Please create a new chat to upload a different PDF.`,
            });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;

        console.log(`[Document Controller] Starting ingestion of "${fileName}" for chat "${chatId}"...`);

        // Index document into Pinecone using Gemini embeddings
        const result = await indexDocument(filePath, chatId, fileName);

        // Store document metadata on the chat session
        const document = {
            chatId,
            userId: req.user.sub,
            fileName,
            pages: result.pages,
            chunks: result.chunks,
            uploadedAt: new Date().toISOString(),
        };

        // Automatically set chat title to the file name
        await saveDocument(document);
        await updateChat(chatId, req.user.sub, { title: chat.title === "New Chat" ? fileName : chat.title, updatedAt: new Date().toISOString() });

        return res.status(200).json({
            success: true,
            document: {
                chatId,
                fileName,
                pages: result.pages,
                chunks: result.chunks,
            },
        });
    } catch (error) {
        console.error("[Document Controller] Ingestion failed:", error);
        return res.status(500).json({
            error: error.message || "Failed to process and index the PDF document.",
        });
    }
}
