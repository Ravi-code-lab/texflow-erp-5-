export function uuidShort(length: number = 7) {
    return Math.random().toString(36).substring(2, 2 + length).padEnd(length, '0');
}

export function generateUUID() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
}

export function uuid() {
    return generateUUID();
}

