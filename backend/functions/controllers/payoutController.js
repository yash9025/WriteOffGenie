import admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

export const requestWithdrawal = async (data, auth) => {
  // 1. Authentication Check
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to request a payout.");
  }

  const { amount, bankAccountId } = data; // Removed bankSnapshot from input (Security)
  const userId = auth.uid;

  // 2. Strict Input Validation
  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount < 100) {
    throw new HttpsError("invalid-argument", "Minimum withdrawal amount is $100.");
  }

  if (!bankAccountId) {
    throw new HttpsError("invalid-argument", "Please select a bank account.");
  }

  const db = admin.firestore();
  const partnerRef = db.collection("Partners").doc(userId);
  const bankAccountRef = partnerRef.collection("BankAccounts").doc(bankAccountId);
  
  // Create reference ID early to use in multiple places if needed
  const payoutRef = db.collection("Payouts").doc(); 

  try {
    return await db.runTransaction(async (t) => {
      // 3. OPTIMIZATION: Parallel Reads (Performance)
      // Fetch Partner and Bank Account simultaneously instead of sequentially
      const [partnerDoc, bankAccountDoc] = await Promise.all([
        t.get(partnerRef),
        t.get(bankAccountRef)
      ]);

      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner record not found.");
      }

      // 4. SECURITY: Source of Truth
      // We verify the doc exists AND we use the data from the DB, not the client snapshot
      if (!bankAccountDoc.exists) {
        throw new HttpsError("failed-precondition", "Selected bank account not found.");
      }

      const partnerData = partnerDoc.data();
      const balance = partnerData.walletBalance || 0;
      const partnerRole = partnerData.role || "ca"; // Get partner role for filtering

      // 5. Financial Integrity Check
      if (withdrawAmount > balance) {
        throw new HttpsError("resource-exhausted", "Insufficient wallet balance.");
      }

      // 6. Writes
      // Deduct balance
      t.update(partnerRef, {
        walletBalance: admin.firestore.FieldValue.increment(-withdrawAmount)
      });

      // Get trusted bank data from the database fetch
      const bankData = bankAccountDoc.data();

      // Create Payout Request
      t.set(payoutRef, {
        partner_id: userId,
        partnerName: partnerData.name || partnerData.displayName || "Partner",
        partnerRole: partnerRole, // Include role for easier filtering
        amount: withdrawAmount,
        status: "pending",
        paymentMethod: "Bank Transfer",

        // SECURITY: Use server-side data, not client-side data
        bankAccountId: bankAccountId,
        bankSnapshot: {
          companyName: bankData.companyName,
          routingNumber: bankData.routingNumber,
          accountNumber: bankData.accountNumber,
          accountType: bankData.accountType
        },

        // Legacy field
        bankAccountUsed: bankData.accountNumber ? bankData.accountNumber.slice(-4) : "****",

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

