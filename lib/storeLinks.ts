import { Linking, Platform } from 'react-native';

const ANDROID_PACKAGE = 'com.tractorwala.application';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export function defaultStoreUrl(platform: typeof Platform.OS = Platform.OS) {
    if (platform === 'ios') return '';
    return PLAY_STORE_URL;
}

export async function openStoreListing(storeUrl?: string) {
    const url = storeUrl || defaultStoreUrl();
    if (!url) return false;
    try {
        await Linking.openURL(url);
        return true;
    } catch {
        return false;
    }
}
