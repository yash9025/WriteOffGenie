import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';
import { db, auth } from "../firebaseConfig.js";

export const registerClient = async (data, context) => {
    const { email, password, name, phone } = data;
    
    // Sanitize referral code
    let referralCode = data.referralCode ? data.referralCode.trim() : "";
    if (referralCode.includes("ref=")) {
        referralCode = referralCode.split("ref=")[1].split("&")[0];
    }

    try {
        let linkedCAId = null;

        // Resolve Referral Code to CA UID
        // Updated: Checks 'Partners' collection now
        if (referralCode) {
            const caQuery = await db.collection("Partners")
                .where("referralCode", "==", referralCode)
                .limit(1)
                .get();

            if (!caQuery.empty) {
                linkedCAId = caQuery.docs[0].id;
            }
        }

        // Create Auth User
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // Create Client Document
        await db.collection("Clients").doc(userRecord.uid).set({
            name,
            email,
            phone: phone || "",
            role: "client", // Lowercase for consistency
            referredBy: linkedCAId, 
            createdAt: FieldValue.serverTimestamp(),
            status: "active",
            subscriptionStatus: "inactive"
        });

        // Update CA Stats if linked
        // Updated: Updates 'Partners' collection now
        if (linkedCAId) {
            await db.collection("Partners").doc(linkedCAId).update({
                "stats.totalReferred": FieldValue.increment(1)
            });
        }

        return { success: true, uid: userRecord.uid };

    } catch (error) {
        console.error("[ClientRegister] Error:", error);
        
        if (error.code === 'auth/email-already-exists') {
            throw new https.HttpsError("already-exists", "Email already in use.");
        }
        throw new https.HttpsError("internal", "Registration failed.");
    }
};