export function prepareDocumentCreate(item: any, user: string) {
    const defaultItem = { 
        ...item, 
        createdAt: new Date().toISOString(), 
        createdBy: user, 
        id: item.id || Date.now().toString() 
    };
    return defaultItem;
}

export function prepareDocumentUpdate(item: any, previous: any, user: string) {
    return { ...item, updatedAt: new Date().toISOString(), updatedBy: user };
}

export function prepareDocumentDelete(item: any, user?: string) {
    return { ...item, deleted: true, deletedBy: user, deletedAt: new Date().toISOString() };
}

export function createAuditLog(
    entityType: string,
    entityId: string,
    action: string,
    previousState: any,
    newState: any,
    user: string
) {
    return {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        entityType,
        entityId,
        action,
        previousState,
        newState,
        user
    };
}
