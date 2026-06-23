export type ERPModuleGroupId = string;
export const ERP_MODULE_ITEMS: any[] = [];
export const ERP_MODULE_GROUPS: any[] = [];
export const MODULE_COLOR_MAP: Record<string, { bg: string; text: string; border?: string; borderDark?: string }> = {};

export function getViewTitle(view: string): string {
    return view;
}

export function getERPModuleByView(view: string) {
    return null;
}
