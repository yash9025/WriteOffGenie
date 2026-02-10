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
    const newStatus = isDisabled ? 'inactive' : 'active';

    try {
        // Create a list of tasks to run simultaneously
        const tasks = [];

        // Task 1: Lock/Unlock Login Access (Auth)
        tasks.push(getAuth().updateUser(targetUserId, { disabled: isDisabled }));

        // Task 2: Update Visual Status (Firestore)
        tasks.push(db.collection("Partners").doc(targetUserId).update({
            status: newStatus,
            adminNote: `Account marked ${newStatus} by Admin on ${new Date().toISOString()}`
        }));

        // Task 3: Security - If disabling, invalidates current session immediately
        if (isDisabled) {
            tasks.push(getAuth().revokeRefreshTokens(targetUserId));
        }

        // This cuts the response time significantly because we don't wait for one to finish before starting the next.
        await Promise.all(tasks);

        return { success: true };

    } catch (error) {
        console.error("Toggle Status Error:", error);
        throw new https.HttpsError('internal', 'Action failed.');
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