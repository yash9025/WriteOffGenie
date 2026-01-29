import { FieldValue } from "firebase-admin/firestore";
import { https } from "firebase-functions";
import crypto from "crypto";

// Import Default Export (No curly braces)
import validRegistration from "../utils/validator.js"; 

// Import Config
import { db, auth } from "../firebaseConfig.js"; 

const generateReferralCode = () => "CA-" + crypto.randomBytes(3).toString("hex").toUpperCase();

export const registerCA = async (data, context) => {
  console.log("Request Received:", data);

  const errors = validRegistration(data);
  
  if (errors.length > 0) {
    console.error("Validation Failed:", errors);
    throw new https.HttpsError("invalid-argument", errors.join(", "));
  }

  const { email, password, name, phone, caRegNumber } = data;

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
      const existing = await db.collection("CAs").where("referralCode", "==", referralCode).get();
      if (existing.empty) isUnique = true;
      attempts++;
    }
    
    if (!isUnique) throw new Error("System busy. Please try again.");

    await db.collection("CAs").doc(userRecord.uid).set({
      name,
      email, 
      phone, 
      caRegNumber: caRegNumber || "", 
      referralCode,
      role: "CA",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      stats: {
        totalReferred: 0,
        totalEarnings: 0, 
        walletBalance: 0 
      }
    });

    return { success: true, uid: userRecord.uid };

  } catch (error) {
    console.error("Registration Error:", error);
    if (error.code === 'auth/email-already-exists') {
      throw new https.HttpsError("already-exists", "Email already in use.");
    }
    throw new https.HttpsError("internal", "Registration failed.");
  }
};