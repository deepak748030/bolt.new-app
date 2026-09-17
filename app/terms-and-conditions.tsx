import React from 'react';
import PolicyScreen from '@/components/PolicyScreen';
import { termsSections, POLICY_UPDATED } from '@/lib/policyContent';
import { ScrollText } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export default function TermsAndConditionsScreen() {
    return (
        <PolicyScreen
            title="Terms & Conditions"
            icon={<ScrollText size={16} color={colors.primaryDark} />}
            introText="Please read these terms carefully before using the app"
            updated={POLICY_UPDATED}
            sections={termsSections}
        />
    );
}
