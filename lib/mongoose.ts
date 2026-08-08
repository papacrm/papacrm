import mongoose from "mongoose";

import 'dotenv/config'

(await import("node:dns/promises")).setServers(["1.1.1.1", "8.8.8.8"]);

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
}

// Module-level cache (survives hot reload in dev, avoids re-connecting on
// every request/procedure call).
let cached = (global as any).mongoose as {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
