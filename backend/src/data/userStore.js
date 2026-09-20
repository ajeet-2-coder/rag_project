import User from "../models/User.js";

export function findUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
}

export function createUser(user) {
    return User.create({ ...user, email: user.email.toLowerCase() });
}