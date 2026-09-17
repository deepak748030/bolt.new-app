import Constants from 'expo-constants';

export const getBundleId = () => (
    Constants.expoConfig?.android?.package
    || Constants.expoConfig?.ios?.bundleIdentifier
    || 'com.tractorwala.application'
);

export const getVersion = () => Constants.expoConfig?.version || '1.0.0';

export default {
    getBundleId,
    getVersion,
};
