import bcrypt from "bcryptjs";
import { createToken } from "../middleware/auth.js";
import { createUser, findUserByEmail } from "../data/userStore.js";
import User from "../models/User.js";

const publicUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email });
const setAuthCookie = (res, token) => res.cookie("token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });

export async function register(req, res) {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: "Name, email, and password are required." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    if (await findUserByEmail(email.trim())) return res.status(409).json({ error: "An account with this email already exists." });
    const user = await createUser({ name: name.trim(), email: email.trim(), passwordHash: await bcrypt.hash(password, 12) });
    setAuthCookie(res, createToken(user));
    return res.status(201).json({ user: publicUser(user) });
}

export async function login(req, res) {
    const { email, password } = req.body;
    const user = email ? await findUserByEmail(email.trim()) : null;
    if (!user || !await bcrypt.compare(password || "", user.passwordHash)) return res.status(401).json({ error: "Invalid email or password." });
    setAuthCookie(res, createToken(user));
    return res.json({ user: publicUser(user) });
}

export function logout(req, res) { res.clearCookie("token"); return res.json({ success: true }); }

export async function currentUser(req, res) {
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(401).json({ error: "User account no longer exists." });
    return res.json({ user: publicUser(user) });
}