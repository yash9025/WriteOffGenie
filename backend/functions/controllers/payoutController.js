import admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export const requestWithdrawal = async (data, auth) => {
  // 1. Authentication Check
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to request a payout.");
  }

  const { amount, bankAccountId, bankSnapshot } = data;
  const userId = auth.uid;

  // 2. Validation
  if (!amount || amount < 100) {
    throw new HttpsError("invalid-argument", "Minimum withdrawal amount is $100.");
  }

  if (!bankAccountId || !bankSnapshot) {
    throw new HttpsError("invalid-argument", "Please select a bank account for withdrawal.");
  }

  const db = admin.firestore();
  const partnerRef = db.collection("Partners").doc(userId);
  const payoutRef = db.collection("Payouts").doc();

  try {
    return await db.runTransaction(async (t) => {
      const partnerDoc = await t.get(partnerRef);

      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner record not found.");
      }

      // 3. Verify bank account exists (optional - trust client snapshot but verify account exists)
      const bankAccountRef = partnerRef.collection("BankAccounts").doc(bankAccountId);
      const bankAccountDoc = await t.get(bankAccountRef);
      
      if (!bankAccountDoc.exists) {
        throw new HttpsError("failed-precondition", "Selected bank account not found. Please select a valid account.");
      }

      const balance = partnerDoc.data().walletBalance || 0;
      const withdrawAmount = Number(amount);

      // 4. Financial Integrity Check
      if (withdrawAmount > balance) {
        throw new HttpsError("resource-exhausted", "Insufficient wallet balance.");
      }

      // 5. DEDUCT balance immediately to prevent unlimited requests
      t.update(partnerRef, {
        walletBalance: admin.firestore.FieldValue.increment(-withdrawAmount)
      });

      // 6. Create the Payout Request with bank snapshot
      // The bankSnapshot contains all info admin needs to see which account CA selected
      t.set(payoutRef, {
        partner_id: userId, 
        partnerName: partnerDoc.data().name || "Partner",
        amount: withdrawAmount,
        status: "pending",
        paymentMethod: "Bank Transfer",
        
        // Store the bank account reference and full snapshot
        bankAccountId: bankAccountId,
        bankSnapshot: {
          companyName: bankSnapshot.companyName,
          routingNumber: bankSnapshot.routingNumber,
          accountNumber: bankSnapshot.accountNumber,
          accountType: bankSnapshot.accountType
        },
        
        // Legacy field for backward compatibility (masked last 4 digits)
        bankAccountUsed: bankSnapshot.accountNumber?.slice(-4),
        
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        referenceId: payoutRef.id.substring(0, 10).toUpperCase()
      });

      return { 
        success: true, 
        amount: withdrawAmount, 
        referenceId: payoutRef.id.substring(0, 10).toUpperCase() 
      };
    });
  } catch (error) {
    console.error("Payout Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Payout processing failed.");
  }
};