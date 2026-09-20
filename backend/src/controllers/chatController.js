import crypto from "crypto";
import { queryRAG } from "../rag/query.js";
import { getPineconeIndex } from "../config/pinecone.js";
import {
    getAllChats,
    getChat,
    createChat as createStoredChat,
    updateChat,
    deleteChatFromStore,
} from "../data/chatStore.js";

/**
 * POST /api/chats
 * Creates a new chat session.
 */
export async function createChat(req, res) {
    const chat = await createStoredChat(req.user.sub);
    return res.status(201).json({
        chatId: chat.id,
    });
}

/**
 * GET /api/chats
 * Lists all active chats for sidebar navigation.
 */
export async function getChats(req, res) {
    const chatList = (await getAllChats(req.user.sub)).map((chat) => ({
        id: chat.id,
        title: chat.title,
        document: chat.document,
        messageCount: chat.messages ? chat.messages.length : 0,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
    }));

    // Sort newest first
    chatList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return res.json({
        chats: chatList,
    });
}

/**
 * GET /api/chats/:chatId
 * Returns full details of a specific chat session.
 */
export async function getChatById(req, res) {
    const { chatId } = req.params;
    const chat = await getChat(chatId, req.user.sub);
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    return res.json(chat);
}

/**
 * POST /api/chats/:chatId/messages
 * Submits a question, runs RAG retrieval + LLM synthesis, and stores message history.
 */
export async function askQuestion(req, res) {
    try {
        const { chatId } = req.params;
        const { question } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({ error: "A valid question is required." });
        }

        const chat = await getChat(chatId, req.user.sub);
        if (!chat) return res.status(404).json({ error: "Chat not found." });

        if (!chat.document) {
            return res.status(400).json({
                error: "No document has been uploaded for this chat yet. Please upload a PDF first.",
            });
        }

        // 1. Add user message
        const userMsg = {
            id: crypto.randomUUID(),
            role: "user",
            content: question.trim(),
            timestamp: new Date().toISOString(),
        };
        chat.messages = chat.messages || [];
        chat.messages.push(userMsg);

        // 2. Query RAG pipeline
        const result = await queryRAG(question.trim(), chatId);

        // 3. Add AI message
        const assistantMsg = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.answer,
            sources: result.sources,
            timestamp: new Date().toISOString(),
        };
        chat.messages.push(assistantMsg);

        chat.updatedAt = new Date().toISOString();
        await updateChat(chatId, req.user.sub, { messages: chat.messages, updatedAt: chat.updatedAt });

        return res.json({
            answer: result.answer,
            sources: result.sources,
        });
    } catch (error) {
        console.error("[Chat Controller] Error processing message:", error);
        return res.status(500).json({
            error: error.message || "An unexpected error occurred while processing your question.",
        });
    }
}

/**
 * PATCH /api/chats/:chatId
 * Renames a chat title.
 */
export async function renameChat(req, res) {
    const { chatId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: "Title is required." });
    }

    const chat = await updateChat(chatId, req.user.sub, { title: title.trim(), updatedAt: new Date().toISOString() });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    return res.json({
        success: true,
        chat,
    });
}

/**
 * DELETE /api/chats/:chatId
 * Deletes a chat and cleans up its stored Pinecone vectors.
 */
export async function deleteChat(req, res) {
    const { chatId } = req.params;

    const deleted = await deleteChatFromStore(chatId, req.user.sub);
    if (!deleted) return res.status(404).json({ error: "Chat not found." });

    // Try deleting vectors in Pinecone for this chat
    try {
        const index = getPineconeIndex();
        await index.deleteMany({
            chatId: {
                $eq: chatId,
            },
        });
    } catch (pineconeErr) {
        console.warn(`[Delete Chat] Note: Could not delete Pinecone vectors for ${chatId}:`, pineconeErr.message);
    }

    return res.json({
        success: true,
        message: `Chat ${chatId} deleted successfully.`,
    });
}
