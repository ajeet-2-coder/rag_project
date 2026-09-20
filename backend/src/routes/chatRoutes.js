import express from "express";
import {
    createChat,
    getChats,
    getChatById,
    askQuestion,
    renameChat,
    deleteChat,
} from "../controllers/chatController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", createChat);
router.get("/", getChats);
router.get("/:chatId", getChatById);
router.post("/:chatId/messages", askQuestion);
router.patch("/:chatId", renameChat);
router.delete("/:chatId", deleteChat);

export default router;
