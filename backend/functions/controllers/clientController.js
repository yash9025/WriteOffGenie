import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';
import { db, auth } from "../firebaseConfig.js";

const PLAN_AMOUNT = 1000;
const COMMISSION_RATE = 0.10;

export const registerClient = async (data, context) => {
    const { email, password, name, phone } = data;

    let referralCode = "";
    if (data.referralCode) {
        const rawCode = data.referralCode.trim();
        referralCode = rawCode.includes("ref=") 
            ? rawCode.split("ref=")[1].split("&")[0] 
            : rawCode;
    }

    try {
        let linkedCAId = null;

        if (referralCode) {
            const caQuery = await db.collection("Partners")
                .where("referralCode", "==", referralCode)
                .limit(1)
                .get();

            if (!caQuery.empty) {
                linkedCAId = caQuery.docs[0].id;
            }
        }

        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        const commission = PLAN_AMOUNT * COMMISSION_RATE;
        
        await db.collection("Clients").doc(userRecord.uid).set({
            name,
            email,
            phone: phone || "",
            role: "client",
            referredBy: linkedCAId,
            status: "active",
            createdAt: FieldValue.serverTimestamp(),
            subscription: {
                status: "active",
                planType: "Standard",
                amountPaid: PLAN_AMOUNT,
                activatedAt: FieldValue.serverTimestamp()
            }
        });

        if (linkedCAId) {
            await db.collection("Partners").doc(linkedCAId).update({
                "stats.totalReferred": FieldValue.increment(1),
                "stats.totalSubscribed": FieldValue.increment(1),
                "stats.totalEarnings": FieldValue.increment(commission),
                "walletBalance": FieldValue.increment(commission)
            });
        }

        return { success: true, uid: userRecord.uid };

    } catch (error) {
        console.error(error);
        
        if (error.code === 'auth/email-already-exists') {
            throw new https.HttpsError("already-exists", "Email already in use.");
        }
        throw new https.HttpsError("internal", "Registration failed.");
    }
};