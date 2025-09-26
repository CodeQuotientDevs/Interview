const constants = require('@/constants');

function checkPermissionForContentModification(content, session) {
    if (session.role === constants.roleNumberFromString.admin) {
        return true;
    }
    if (session.role === constants.roleNumberFromString.subAdmin) {
        return content.orgId?.toString() === session.orgId;
    }
    return content.createdBy?.toString() === session.userId;
}

module.exports = {
    checkPermissionForContentModification,
}