import type { AppSettings } from './types';

export interface PersistSettingsResult {
    success: boolean;
    persisted: boolean;
    error?: string;
}

export async function persistSettings(
    settings: AppSettings,
    saveToStorage: (data: { settings: AppSettings }) => Promise<void> | void,
    sendToBackground: (message: { type: 'SAVE_SETTINGS'; settings: AppSettings }) => Promise<{ success: boolean } | undefined> | { success: boolean } | undefined
): Promise<PersistSettingsResult> {
    try {
        const response = await sendToBackground({ type: 'SAVE_SETTINGS', settings });
        if (response?.success) {
            await saveToStorage({ settings });
            return { success: true, persisted: true };
        }
    } catch {
        // fall through to storage fallback
    }

    try {
        await saveToStorage({ settings });
        return { success: true, persisted: true };
    } catch (error) {
        return {
            success: false,
            persisted: false,
            error: error instanceof Error ? error.message : 'Unknown error while saving settings'
        };
    }
}
