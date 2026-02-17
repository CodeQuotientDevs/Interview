import { roleNumberFromString } from "@root/constants"
import { ObjectId } from "mongoose";

type Content = {
    orgId?: string | ObjectId,
    createdBy?: string | ObjectId,
    sharedIds?: string[] | ObjectId[]
}

export function checkPermissionForContentModification(content: Content, session: Session) {
    // if (parseInt(session.role) === parseInt(roleNumberFromString.admin)) {
    //     return true;
    // }
    // if (parseInt(session.role) === parseInt(roleNumberFromString.subAdmin)) {
    //     return content.orgId?.toString() === session.orgId;
    // }
    return content.createdBy?.toString() != session.userId?.toString();
}

export function checkForSharedAccess(content: Content, session: Session) {
    if (session.userId) {
        return content.sharedIds?.map(id => String(id)).includes(session.userId?.toString());
    }
    return false;
}
