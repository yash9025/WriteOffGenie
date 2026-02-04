import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';
import { db, auth } from "../firebaseConfig.js";

const PLAN_AMOUNT = 1000;
const DEFAULT_COMMISSION_RATE = 0.10; // 10% default (used if partner has no custom rate)

export const registerClient = async (data, context) => {
    // 1. Get input data
    // 'paymentSuccess' is passed from frontend: true if they checked "Subscribe", false if not.
    const { email, password, name, phone, paymentSuccess } = data;

    let referralCode = "";
    if (data.referralCode) {
        const rawCode = data.referralCode.trim();
        referralCode = rawCode.includes("ref=") 
            ? rawCode.split("ref=")[1].split("&")[0] 
            : rawCode;
    }

    try {
        let linkedCAId = null;
        let partnerData = null;

        // 2. Find the Partner (Referrer)
        if (referralCode) {
            const caQuery = await db.collection("Partners")
                .where("referralCode", "==", referralCode)
                .limit(1)
                .get();

            if (!caQuery.empty) {
                linkedCAId = caQuery.docs[0].id;
                partnerData = caQuery.docs[0].data();
            }
        }

        // 3. Create Authentication User
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // 4. Determine Subscription Status
        // If they checked "Subscribe", they are Active & Paid. If not, Inactive & Unpaid.
        const subscriptionData = paymentSuccess ? {
            status: "active",
            planType: "Standard",
            amountPaid: PLAN_AMOUNT,
            activatedAt: FieldValue.serverTimestamp()
        } : {
            status: "inactive",
            planType: null,
            amountPaid: 0,
            activatedAt: null
        };

        // 5. Save Client to Database
        await db.collection("Clients").doc(userRecord.uid).set({
            name,
            email,
            phone: phone || "",
            role: "client",
            referredBy: linkedCAId,
            status: paymentSuccess ? "active" : "inactive", 
            createdAt: FieldValue.serverTimestamp(),
            subscription: subscriptionData
        });

        // 6. COMMISSION LOGIC (Uses Partner's specific commission rate)
        // ONLY add commission if they actually subscribed (paymentSuccess === true)
        if (linkedCAId && paymentSuccess) {
            // Use partner's custom commission rate, or default to 10%
            const partnerCommissionRate = (partnerData?.commissionRate || 10) / 100;
            const commission = PLAN_AMOUNT * partnerCommissionRate;
            
            await db.collection("Partners").doc(linkedCAId).update({
                "stats.totalReferred": FieldValue.increment(1),
                "stats.totalSubscribed": FieldValue.increment(1), 
                "stats.totalEarnings": FieldValue.increment(commission),
                "walletBalance": FieldValue.increment(commission)
            });
        } else if (linkedCAId) {
             // If they registered but didn't subscribe, just count as a lead (Referred)
             await db.collection("Partners").doc(linkedCAId).update({
                "stats.totalReferred": FieldValue.increment(1)
            });
        }

        return { success: true, uid: userRecord.uid };

    } catch (error) {
        console.error("Registration Error:", error);
        if (error.code === 'auth/email-already-exists') {
            throw new https.HttpsError("already-exists", "Email already in use.");
        }
        throw new https.HttpsError("internal", "Registration failed.");
    }
};