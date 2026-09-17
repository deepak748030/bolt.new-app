// Web implementation of the in-app update module.
//
// `sp-react-native-in-app-updates` is a native (Play Core) module with no web
// build, so importing it here would break web bundling. Metro picks this
// `.web.ts` file over `inAppUpdate.ts` when bundling for web.

import { openStoreListing } from './storeLinks';

export { defaultStoreUrl, openStoreListing } from './storeLinks';

/**
 * Google Play In-App Updates only exists inside the native Android app.
 * On web there is no in-app update flow, so we simply fall back to opening
 * the store listing when requested (e.g. from the /update-required screen).
 */
export async function startInAppUpdate(opts: {
    immediate?: boolean;
    storeUrl?: string;
    openStoreFallback?: boolean;
} = {}): Promise<boolean> {
    const { storeUrl, openStoreFallback = false } = opts;
    if (openStoreFallback) return openStoreListing(storeUrl);
    return false;
}
