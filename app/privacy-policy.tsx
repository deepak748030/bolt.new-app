import React from 'react';
import PolicyScreen from '@/components/PolicyScreen';
import { privacySections, POLICY_UPDATED } from '@/lib/policyContent';
import { Shield } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export default function PrivacyPolicyScreen() {
    return (
        <PolicyScreen
            title="Privacy Policy"
            icon={<Shield size={16} color={colors.primaryDark} />}
            introText="Your privacy matters to us"
            updated={POLICY_UPDATED}
            sections={privacySections}
        />
    );
}
