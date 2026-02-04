import { db } from "./firebase";
import { 
  collection, doc, runTransaction, serverTimestamp, setDoc 
} from "firebase/firestore";

// 1. Manage Bank Details
export const saveBankDetails = async (userId, details) => {
  const bankRef = doc(db, "Partners", userId, "Sensitive", "BankDetails");
  try {
    await setDoc(bankRef, { 
      ...details, 
      updatedAt: serverTimestamp() 
    }, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// 2. Request Withdrawal with Custom Amount
export const requestWithdrawal = async (userId, requestedAmount) => {
  const partnerRef = doc(db, "Partners", userId);
  const bankRef = doc(db, "Partners", userId, "Sensitive", "BankDetails");
  const payoutRef = doc(collection(db, "Payouts"));

  try {
    const result = await runTransaction(db, async (transaction) => {
      // 🛡️ Atomic fetch of profile and bank destination
      const partnerDoc = await transaction.get(partnerRef);
      const bankDoc = await transaction.get(bankRef);

      if (!partnerDoc.exists()) throw "Partner record not found.";

      // 🛑 Bank Guard
      if (!bankDoc.exists() || !bankDoc.data().accountNumber) {
        throw "No bank account found. Please update bank details first.";
      }

      const data = partnerDoc.data();
      const currentBalance = data.walletBalance || 0;
      const amount = Number(requestedAmount); // Ensure numeric type

      // 🔐 Logic & Security Guards
      if (data.role !== "ca") throw "Unauthorized: CA role required.";
      if (amount < 500) throw "Minimum withdrawal is $500.";
      if (amount > currentBalance) throw "Insufficient balance.";

      const pName = data.name || "Test User"; 

      // 📝 Log the Payout
      transaction.set(payoutRef, {
        partnerId: userId,
        partnerName: pName, 
        amount: amount,
        status: "pending", 
        paymentMethod: "Bank Transfer",
        bankAccountUsed: bankDoc.data().accountNumber.slice(-4), // Masked account reference
        requestedAt: serverTimestamp(),
        referenceId: payoutRef.id.substring(0, 10).toUpperCase()
      });

      // 💸 Deduct only the requested amount from Wallet
      transaction.update(partnerRef, {
        walletBalance: currentBalance - amount,
        "stats.totalWithdrawn": (data.stats?.totalWithdrawn || 0) + amount
      });

      return { amount: amount };
    });
    return { success: true, amount: result.amount };
  } catch (error) {
    console.error("Payout Error:", error);
    return { success: false, message: error.toString() };
  }
};