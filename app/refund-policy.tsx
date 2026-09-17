import React from 'react';
import PolicyScreen from '@/components/PolicyScreen';
import { refundSections, POLICY_UPDATED } from '@/lib/policyContent';
import { RotateCcw } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export default function RefundPolicyScreen() {
    return (
        <PolicyScreen
            title="Refund Policy"
            icon={<RotateCcw size={16} color={colors.primaryDark} />}
            introText="Fast & fair refunds"
            updated={POLICY_UPDATED}
            sections={refundSections}
        />
    );
}
