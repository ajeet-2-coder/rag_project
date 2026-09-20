import mongoose from "mongoose";
import { config } from "./env.js";

function getConnectionUri() {
    if (!config.mongodbDirectHosts) return config.mongodbUri;

    const atlasUri = new URL(config.mongodbUri);
    const credentials = `${atlasUri.username}:${atlasUri.password}@`;
    const replicaSet = config.mongodbReplicaSet ? `&replicaSet=${encodeURIComponent(config.mongodbReplicaSet)}` : "";
    return `mongodb://${credentials}${config.mongodbDirectHosts}/?tls=true&authSource=admin${replicaSet}`;
}

export async function connectDatabase() {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    await mongoose.connect(getConnectionUri(), { dbName: config.mongodbDatabase, serverSelectionTimeoutMS: 10000 });
    console.log(`[MongoDB] Connected to database "${config.mongodbDatabase}"`);
    return mongoose.connection;
}

export async function closeDatabase() {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}