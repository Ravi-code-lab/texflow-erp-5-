export function createERPDocument(doctypeName: string, data: any, context?: any) {
    return { ...data, doctype: doctypeName, ...context };
}
