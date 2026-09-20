import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    fileName: { type: String, required: true },
    pages: { type: Number, required: true },
    chunks: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

documentSchema.index({ userId: 1, chatId: 1 }, { unique: true });
export default mongoose.models.Document || mongoose.model("Document", documentSchema);