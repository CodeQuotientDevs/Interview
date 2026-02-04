import { MongoClient } from "mongodb";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";


const client = new MongoClient(process.env.MONGO_CONNECTION_URI ?? "");

export const checkPointer = new MongoDBSaver({
    client: client,
    dbName: "chat-checkpoint",
})
