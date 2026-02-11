import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "firebase-admin";

const db = admin.firestore();

const PLAN_PRICES = {
    'writeoffgenie-premium-month': 25.00,
    'com.writeoffgenie.premium.monthly': 25.00,
    'writeoffgenie-pro-month': 15.00,
    'com.writeoffgenie.pro.monthly': 15.00,
    'writeoffgenie-premium-year': 239.99,
    'com.writeoffgenie.premium.yearly': 239.99,
    'writeoffgenie-pro-year': 143.99,
    'com.writeoffgenie.pro.yearly': 143.99,
};

const getPlanPrice = (planname) => PLAN_PRICES[planname] || 0;

export const handleSubscriptionEarnings = onDocumentCreated(
    "user/{userId}/subscription/{subscriptionId}",
    async (event) => {
        const subData = event.data.data();
        const userId = event.params.userId;
        const subId = event.params.subscriptionId;

        if (!subData || subData.status !== 'active') return;

        try {
            // 1. IDEMPOTENCY CHECK (Prevents Overwrites & Double Counting)
            const txnRef = db.collection("Transactions").doc(subId);
            const txnCheck = await txnRef.get();
            
            if (txnCheck.exists) {
                console.log(`⚠️ Transaction ${subId} already processed. Skipping.`);
                return;
            }

            const planAmount = getPlanPrice(subData.planname);
            if (planAmount === 0) return;

            // 2. Get User & Referrer
            const userRef = db.collection("user").doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            const rawCode = userData?.referral_code || subData.ref_code;
            
            if (!rawCode) return;
            const refCode = String(rawCode).toUpperCase().trim();

            // 3. Find CPA Partner
            const cpaQuery = await db.collection("Partners")
                .where("referralCode", "==", refCode)
                .where("role", "==", "cpa")
                .limit(1).get();

            if (cpaQuery.empty) return;

            const cpaDoc = cpaQuery.docs[0];
            const cpaData = cpaDoc.data();
            
            // 4. Calculate CPA Earnings (Fix Decimals)
            const cpaRate = (cpaData.commissionRate || 10) / 100;
            const cpaCommission = Number((planAmount * cpaRate).toFixed(2));

            // 5. Find Agent & Calculate (Fix Decimals)
            let agentId = null;
            let agentCommission = 0;
            let agentRef = null;

            if (cpaData.referredBy) {
                agentRef = db.collection("Partners").doc(cpaData.referredBy);
                const agentDoc = await agentRef.get();
                if (agentDoc.exists && agentDoc.data().role === 'agent') {
                    const agentData = agentDoc.data();
                    agentId = agentDoc.id;
                    
                    const agentRate = (agentData.commissionPercentage || 15) / 100;
                    const maintenance = Number(agentData.maintenanceCostPerUser || 6.00);
                    
                    const netProfit = (planAmount - cpaCommission) - maintenance;
                    agentCommission = Math.max(0, Number((netProfit * agentRate).toFixed(2)));
                } else {
                    agentRef = null; // Valid ID but not an agent role
                }
            }

            // 6. ATOMIC BATCH WRITE (The Safety Lock)
            const batch = db.batch();

            // A. Create Transaction (Ledger)
            batch.set(txnRef, {
                type: "commission",
                status: "completed",
                plan: subData.planname || "unknown",
                amountPaid: planAmount,
                cpaId: cpaDoc.id,
                cpaEarnings: cpaCommission,
                agentId: agentId, // Will be null if no agent
                agentEarnings: agentCommission,
                userId: userId,
                subId: subId,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // B. Update CPA Wallet/Stats
            batch.update(cpaDoc.ref, {
                "stats.totalRevenue": admin.firestore.FieldValue.increment(planAmount),
                "stats.totalEarnings": admin.firestore.FieldValue.increment(cpaCommission),
                "stats.totalReferred": admin.firestore.FieldValue.increment(1),
                "walletBalance": admin.firestore.FieldValue.increment(cpaCommission),
                "updatedAt": admin.firestore.FieldValue.serverTimestamp()
            });

            // C. Update Agent Wallet/Stats (if exists)
            if (agentRef && agentId) {
                batch.update(agentRef, {
                    "stats.totalRevenue": admin.firestore.FieldValue.increment(planAmount),
                    "stats.totalEarnings": admin.firestore.FieldValue.increment(agentCommission),
                    "stats.activeSubscriptions": admin.firestore.FieldValue.increment(1),
                    "walletBalance": admin.firestore.FieldValue.increment(agentCommission),
                    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // D. Update User Status
            batch.update(userRef, {
                subscription_status: "active",
                last_payment: admin.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            console.log(`✅ Commission processed for ${subId}: CPA $${cpaCommission}, Agent $${agentCommission}`);

        } catch (error) {
            console.error("❌ Commission Trigger Error:", error);
        }
    }
);

export const onUserCreatedTrigger = onDocumentCreated(
    "user/{userId}",
    async (event) => {
        const userData = event.data.data();
        if (!userData || !userData.referral_code) return;

        try {
            const refCode = String(userData.referral_code).toUpperCase().trim();
            const cpaQuery = await db.collection("Partners")
                .where("referralCode", "==", refCode)
                .limit(1).get();

            if (!cpaQuery.empty) {
                await cpaQuery.docs[0].ref.update({
                    "stats.totalSignups": admin.firestore.FieldValue.increment(1),
                    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error("❌ Error processing user creation:", error);
        }
    }
);