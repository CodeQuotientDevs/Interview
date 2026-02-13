import mongoose from 'mongoose';
import logger from "@libs/logger";
import { InterviewModel, Interview } from './interview.model';

export default class InterviewRepository {
    model: InterviewModel;

    constructor(model: InterviewModel) {
        this.model = model;
    }

    private async findOneAndUpdate(
        obj: Record<string, any>,
        updateOperation: mongoose.UpdateQuery<Interview>
    ): Promise<any> {
        return this.model.findOneAndUpdate(obj, updateOperation, { new: true });
    }


    async findById(
        id: string,
        projection?: mongoose.ProjectionType<Partial<Interview>>
    ): Promise<any> {
        return this.model.findOne({ id, isActive: true }, projection, { lean: true });
    }

    async find(
        findObj: Record<string, any>,
        projection?: mongoose.ProjectionType<Partial<Interview>> | null,
        options: mongoose.QueryOptions = {}
    ): Promise<any[]> {
        options.lean = true;
        return this.model.find(findObj, projection as any, options);
    }

    async findOne(
        findObj: Record<string, any>,
        projection?: mongoose.ProjectionType<Partial<Interview>> | null,
        options: mongoose.QueryOptions = {}
    ): Promise<any | null> {
        options.lean = true;
        return this.model.findOne(findObj, projection as any, options);
    }

    async create(
        objToSave: Partial<Interview>,
        session: { userId: string; orgId: string }
    ): Promise<any> {
        objToSave.createdBy = session.userId;
        objToSave.orgId = new mongoose.Types.ObjectId(session.orgId);
        return new this.model(objToSave).save();
    }

    async update(
        id: string,
        updateObj: Partial<Interview>,
        session: { userId: string; orgId: string }
    ): Promise<any | null> {
        const previousInterview = await this.findOneAndUpdate(
            {
                id,
                isActive: true,
            },
            {
                $set: {
                    isActive: false,
                },
            }
        );

        if (!previousInterview) {
            return null;
        }

        try {
            updateObj.id = previousInterview.id;
            delete (updateObj as Partial<Interview>).versionId;
            updateObj.createdBy = session.userId;
            updateObj.orgId = previousInterview.orgId;
            return new this.model(updateObj).save();
        } catch (error) {
            this.findOneAndUpdate(
                {
                    id: previousInterview.id,
                    versionId: previousInterview.versionId,
                },
                {
                    $set: {
                        isActive: true,
                    },
                }
            ).catch((err) => {
                logger.error({
                    message: `Error while fallback update in interview please do it manually`,
                    id: previousInterview.id,
                    versionId: previousInterview.versionId,
                    error: err,
                });
            });
            return undefined;
        }
    }

    async delete(
        id: string,
        session: { userId: string; orgId: string }
    ): Promise<any | null> {
        return this.findOneAndUpdate(
            {
                id,
                isActive: true,
            },
            {
                $set: {
                    deletedBy: session.userId,
                    deletedAt: new Date(),
                },
            }
        );
    }
}
