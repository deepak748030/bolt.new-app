import React from 'react';
import PolicyScreen from '@/components/PolicyScreen';
import { shoppingSections, POLICY_UPDATED } from '@/lib/policyContent';
import { ShoppingBag } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export default function ShoppingPolicyScreen() {
    return (
        <PolicyScreen
            title="Shopping Policy"
            icon={<ShoppingBag size={16} color={colors.primaryDark} />}
            introText="How buying on Tractor Wala works"
            updated={POLICY_UPDATED}
            sections={shoppingSections}
        />
    );
}
