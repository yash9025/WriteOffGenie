import { onDocumentCreated } from "firebase-functions/v2/firestore";
import admin from "firebase-admin";

const db = admin.firestore();

// Pricing lookup table
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

/**
 * TRIGGER: When a new subscription document is created in user/{userId}/subscription
 * This handles:
 * - Initial subscription purchases
 * - Monthly/yearly renewals (each renewal = new document = new commission)
 */
export const onSubscriptionCreatedTrigger = onDocumentCreated(
    "user/{userId}/subscription/{subscriptionId}",
    async (event) => {
        const subscriptionData = event.data.data();
        const userId = event.params.userId;
        
        console.log(`🔔 New subscription created for user ${userId}:`, subscriptionData);

        try {
            // Get user document to find referral_code
            const userDoc = await db.collection("user").doc(userId).get();
            if (!userDoc.exists) {
                console.log(`❌ User ${userId} not found`);
                return;
            }

            const userData = userDoc.data();
            const referralCode = userData.referral_code || subscriptionData.ref_code;

            if (!referralCode) {
                console.log(`⚠️ No referral code for user ${userId} - Free user, no commission`);
                return;
            }

            // Find CPA by referral code
            const cpaQuery = await db.collection("Partners")
                .where("referralCode", "==", referralCode)
                .where("role", "==", "cpa")
                .limit(1)
                .get();

            if (cpaQuery.empty) {
                console.log(`⚠️ No CPA found with referral code: ${referralCode}`);
                return;
            }

            const cpaDoc = cpaQuery.docs[0];
            const cpaId = cpaDoc.id;
            const cpaData = cpaDoc.data();
            
            // Calculate plan price and CPA commission
            const planAmount = getPlanPrice(subscriptionData.planname);
            if (planAmount === 0) {
                console.log(`⚠️ Unknown plan: ${subscriptionData.planname}`);
                return;
            }

            const cpaCommissionRate = (cpaData.commissionRate || 10) / 100;
            const cpaCommission = planAmount * cpaCommissionRate;

            console.log(`💰 Processing: Plan=${subscriptionData.planname}, Amount=$${planAmount}, CPA Commission=$${cpaCommission}`);

            // Update CPA stats
            await db.collection("Partners").doc(cpaId).update({
                "stats.totalRevenue": admin.firestore.FieldValue.increment(planAmount),
                "stats.totalEarnings": admin.firestore.FieldValue.increment(cpaCommission),
                "stats.totalSubscribed": admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Updated CPA ${cpaData.displayName || cpaData.name}: +$${planAmount} revenue, +$${cpaCommission} earnings`);

            // NOTE: Agent commission is calculated dynamically in the frontend
            // using the formula: agentCommission = (commissionPercentage%) * [(totalRevenue - totalCPACommissions) - (activeSubscriptions * maintenanceCost)]
            // No need to update agent stats here - it's calculated on-the-fly from their CPAs' data

            return { success: true };

        } catch (error) {
            console.error("❌ Error processing subscription:", error);
            // Don't throw - we don't want to block subscription creation
            return { error: error.message };
        }
    }
);

/**
 * TRIGGER: When a new user document is created
 * This handles user registration/signup
 */
export const onUserCreatedTrigger = onDocumentCreated(
    "user/{userId}",
    async (event) => {
        const userData = event.data.data();
        const userId = event.params.userId;
        
        console.log(`👤 New user created: ${userId}`, userData);

        try {
            const referralCode = userData.referral_code;

            if (!referralCode) {
                console.log(`⚠️ User ${userId} has no referral code - organic signup`);
                return;
            }

            // Find CPA by referral code
            const cpaQuery = await db.collection("Partners")
                .where("referralCode", "==", referralCode)
                .where("role", "==", "cpa")
                .limit(1)
                .get();

            if (cpaQuery.empty) {
                console.log(`⚠️ No CPA found with referral code: ${referralCode}`);
                return;
            }

            const cpaDoc = cpaQuery.docs[0];
            const cpaId = cpaDoc.id;
            const cpaData = cpaDoc.data();

            // Increment totalReferred (even for free users)
            await db.collection("Partners").doc(cpaId).update({
                "stats.totalReferred": admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ CPA ${cpaData.displayName || cpaData.name}: +1 referred user`);

            return { success: true };

        } catch (error) {
            console.error("❌ Error processing user creation:", error);
            return { error: error.message };
        }
    }
);
