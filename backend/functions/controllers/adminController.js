import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { https } from 'firebase-functions';
import { db } from '../firebaseConfig.js';


export const toggleCAStatus = async (data, context) => {
    // Security: Check if caller is Admin
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Admin access only.');
    }

    const { targetUserId, action } = data; 
    
    const isDisabled = action === 'inactive' || action === 'suspend';

    try {
        // 1. Auth Level Lock (Prevents Login immediately)
        // isDisabled = true prevents the user from logging in via Firebase Auth
        await getAuth().updateUser(targetUserId, { disabled: isDisabled });

        // 2. Database Level Lock (Visual Status)
        await db.collection("Partners").doc(targetUserId).update({
            status: isDisabled ? 'inactive' : 'active',
            adminNote: `Account marked ${isDisabled ? 'inactive' : 'active'} by Admin on ${new Date().toISOString()}`
        });

        return { success: true };
    } catch (error) {
        console.error("Toggle Status Error:", error);
        throw new https.HttpsError('internal', 'Action failed.');
    }
};

export const processWithdrawal = async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Admin access only.');
    }

    const { payoutId, decision, rejectionReason } = data;

    // 2. Validate Input
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
                // Approve: Update stats (money actually leaves system)
                t.update(partnerRef, {
                    "stats.totalWithdrawn": FieldValue.increment(payoutData.amount)
                });

                t.update(payoutRef, {
                    status: 'paid',
                    processedAt: FieldValue.serverTimestamp(),
                    processedBy: context.auth.uid
                });

            } else {
                // Reject: Refund amount back to wallet
                t.update(partnerRef, {
                    walletBalance: FieldValue.increment(payoutData.amount)
                });

                t.update(payoutRef, {
                    status: 'rejected',
                    rejectionReason: rejectionReason || "Admin rejected request",
                    processedAt: FieldValue.serverTimestamp(),
                    processedBy: context.auth.uid
                });
            }
        });

        return { success: true };

    } catch (error) {
        console.error("Process Withdrawal Error:", error);
        // Re-throw specific Firebase errors to client
        if (error.code && error.details) throw error;
        throw new https.HttpsError('internal', error.message);
    }
};

// Update Partner Commission Rate
export const updateCommissionRate = async (data, context) => {
    // 1. Auth Check
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Admin access only.');
    }

    const { partnerId, commissionRate } = data;

    // 2. Validate Input
    if (!partnerId) {
        throw new https.HttpsError('invalid-argument', 'Partner ID is required.');
    }

    const rate = Number(commissionRate);
    if (isNaN(rate) || rate < 1 || rate > 100) {
        throw new https.HttpsError('invalid-argument', 'Commission rate must be between 1 and 100.');
    }

    try {
        const partnerRef = db.collection("Partners").doc(partnerId);
        const partnerDoc = await partnerRef.get();

        if (!partnerDoc.exists) {
            throw new https.HttpsError('not-found', 'Partner not found.');
        }

        await partnerRef.update({
            commissionRate: rate,
            commissionUpdatedAt: FieldValue.serverTimestamp(),
            commissionUpdatedBy: context.auth.uid
        });

        return { success: true, newRate: rate };

    } catch (error) {
        console.error("Update Commission Rate Error:", error);
        if (error.code && error.details) throw error;
        throw new https.HttpsError('internal', error.message);
    }
};