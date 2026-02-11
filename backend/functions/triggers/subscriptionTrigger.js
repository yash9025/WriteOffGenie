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

        // 1. Validation: Only process active, paid subscriptions
        if (!subData || subData.status !== 'active') return null;

        try {
            const planAmount = getPlanPrice(subData.planname);
            if (planAmount === 0) return null;

            // 2. Resolve Referral Code (Normalize to uppercase)
            const userDoc = await db.collection("user").doc(userId).get();
            const rawCode = userDoc.data()?.referral_code || subData.ref_code;
            if (!rawCode) return null;
            const refCode = String(rawCode).toUpperCase().trim();

            // 3. Find CPA Partner
            const cpaQuery = await db.collection("Partners")
                .where("referralCode", "==", refCode)
                .where("role", "==", "cpa")
                .limit(1).get();

            if (cpaQuery.empty) return null;

            const cpaDoc = cpaQuery.docs[0];
            const cpaData = cpaDoc.data();
            const batch = db.batch();

            // 4. Idempotency: Check if commission transaction already exists for this subscription
            const txnCheck = await db.collection("Transactions")
                .where("subId", "==", event.params.subscriptionId)
                .where("type", "==", "commission")
                .limit(1).get();
            if (!txnCheck.empty) {
                // Already processed, skip
                return null;
            }

            // 5. Calculate CPA Earnings
            const cpaRate = (cpaData.commissionRate || 10) / 100;
            const cpaCommission = planAmount * cpaRate;

            // Update CPA Stats & Wallet
            batch.update(cpaDoc.ref, {
                "stats.totalRevenue": admin.firestore.FieldValue.increment(planAmount),
                "stats.totalEarnings": admin.firestore.FieldValue.increment(cpaCommission),
                "stats.totalSubscribed": admin.firestore.FieldValue.increment(1),
                "walletBalance": admin.firestore.FieldValue.increment(cpaCommission),
                "updatedAt": admin.firestore.FieldValue.serverTimestamp()
            });

            // 6. AGENT LOGIC: Calculate Agent cut if CPA was referred by an Agent
            let agentCommission = 0;
            if (cpaData.referredBy) {
                const agentRef = db.collection("Partners").doc(cpaData.referredBy);
                const agentDoc = await agentRef.get();
                if (agentDoc.exists && agentDoc.data().role === 'agent') {
                    const agentData = agentDoc.data();
                    const agentRate = (agentData.commissionPercentage || 15) / 100;
                    const maintenance = Number(agentData.maintenanceCostPerUser || 6.00);
                    // Formula: AgentRate * [(Revenue - CPA_Paid) - Maintenance]
                    const netProfit = (planAmount - cpaCommission) - maintenance;
                    agentCommission = Math.max(0, netProfit * agentRate);
                    if (agentCommission > 0) {
                        batch.update(agentRef, {
                            "stats.totalEarnings": admin.firestore.FieldValue.increment(agentCommission),
                            "walletBalance": admin.firestore.FieldValue.increment(agentCommission),
                            "updatedAt": admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }

            // 7. Audit Trail: Log the specific commission transaction
            const txnRef = db.collection("Transactions").doc();
            batch.set(txnRef, {
                type: "commission",
                plan: subData.planname,
                amountPaid: planAmount,
                cpaId: cpaDoc.id,
                cpaEarnings: cpaCommission,
                agentId: cpaData.referredBy || null,
                agentEarnings: agentCommission,
                userId: userId,
                subId: event.params.subscriptionId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: "completed"
            });

            await batch.commit();
            console.log(`✅ Commission Sync: CPA +$${cpaCommission.toFixed(2)}, Agent +$${agentCommission.toFixed(2)}`);

        } catch (error) {
            console.error("❌ Commission Trigger Error:", error);
        }
    }
);

// Keep your existing User Creation Trigger below...
export const onUserCreatedTrigger = onDocumentCreated(
    "user/{userId}",
    async (event) => {
        const userData = event.data.data();
        const userId = event.params.userId;
        try {
            const referralCode = userData.referral_code;
            if (!referralCode) return;

            const cpaQuery = await db.collection("Partners")
                .where("referralCode", "==", String(referralCode).toUpperCase().trim())
                .limit(1).get();

            if (!cpaQuery.empty) {
                await cpaQuery.docs[0].ref.update({
                    "stats.totalReferred": admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error("❌ Error processing user creation:", error);
        }
    }
);