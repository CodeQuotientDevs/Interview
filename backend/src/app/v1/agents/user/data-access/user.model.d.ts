
import type mongoose  from "mongoose";

type SingleUserModel = {
    id: mongoose.Types.ObjectId,
    isActive: boolean,
    email: string,
    phone: string,
    name: string,
}

type UserModel = mongoose.Model<SingleUserModel>