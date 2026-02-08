import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import crypto from "crypto";

const db = admin.firestore();

const generateReferralCode = () => "AG-" + crypto.randomBytes(3).toString("hex").toUpperCase();

/**
 * Get Agent Statistics
 * Returns comprehensive stats for an agent's dashboard
 */
export const getAgentStats = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const agentId = request.auth.uid;

  try {
    // Verify user is an agent
    const agentDoc = await db.collection("Partners").doc(agentId).get();
    if (!agentDoc.exists || agentDoc.data().role !== 'agent') {
      throw new HttpsError('permission-denied', 'Only agents can access this function.');
    }

    // Get all CPAs referred by this agent
    const cpasSnapshot = await db.collection("Partners")
      .where("referredBy", "==", agentId)
      .where("role", "==", "cpa")
      .get();

    const cpaIds = cpasSnapshot.docs.map(doc => doc.id);

    // Get all transactions where this agent is involved
    const transactionsSnapshot = await db.collection("Transactions")
      .where("agentId", "==", agentId)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => doc.data());

    // Calculate stats
    const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalAgentCommission = transactions.reduce((sum, tx) => sum + (tx.agentCommission || 0), 0);
    const totalCPACommission = transactions.reduce((sum, tx) => sum + (tx.cpaCommission || 0), 0);

    // Get active CPAs count (CPAs with active subscriptions)
    let activeCPAsCount = 0;
    for (const cpaId of cpaIds) {
      const cpaDoc = await db.collection("Partners").doc(cpaId).get();
      if (cpaDoc.exists && (cpaDoc.data().stats?.totalSubscribed || 0) > 0) {
        activeCPAsCount++;
      }
    }

    return {
      totalCPAs: cpaIds.length,
      activeCPAs: activeCPAsCount,
      totalRevenue,
      totalAgentCommission,
      totalCPACommission,
      walletBalance: agentDoc.data().walletBalance || 0
    };

  } catch (error) {
    console.error("Error getting agent stats:", error);
    throw new HttpsError('internal', 'Failed to get agent statistics');
  }
});

/**
 * Get Agent's CPAs
 * Returns list of all CPAs referred by an agent
 */
export const getAgentCPAs = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const agentId = request.auth.uid;

  try {
    // Verify user is an agent
    const agentDoc = await db.collection("Partners").doc(agentId).get();
    if (!agentDoc.exists || agentDoc.data().role !== 'agent') {
      throw new HttpsError('permission-denied', 'Only agents can access this function.');
    }

    // Get all CPAs referred by this agent
    const cpasSnapshot = await db.collection("Partners")
      .where("referredBy", "==", agentId)
      .where("role", "==", "cpa")
      .orderBy("createdAt", "desc")
      .get();

    const cpas = cpasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // For each CPA, get their client count
    for (const cpa of cpas) {
      const clientsSnapshot = await db.collection("Clients")
        .where("referredBy", "==", cpa.id)
        .get();
      cpa.clientCount = clientsSnapshot.size;
    }

    return { cpas };

  } catch (error) {
    console.error("Error getting agent CPAs:", error);
    throw new HttpsError('internal', 'Failed to get CPAs');
  }
});

/**
 * Process Agent Commission
 * Called when a CPA earns commission to calculate and credit agent's share
 */
export const processAgentCommission = onCall({ cors: true }, async (request) => {
  // This should only be called by backend/admin
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { cpaId, clientId, amount, cpaCommission } = request.data;

  if (!cpaId || !clientId || !amount) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Get the CPA's document to find their referrer (agent)
    const cpaDoc = await db.collection("Partners").doc(cpaId).get();
    if (!cpaDoc.exists) {
      throw new HttpsError('not-found', 'CPA not found');
    }

    const cpaData = cpaDoc.data();
    const agentId = cpaData.referredBy;

    // If CPA has no referrer (agent), no agent commission
    if (!agentId) {
      return { 
        success: true, 
        agentCommission: 0,
        message: 'No agent associated with this CPA'
      };
    }

    // Verify the referrer is an agent
    const agentDoc = await db.collection("Partners").doc(agentId).get();
    if (!agentDoc.exists || agentDoc.data().role !== 'agent') {
      return {
        success: true,
        agentCommission: 0,
        message: 'Referrer is not an agent'
      };
    }

    // Calculate agent commission (fixed 10% of original amount)
    const agentCommission = amount * 0.10;
    const platformRevenue = amount - cpaCommission - agentCommission;

    // Update agent's wallet balance
    await db.collection("Partners").doc(agentId).update({
      walletBalance: admin.firestore.FieldValue.increment(agentCommission),
      'stats.totalEarnings': admin.firestore.FieldValue.increment(agentCommission),
      'stats.totalRevenue': admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create transaction record
    await db.collection("Transactions").add({
      type: 'commission',
      amount,
      clientId,
      cpaId,
      agentId,
      cpaCommission,
      agentCommission,
      platformRevenue,
      description: `Commission from client subscription`,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      agentCommission,
      platformRevenue,
      message: 'Agent commission processed successfully'
    };

  } catch (error) {
    console.error("Error processing agent commission:", error);
    throw new HttpsError('internal', 'Failed to process agent commission');
  }
});

/**
 * Register Agent
 * Creates a new agent account from invite
 */
export const registerAgent = onCall({ cors: true }, async (request) => {
  const { name, email, password, phone, inviteToken } = request.data;

  // Validation
  if (!name || !email || !password || !phone) {
    throw new HttpsError('invalid-argument', 'Name, email, password, and phone are required.');
  }

  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.');
  }

  try {
    // Verify invite token and get invite details
    const inviteQuery = await db.collection("PendingInvites")
      .where("email", "==", email)
      .where("status", "==", "pending")
      .where("inviteType", "==", "agent")
      .get();

    if (inviteQuery.empty) {
      throw new HttpsError('not-found', 'No valid agent invitation found for this email.');
    }

    const inviteDoc = inviteQuery.docs[0];
    const inviteData = inviteDoc.data();

    // Validate name matches invite (case-insensitive)
    if (inviteData.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
      throw new HttpsError('invalid-argument', 'Name does not match the invitation.');
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Generate unique referral code
    let referralCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      referralCode = generateReferralCode();
      const existing = await db.collection("Partners").where("referralCode", "==", referralCode).get();
      if (existing.empty) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      throw new HttpsError('internal', 'System busy. Please try again.');
    }

    // Create Partner document
    await db.collection("Partners").doc(userRecord.uid).set({
      displayName: name,
      name,
      email,
      phoneNumber: phone,
      phone,
      referralCode,
      role: "agent",
      status: "active",
      commissionRate: 10, // Fixed 10% for agents
      referredBy: inviteData.invitedBy, // Super admin who invited them
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      walletBalance: 0,
      stats: {
        totalReferred: 0,
        totalEarnings: 0,
        totalRevenue: 0,
        totalSubscribed: 0
      }
    });

    // Mark invite as completed
    await inviteDoc.ref.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      partnerId: userRecord.uid
    });

    return { 
      success: true, 
      uid: userRecord.uid,
      message: 'Agent registered successfully'
    };

  } catch (error) {
    console.error("Agent Registration Error:", error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Email already in use.');
    }
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Registration failed. Please try again.');
  }
});
