import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { https } from 'firebase-functions';
import { db } from '../firebaseConfig.js';

/**
 * 2.1 CA Management: Lock/Unlock Account
 * Allows admin to toggle a Partner's account status between active and inactive.
 */
export const toggleCAStatus = async (data, context) => {
    // Security: Check if caller is Admin
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Admin access only.');
    }

    const { targetUserId, action } = data; // action: 'suspend' or 'activate'
    const isDisabled = action === 'suspend';

    try {
        // 1. Auth Level Lock (Prevents Login immediately)
        await getAuth().updateUser(targetUserId, { disabled: isDisabled });

        // 2. Database Level Lock (Visual Status)
        await db.collection("Partners").doc(targetUserId).update({
            // Uses 'inactive' status for suspended accounts
            status: isDisabled ? 'inactive' : 'active',
            adminNote: `Account marked ${isDisabled ? 'inactive' : 'active'} by Admin on ${new Date().toISOString()}`
        });

        return { success: true };
    } catch (error) {
        console.error("Toggle Status Error:", error);
        throw new https.HttpsError('internal', 'Action failed.');
    }
};

/**
 * 2.4 Withdrawal Management: Approve/Reject Payouts
 * Handles the approval (with transaction reference) or rejection (with refund) of payouts.
 */
export const processWithdrawal = async (data, context) => {
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Admin access only.');
    }

    const { payoutId, decision, rejectionReason, transactionRef } = data;

    if (!payoutId || !['approve', 'reject'].includes(decision)) {
        throw new https.HttpsError('invalid-argument', 'Invalid parameters.');
    }

    const payoutRef = db.collection("Payouts").doc(payoutId);

    try {
        await db.runTransaction(async (t) => {
            const payoutDoc = await t.get(payoutRef);
            if (!payoutDoc.exists) {
                throw new https.HttpsError('not-found', 'Payout not found.');
            }

            const payoutData = payoutDoc.data();
            if (payoutData.status !== 'pending') {
                throw new https.HttpsError('failed-precondition', 'Payout already processed.');
            }

            const partnerRef = db.collection("Partners").doc(payoutData.partner_id);

            if (decision === 'approve') {
                // Validation: Transaction ID is required for approval
                if (!transactionRef) {
                    throw new https.HttpsError('invalid-argument', 'Bank Transaction ID (UTR) is required.');
                }

                // Approve: Mark as paid and save the Reference ID
                t.update(payoutRef, {
                    status: 'paid',
                    transactionRef: transactionRef,
                    processedAt: FieldValue.serverTimestamp(),
                    processedBy: context.auth.uid
                });
                // Note: Funds were already deducted from wallet when the request was made.
            } else {
                // Reject: Refund the money back to the partner's wallet
                t.update(payoutRef, {
                    status: 'rejected',
                    rejectionReason: rejectionReason || "Admin rejected request",
                    processedAt: FieldValue.serverTimestamp(),
                    processedBy: context.auth.uid
                });

                t.update(partnerRef, {
                    walletBalance: FieldValue.increment(payoutData.amount),
                    "stats.totalWithdrawn": FieldValue.increment(-payoutData.amount) // Revert total withdrawn stat
                });
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Process Withdrawal Error:", error);
        throw new https.HttpsError('internal', error.message);
    }
};