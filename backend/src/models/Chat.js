import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema({ page: Number, fileName: String }, { _id: false });
const messageSchema = new mongoose.Schema({
    id: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    sources: { type: [sourceSchema], default: undefined },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New Chat", trim: true },
    messages: { type: [messageSchema], default: [] },
}, { timestamps: true });

chatSchema.index({ userId: 1, updatedAt: -1 });
export default mongoose.models.Chat || mongoose.model("Chat", chatSchema);