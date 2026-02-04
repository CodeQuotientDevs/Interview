import mongoose from "mongoose";

export const connectMongo = async () => {
    const connectionString = process.env.MONGO_CONNECTION_URI;

    if (!connectionString) {
        throw new Error("Mongo Connection String Not Provided");
    }

    await mongoose.connect(connectionString);
};
