import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import chatRoutes from "./routes/chatRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { connectDatabase } from "./config/mongodb.js";
import { config, validateEnv } from "./config/env.js";

dotenv.config();
validateEnv();

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoutes);

// Base Health Check
app.get("/", (req, res) => {
    res.json({
        message: "RAG backend is running",
        version: "1.0.0",
    });
});

// API Routes
app.use("/api/chats", documentRoutes); // Mount document routes (handles POST /api/chats/:chatId/document)
app.use("/api/chats", chatRoutes);     // Mount chat routes (handles /api/chats, /:chatId, /messages, etc.)

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("[Server Error]", err);

    if (err.name === "MulterError") {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    const statusCode = err.status || 500;
    return res.status(statusCode).json({
        error: err.message || "Internal Server Error",
    });
});

const PORT = config.port || 5000;

connectDatabase()
    .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
    .catch((error) => {
        console.error("[MongoDB] Connection failed:", error.message);
        process.exitCode = 1;
    });