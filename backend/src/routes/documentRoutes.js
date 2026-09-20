import express from "express";
import { upload } from "../middleware/upload.js";
import { uploadDocument } from "../controllers/documentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// POST /api/chats/:chatId/document
router.post("/:chatId/document", upload.single("file"), uploadDocument);

export default router;
