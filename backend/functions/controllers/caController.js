import { FieldValue } from "firebase-admin/firestore";
import { https } from "firebase-functions";
import crypto from "crypto";
import validRegistration from "../utils/validator.js"; 
import { db, auth } from "../firebaseConfig.js"; 

const generateReferralCode = () => "CA-" + crypto.randomBytes(3).toString("hex").toUpperCase();

export const registerCA = async (data, context) => {
  console.log("Request Received:", data);

  const errors = validRegistration(data);
  
  if (errors.length > 0) {
    console.error("Validation Failed:", errors);
    throw new https.HttpsError("invalid-argument", errors.join(", "));
  }

  const { email, password, name, phone, caRegNumber, commissionRate, inviteToken } = data;

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    let referralCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      referralCode = generateReferralCode();
     
      const existing = await db.collection("Partners").where("referralCode", "==", referralCode).get();
      if (existing.empty) isUnique = true;
      attempts++;
    }
    
    if (!isUnique) throw new Error("System busy. Please try again.");

    await db.collection("Partners").doc(userRecord.uid).set({
      name,
      email, 
      phone, 
      caRegNumber: caRegNumber || "", 
      referralCode,
      role: "ca", 
      status: "active",
      commissionRate: commissionRate || 10, // Commission rate from invite (default 10%)
      createdAt: FieldValue.serverTimestamp(),
      walletBalance: 0,
      stats: {
        totalReferred: 0,
        totalEarnings: 0, 
        totalSubscribed:0
      } 
    });

    // Mark the invite as used if inviteToken was provided
    if (inviteToken) {
      const inviteQuery = await db.collection("PendingInvites")
        .where("email", "==", email)
        .where("status", "==", "pending")
        .get();
      
      if (!inviteQuery.empty) {
        await inviteQuery.docs[0].ref.update({
          status: "completed",
          completedAt: FieldValue.serverTimestamp(),
          partnerId: userRecord.uid
        });
      }
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