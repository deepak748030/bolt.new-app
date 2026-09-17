import React from 'react';
import PolicyScreen from '@/components/PolicyScreen';
import { returnSections, POLICY_UPDATED } from '@/lib/policyContent';
import { PackageOpen } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export default function ReturnPolicyScreen() {
    return (
        <PolicyScreen
            title="Return Policy"
            icon={<PackageOpen size={16} color={colors.primaryDark} />}
            introText="Easy & transparent returns"
            updated={POLICY_UPDATED}
            sections={returnSections}
        />
    );
}
