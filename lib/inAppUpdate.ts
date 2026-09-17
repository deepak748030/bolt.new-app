import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { defaultStoreUrl, openStoreListing } from './storeLinks';

// Re-export the platform-agnostic helpers so callers can keep importing
// everything from '@/lib/inAppUpdate' on every platform.
export { defaultStoreUrl, openStoreListing } from './storeLinks';

function isExpoGo() {
    return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
}

/**
 * Starts Google Play In-App Updates inside the installed Android app.
 * Immediate = full-screen Play overlay (force). Flexible = download then install.
 * Returns true if Play accepted the update flow. Falls back to store URL otherwise.
 *
 * NOTE: this file is the native (iOS/Android) implementation. On web, Metro
 * resolves `inAppUpdate.web.ts` instead, which never imports the native
 * `sp-react-native-in-app-updates` module (it has no web build).
 */
export async function startInAppUpdate(opts: {
    immediate?: boolean;
    storeUrl?: string;
    openStoreFallback?: boolean;
} = {}): Promise<boolean> {
    const { immediate = false, storeUrl, openStoreFallback = false } = opts;

    if (Platform.OS === 'android' && !isExpoGo()) {
        try {
            // Native Play Core module — present only in a store/dev-client build.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mod = require('sp-react-native-in-app-updates') as any;
            const SpInAppUpdates = mod.default;
            const { IAUUpdateKind, IAUInstallStatus } = mod;
            const client = new SpInAppUpdates(false);
            const result = await client.checkNeedsUpdate({
                curVersion: Constants.expoConfig?.version || '1.0.0',
            });
            if (result?.shouldUpdate) {
                if (!immediate && typeof client.addStatusUpdateListener === 'function') {
                    client.addStatusUpdateListener((status: any) => {
                        const code = status?.status;
                        if (code === IAUInstallStatus?.DOWNLOADED || code === 11) {
                            try { client.installUpdate(); } catch { /* ignore */ }
                        }
                    });
                }
                await client.startUpdate({
                    updateType: immediate ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE,
                });
                return true;
            }
            return false;
        } catch {
            /* Play Core unavailable (dev / unsigned / emulator) */
        }
    }

    if (openStoreFallback) return openStoreListing(storeUrl);
    return false;
}
