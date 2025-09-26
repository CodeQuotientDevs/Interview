import type mongoose from "mongoose"

type User = {
    id: mongoose.Types.ObjectId,
    userId: String | undefined,
    name: String,
    email: String,
    password: String,
    loginType: Number,
}

type UserModel = mongoose.Model<User>