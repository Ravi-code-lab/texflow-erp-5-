export type DocField = {
    fieldname: string;
    fieldtype: string;
    label: string;
    required?: boolean;
    options?: any;
    linkTo?: string;
};

export type DocTypeSchema = {
    id: string;
    name: string;
    module: string;
    view?: string;
    namingSeries?: any;
    statuses?: any;
    statusField?: string;
    fields: DocField[];
};

export const DOCTYPE_SCHEMAS: DocTypeSchema[] = [];

export function saveCustomDocTypeSchema(schema: DocTypeSchema) {
    DOCTYPE_SCHEMAS.push(schema);
}

export function getDocTypeSchema(type: string) {
    return DOCTYPE_SCHEMAS.find(s => s.id === type || s.name === type) || null;
}
