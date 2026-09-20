import Chat from "../models/Chat.js";
import Document from "../models/Document.js";

function serializeChat(chat, document = null) {
    if (!chat) return null;
    return { id: chat._id.toString(), title: chat.title, messages: chat.messages || [], document, createdAt: chat.createdAt, updatedAt: chat.updatedAt };
}

export async function createChat(userId) {
    const chat = await Chat.create({ userId });
    return serializeChat(chat.toObject());
}

export async function getChat(chatId, userId) {
    const chat = await Chat.findOne({ _id: chatId, userId }).lean();
    if (!chat) return null;
    const document = await Document.findOne({ chatId: chat._id, userId }).select("-_id -chatId -userId").lean();
    return serializeChat(chat, document);
}

export async function getAllChats(userId) {
    const [chats, documents] = await Promise.all([
        Chat.find({ userId }).sort({ updatedAt: -1 }).lean(),
        Document.find({ userId }).lean(),
    ]);
    const documentsByChat = new Map(documents.map((document) => [document.chatId.toString(), document]));
    return chats.map((chat) => serializeChat(chat, documentsByChat.get(chat._id.toString()) || null));
}

export async function updateChat(chatId, userId, update) {
    const chat = await Chat.findOneAndUpdate({ _id: chatId, userId }, { $set: update }, { new: true }).lean();
    if (!chat) return null;
    const document = await Document.findOne({ chatId: chat._id, userId }).select("-_id -chatId -userId").lean();
    return serializeChat(chat, document);
}

export async function deleteChatFromStore(chatId, userId) {
    const result = await Chat.deleteOne({ _id: chatId, userId });
    if (result.deletedCount) await Document.deleteOne({ chatId, userId });
    return result.deletedCount > 0;
}

export async function saveDocument(document) {
    await Document.findOneAndUpdate({ chatId: document.chatId, userId: document.userId }, document, { upsert: true, new: true, runValidators: true });
}