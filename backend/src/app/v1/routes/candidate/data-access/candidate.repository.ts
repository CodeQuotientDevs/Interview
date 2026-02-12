import Candidate from "../domain/candidate.service";
import type { CandidateModel } from "./candidate.model";
import type { QueryOptions, ClientSession } from "mongoose";
import mongoose from "mongoose";

export default class InterviewCandidate {
    model: CandidateModel;

    constructor(model: CandidateModel) {
        this.model = model;
    }

    async findOne(
        findObj: Record<string, any>,
        projection?: any | null,
        options: QueryOptions = {}
    ): Promise<any | null> {
        (options as any).lean = true;
        return this.model.findOne(findObj as any, projection as any, options as any);
    }

    async find(
        findObj: Record<string, any>,
        projection?: mongoose.ProjectionType<Partial<Candidate>> | null,
        options: QueryOptions = {}
    ): Promise<any[]> {
        options.lean = true;
        return this.model.find(findObj as any, projection as any, options as any);
    }

    async create(objToSave: Partial<Candidate>, session?: ClientSession): Promise<any> {
        const doc = new this.model(objToSave as any);
        return doc.save({ session } as any);
    }

    async updateOne(
        findObj: Record<string, any>,
        objToUpdate: Partial<Candidate>,
        options: QueryOptions = {}
    ): Promise<any | null> {
        (options as any).lean = true;
        (options as any).new = true;
        return this.model.findOneAndUpdate(findObj as any, objToUpdate as any, options as any).exec();
    }

    async countDocuments(findObj: Record<string, any>): Promise<number> {
        return this.model.countDocuments(findObj as any).exec();
    }

    async aggregate(pipeline: any[], options: any = {}): Promise<any[]> {
        return this.model.aggregate(pipeline).option(options).exec();
    }
}
