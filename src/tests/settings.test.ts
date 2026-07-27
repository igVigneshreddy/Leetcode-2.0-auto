import { describe, it, expect } from 'vitest';
import { persistSettings } from '../core/settings';
import type { AppSettings } from '../core/types';

describe('persistSettings', () => {
    it('persists settings even when background messaging fails', async () => {
        const saved: Array<{ settings: AppSettings }> = [];
        const settings: AppSettings = {
            openRouterApiKey: 'test-key',
            pushMethod: 'local-git',
            githubToken: '',
            githubRepo: '',
            githubPath: ''
        };

        const result = await persistSettings(
            settings,
            async (data) => {
                saved.push(data as { settings: AppSettings });
            },
            async () => {
                throw new Error('background unavailable');
            }
        );

        expect(result.success).toBe(true);
        expect(result.persisted).toBe(true);
        expect(saved).toHaveLength(1);
        expect(saved[0].settings.openRouterApiKey).toBe('test-key');
    });
});
