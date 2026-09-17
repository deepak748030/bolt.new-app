import type { PolicySection } from '@/components/PolicyScreen';

export const APP_NAME = 'Tractor Wala';
export const SUPPORT_EMAIL = 'support@tractorwala.in';
export const POLICY_UPDATED = 'September 2026';

/* ----------------------------- Privacy Policy ----------------------------- */

export const privacySections: PolicySection[] = [
    { title: '1. Introduction', body: `${APP_NAME} ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our tractor auction and bidding application. By using the app, you consent to the practices described in this policy.` },
    { title: '2. Information We Collect', body: 'We collect your mobile number (+91) for account creation and OTP verification, your name, email, and city from the profile section, KYC documents where required by law, bidding activity, order history, wallet transactions, and device information used to keep your account secure.' },
    { title: '3. How We Use Your Information', body: 'Your information is used to authenticate logins, place and track bids, process wallet deposits and payouts, deliver winning auction items, send important alerts about outbids, auction endings and orders, and to comply with Indian financial and tax regulations.' },
    { title: '4. Bidding & Auction Data', body: 'Bid amounts, timestamps, and auction outcomes are recorded to maintain a fair marketplace. Winning bids may be visible to the seller and to other participants of that auction. Your phone number is never shared publicly.' },
    { title: '5. Payments & Wallet', body: 'Wallet deposits, refunds, and settlements are processed through licensed Indian payment gateways (such as Cashfree). We do not store your full card or UPI credentials on our servers.' },
    { title: '6. Data Sharing', body: `We do not sell your personal data. Information is shared only with verified sellers for order fulfilment, with payment partners for transactions, and with government authorities when legally required.` },
    { title: '7. Data Security', body: 'All traffic is encrypted in transit. OTP-based authentication, server-side validation, and access controls protect your account. You are responsible for keeping your device and OTP confidential.' },
    { title: '8. Data Retention', body: 'Account and transaction data is retained as long as your account is active and for the period required by Indian tax and consumer protection laws. You may request deletion of your account at any time through Help & Support.' },
    { title: '9. Your Rights', body: 'You may access, correct, or update your profile information from the Edit Profile screen. You can also withdraw consent or request account deletion by contacting our support team.' },
    { title: '10. Children', body: `${APP_NAME} is intended for users aged 18 and above. We do not knowingly collect data from minors.` },
    { title: '11. Changes to This Policy', body: 'We may update this policy from time to time. Significant changes will be notified via in-app notification.' },
    { title: '12. Contact Us', body: `For any privacy related queries, reach us via the Help & Support section or email ${SUPPORT_EMAIL}.` },
];

/* -------------------------- Terms & Conditions ---------------------------- */

export const termsSections: PolicySection[] = [
    { title: '1. Acceptance of Terms', body: `By accessing or using ${APP_NAME}, you agree to be bound by these Terms & Conditions and all applicable laws of India. If you do not agree with any part of these terms, please do not use the application.` },
    { title: '2. Eligibility', body: 'You must be at least 18 years old and a resident of India to create an account. By registering, you confirm that all information you provide is true, accurate and complete.' },
    { title: '3. Account & OTP Security', body: 'Your account is tied to your mobile number. You are solely responsible for maintaining the confidentiality of your OTPs and device. Any activity performed from your account is deemed to be performed by you.' },
    { title: '4. Dealer Registration & KYC', body: 'Certain features require registration as a verified dealer. You agree to provide valid KYC documents (such as PAN, Aadhaar or GST) and consent to verification. Providing false documents may lead to account suspension and legal action.' },
    { title: '5. Auctions & Bidding Rules', body: 'Auctions follow a fixed start and end time displayed on each listing. A bid once placed is binding and cannot be retracted. The highest valid bid at the time of auction close wins, subject to the seller accepting the sale. We may cancel an auction in case of technical errors, suspected fraud or seller non-confirmation.' },
    { title: '6. Security Deposit & Wallet', body: 'Participating in auctions may require a refundable security deposit or wallet balance as shown on the listing. Deposits are refunded as per the Refund Policy. Wallet balance has no expiry and can be used to bid or withdrawn subject to verification.' },
    { title: '7. Fees & Charges', body: 'Any platform fees, winning commissions or convenience charges applicable to a transaction will be shown to you before you confirm payment. By completing a payment you agree to pay all such charges.' },
    { title: '8. Tractor Condition & Verification', body: `${APP_NAME} provides a platform for dealers and buyers. The inspection report and RC details shown on a listing are based on information provided by the seller. Buyers are encouraged to verify the tractor physically before completing delivery/payment of the sale amount.` },
    { title: '9. Intellectual Property', body: 'The app, its branding, design and content are owned by us or our licensors. You may not copy, modify or commercially exploit them without written permission.' },
    { title: '10. Prohibited Conduct', body: 'You agree not to engage in fraudulent bidding, collusion, bid rigging, use of automated bots, abuse of promotions, or any activity that harms other users or the platform.' },
    { title: '11. Limitation of Liability', body: `To the maximum extent permitted by law, ${APP_NAME} shall not be liable for indirect or consequential losses arising from use of the platform. Our total liability in respect of any claim shall not exceed the fees paid by you in the concerned transaction.` },
    { title: '12. Force Majeure', body: 'We are not liable for delays or failure of performance caused by events beyond our reasonable control, including natural disasters, government actions, network outages or payment gateway failures.' },
    { title: '13. Governing Law & Dispute Resolution', body: 'These terms are governed by the laws of India. Disputes shall first be attempted to be resolved through our support team; failing which they shall be subject to the exclusive jurisdiction of the courts of Madhya Pradesh.' },
    { title: '14. Contact Us', body: `For questions about these Terms & Conditions, contact us at ${SUPPORT_EMAIL}.` },
];

/* ------------------------------ Return Policy ----------------------------- */

export const returnSections: PolicySection[] = [
    { title: '1. Overview', body: `This Return Policy applies to physical tractor units and spare parts purchased by a winning bidder on ${APP_NAME}. All returns are subject to the conditions below.` },
    { title: '2. No Returns After Delivery Acceptance', body: 'Once you have physically inspected and accepted delivery of a tractor or part (by signing the delivery acknowledgement), the sale is treated as final and no return is accepted, except for genuine manufacturing defects notified within the warranty period agreed with the seller.' },
    { title: '3. Returns Before Delivery', body: 'If you wish to cancel a won auction before delivery is arranged, you may do so by contacting support within 24 hours of winning. The winning bid amount (if already paid) will be refunded as per the Refund Policy. The security deposit is processed separately as per auction rules.' },
    { title: '4. Incorrect / Damaged Item', body: 'If the delivered tractor or part does not match the listed make, model, year or RC details shown at the time of bidding, or arrives damaged due to transit, you may raise a return request within 48 hours of delivery with supporting photos and the delivery note.' },
    { title: '5. How to Raise a Return', body: 'Open Help & Support in the app, or email support@tractorwala.in, quoting your Order ID and the reason for return. Our team will verify the claim with the seller and share the resolution within 3-5 working days.' },
    { title: '6. Return of Refundable Security Deposit', body: 'The refundable security deposit is not a payment for the item. It is returned after the auction cycle completes and any dues/pending payments are settled, as described in the Refund Policy.' },
    { title: '7. Non-Returnable Items', body: 'Digital services, already-consumed services, items damaged by misuse, altered/hours-clocked tractors, and items returned after the stated timelines are non-returnable.' },
    { title: '8. Contact Us', body: `For return-related queries, reach out via Help & Support or email ${SUPPORT_EMAIL}.` },
];

/* ------------------------------ Refund Policy ----------------------------- */

export const refundSections: PolicySection[] = [
    { title: '1. Overview', body: `All refunds on ${APP_NAME} (security deposits, winning bid payments, wallet balances or convenience fees) are processed to the same source / bank account from which the payment was made, after due verification.` },
    { title: '2. Refundable Security Deposit', body: 'If you do not win an auction, or the auction is cancelled by us/seller, your security deposit is refunded in full. If you win and complete the purchase, the deposit is adjusted/returned as per the listing terms within 3-5 working days of settlement.' },
    { title: '3. Winning Amount Refunds', body: 'A winning amount is refunded only when: the seller cancels the sale without your fault, the tractor is found to materially differ from its listing (verified by our team), or a valid return is accepted under the Return Policy.' },
    { title: '4. Forfeiture of Deposit', body: 'The security deposit may be forfeited (partially or fully) if the winning bidder fails to complete the purchase without a valid reason, abandons delivery, or engages in fraudulent bidding. You will be informed in writing before any forfeiture.' },
    { title: '5. Wallet Balance Refunds', body: 'Wallet balances that were never used for bidding can be withdrawn to your linked bank account after KYC verification. Processing time is 3-5 working days once approved.' },
    { title: '6. Refund Timelines & Method', body: 'Approved refunds are initiated within 3-5 working days. UPI/card refunds reflect as per your bank (usually 1-7 days); bank-transfer refunds usually take 3-5 working days. Cashfree/gateway charges already deducted at the time of payment are not refundable.' },
    { title: '7. How to Request a Refund', body: 'Go to Help & Support in the app or email support@tractorwala.in with your order/transaction ID. Refunds are never processed outside the app on requests over phone calls, SMS or social media.' },
    { title: '8. Contact Us', body: `For refund status or disputes, email ${SUPPORT_EMAIL} with your transaction reference.` },
];

/* ----------------------------- Shopping Policy ---------------------------- */

export const shoppingSections: PolicySection[] = [
    { title: '1. Overview', body: `This Shopping Policy explains how buying works on ${APP_NAME} — from placing a bid to delivery and payment of a won tractor or part.` },
    { title: '2. Browsing & Bidding', body: 'Listings show tractor details, RC/registration info, inspection reports, auction timing and seller details. Bids can be placed only by registered, KYC-verified dealer accounts. Each new bid must be higher than the current bid by at least the defined increment.' },
    { title: '3. Winning an Auction', body: 'When the auction timer ends with your bid as the highest valid bid, you will be notified and the order moves to the payment/deposit stage. The sale is confirmed only after the seller confirms and the buyer completes the required payment.' },
    { title: '4. Payment & Wallet', body: 'Payments are collected securely via licensed Indian payment gateways. You may use wallet balance (from refundable deposits) for part payments where allowed on the listing.' },
    { title: '5. Delivery & Logistics', body: 'Delivery timelines, transport charges and responsibility of loading/unloading are agreed between the buyer and seller at the time of order confirmation. We may facilitate logistics but are not the carrier.' },
    { title: '6. Price Transparency', body: 'The final payable amount = winning bid amount + applicable taxes + delivery/transport charges + any platform convenience fee shown at checkout. No hidden charges are added after payment.' },
    { title: '7. GST & Invoices', body: 'An invoice/receipt is generated for every paid order. Tax invoices, where applicable, are issued by the seller/dealer. You are responsible for providing correct GST details at the time of purchase.' },
    { title: '8. Order Support', body: `For help with an order, use the Orders tab in the app or reach us at ${SUPPORT_EMAIL}. We are available Monday-Saturday, 9 AM - 7 PM IST.` },
];
