import mongoose from "mongoose";

if (!process.env.MONGO_CONNECTION_URI) {
    throw new Error("Mongo Connection String Not Provided");
}

mongoose.connect(process.env.MONGO_CONNECTION_URI);