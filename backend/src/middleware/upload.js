import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${uniqueSuffix}-${safeName}`);
    },
});

const fileFilter = (req, file, cb) => {
    const isPdfExt = path.extname(file.originalname).toLowerCase() === ".pdf";
    const isPdfMime = file.mimetype === "application/pdf" || file.mimetype === "application/x-pdf";

    if (isPdfExt && (isPdfMime || !file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed!"), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 30 * 1024 * 1024, // 30 MB max
    },
});
