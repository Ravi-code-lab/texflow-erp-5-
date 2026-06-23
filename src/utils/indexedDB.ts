export async function exportAllDataToZip(): Promise<void> {}
export async function restoreDataFromZip(file: File): Promise<void> {}
export async function clearAllDataFlag(): Promise<void> {}

export async function getItem<T>(key: string): Promise<T | null> {
    return null;
}

export async function setItem<T>(key: string, value: T): Promise<void> {}

