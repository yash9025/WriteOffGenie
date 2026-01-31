import admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export const requestWithdrawal = async (data, auth) => {
  // 1. Authentication Check
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to request a payout.");
  }

  const { amount } = data;
  const userId = auth.uid;

  // 2. Validation
  if (!amount || amount < 500) {
    throw new HttpsError("invalid-argument", "Minimum withdrawal amount is ₹500.");
  }

  const db = admin.firestore();
  const partnerRef = db.collection("Partners").doc(userId);
  const bankRef = partnerRef.collection("Sensitive").doc("BankDetails");
  const payoutRef = db.collection("Payouts").doc();

  try {
    return await db.runTransaction(async (t) => {
      const partnerDoc = await t.get(partnerRef);
      const bankDoc = await t.get(bankRef);

      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner record not found.");
      }

      //  3. Bank Destination Check
      if (!bankDoc.exists || !bankDoc.data().accountNo) {
        throw new HttpsError("failed-precondition", "Please link your bank account details before withdrawing.");
      }

      const balance = partnerDoc.data().walletBalance || 0;
      const withdrawAmount = Number(amount);

      //  4. Financial Integrity Check
      if (withdrawAmount > balance) {
        throw new HttpsError("resource-exhausted", "Insufficient wallet balance.");
      }

      //  5. Create the Immutable Payout Record
      t.set(payoutRef, {
        partner_id: userId, 
        partnerName: partnerDoc.data().name || "Partner",
        amount: withdrawAmount,
        status: "pending",
        paymentMethod: "Bank Transfer",
        bankAccountUsed: bankDoc.data().accountNo.slice(-4), // Masked for the ledger
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        referenceId: payoutRef.id.substring(0, 10).toUpperCase()
      });

      //  6. Deduct from Wallet
      t.update(partnerRef, {
        walletBalance: balance - withdrawAmount,
        "stats.totalWithdrawn": (partnerDoc.data().stats?.totalWithdrawn || 0) + withdrawAmount
      });

      return { 
        success: true, 
        amount: withdrawAmount, 
        referenceId: payoutRef.id.substring(0, 10).toUpperCase() 
      };
    });
  } catch (error) {
    console.error("Payout Error:", error);
    // Re-throw if it's already an HttpsError, otherwise wrap it
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Payout processing failed.");
  }
};