import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function createToken(user) {
    return jwt.sign({ sub: user._id.toString(), email: user.email, name: user.name }, config.jwtSecret, { expiresIn: "7d" });
}

export function requireAuth(req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Authentication is required." });
    try {
        req.user = jwt.verify(token, config.jwtSecret);
        return next();
    } catch {
        return res.status(401).json({ error: "Your session has expired. Please log in again." });
    }
}