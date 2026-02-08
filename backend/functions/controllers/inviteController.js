import { onCall, HttpsError } from "firebase-functions/v2/https";
import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import admin from "firebase-admin";

const db = admin.firestore();

// Generate a secure token containing invite data
const generateInviteToken = (name, email, commissionRate) => {
  const payload = JSON.stringify({ name, email, commissionRate, timestamp: Date.now() });
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    crypto.createHash('sha256').update(process.env.INVITE_SECRET || 'writeoffgenie-secret-key-2024').digest(),
    Buffer.alloc(16, 0)
  );
  let encrypted = cipher.update(payload, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encodeURIComponent(encrypted);
};

// Verify and decode the invite token
export const verifyInviteToken = (token) => {
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(process.env.INVITE_SECRET || 'writeoffgenie-secret-key-2024').digest(),
      Buffer.alloc(16, 0)
    );
    let decrypted = decipher.update(decodeURIComponent(token), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    const data = JSON.parse(decrypted);
    
    // Check if token is not older than 7 days
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp > sevenDaysMs) {
      return { valid: false, error: 'Invitation has expired' };
    }
    
    return { valid: true, data };
  } catch (error) {
    console.error("Token verification error:", error);
    return { valid: false, error: 'Invalid invitation token' };
  }
};

// Cloud Function to send CPA invite (can be sent by Admin or Agent)
export const sendCPAInvite = onCall({ cors: true }, async (request) => {
  // Initialize SendGrid with API key
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // 1. Auth Check: Ensure user is logged in
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to send invites.');
  }

  // 2. Verify user is admin or agent
  const senderDoc = await db.collection("Partners").doc(request.auth.uid).get();
  if (!senderDoc.exists) {
    throw new HttpsError('permission-denied', 'User not found.');
  }

  const senderRole = senderDoc.data().role;
  if (!['super_admin', 'agent'].includes(senderRole)) {
    throw new HttpsError('permission-denied', 'Only Super Admins and Agents can send CPA invites.');
  }

  // 3. Extract Data
  const { name, email, commissionRate } = request.data;

  // 4. Validation
  if (!name || !email) {
    throw new HttpsError('invalid-argument', 'Name and email are required.');
  }

  const commission = commissionRate || 10;
  if (commission < 10 || commission > 50) {
    throw new HttpsError('invalid-argument', 'Commission rate must be between 10 and 50.');
  }

  // 5. Check if email is already registered as a Partner
  const existingPartner = await db.collection("Partners").where("email", "==", email).get();
  if (!existingPartner.empty) {
    throw new HttpsError('already-exists', 'A partner with this email already exists.');
  }

  // 6. Check for pending invite
  const pendingInvite = await db.collection("PendingInvites").where("email", "==", email).get();
  
  try {
    // 7. Generate secure invite token
    const inviteToken = generateInviteToken(name, email, commission);
    const baseUrl = process.env.FUNCTIONS_EMULATOR ? 'http://localhost:5173' : 'https://writeoffgenie.ai';
    const inviteLink = `${baseUrl}/register?token=${inviteToken}&type=cpa`;

    // 8. Store pending invite in Firestore
    const inviteRef = pendingInvite.empty 
      ? db.collection("PendingInvites").doc() 
      : db.collection("PendingInvites").doc(pendingInvite.docs[0].id);
    
    await inviteRef.set({
      inviteType: 'cpa',
      name,
      email,
      commissionRate: commission,
      invitedBy: request.auth.uid,
      invitedByRole: senderRole,
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
      token: inviteToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // 9. Send Email via SendGrid
    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_EMAIL || 'noreply@writeoffgenie.ai',
      subject: `You're Invited to Join WriteOffGenie as a CPA Partner`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #011C39; margin-bottom: 5px;">Welcome to the CPA Partner Program!</h2>
            <p style="color: #666; font-size: 14px;">You've been invited by a ${senderRole === 'super_admin' ? 'WriteOffGenie Admin' : 'Partner Agent'}.</p>
          </div>
          
          <p>Hello <strong>${name}</strong>,</p>
          <p>You've been personally invited to join WriteOffGenie's exclusive CPA Partner Program.</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4D7CFE;">
            <p style="margin: 0; font-size: 14px;"><strong>Your Commission Rate:</strong> ${commission}%</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Earn commission on every client you refer!</p>
          </div>

          <p>Click the button below to complete your registration:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #4D7CFE; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Complete Registration
            </a>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 12px; color: #666; text-align: center;">
            <p style="margin: 0;">This invitation expires in 7 days.</p>
          </div>
        </div>
      `
    };

    const response = await sgMail.send(msg);

    return { success: true, message: "CPA invite sent successfully!" };

  } catch (error) {
    console.error("Send CPA Invite Error:", error);
    throw new HttpsError('internal', 'Failed to send the invite email. Please try again.');
  }
});

// Cloud Function to send Agent invite (only Super Admin can send)
export const sendAgentInvite = onCall({ cors: true }, async (request) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // 1. Auth Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to send invites.');
  }

  // 2. Verify user is super admin
  const adminDoc = await db.collection("Partners").doc(request.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only Super Admins can send Agent invites.');
  }

  // 3. Extract Data
  const { name, email } = request.data;

  // 4. Validation
  if (!name || !email) {
    throw new HttpsError('invalid-argument', 'Name and email are required.');
  }

  // 5. Check if email is already registered
  const existingPartner = await db.collection("Partners").where("email", "==", email).get();
  if (!existingPartner.empty) {
    throw new HttpsError('already-exists', 'A partner with this email already exists.');
  }

  // 6. Check for pending invite
  const pendingInvite = await db.collection("PendingInvites").where("email", "==", email).get();
  
  try {
    // 7. Generate token (agents have fixed 10% commission)
    const inviteToken = generateInviteToken(name, email, 10);
    const baseUrl = process.env.FUNCTIONS_EMULATOR ? 'http://localhost:5173' : 'https://writeoffgenie.ai';
    const inviteLink = `${baseUrl}/register-agent?token=${inviteToken}`;

    // 8. Store pending invite
    const inviteRef = pendingInvite.empty 
      ? db.collection("PendingInvites").doc() 
      : db.collection("PendingInvites").doc(pendingInvite.docs[0].id);
    
    await inviteRef.set({
      inviteType: 'agent',
      name,
      email,
      commissionRate: 10, // Fixed for agents
      invitedBy: request.auth.uid,
      invitedByRole: 'super_admin',
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
      token: inviteToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // 9. Send Email
    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_EMAIL || 'noreply@writeoffgenie.ai',
      subject: `You're Invited to Join WriteOffGenie as an Agent`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #011C39; margin-bottom: 5px;">Welcome to the Agent Program!</h2>
            <p style="color: #666; font-size: 14px;">You've been invited to become a WriteOffGenie Agent.</p>
          </div>
          
          <p>Hello <strong>${name}</strong>,</p>
          <p>You've been selected to join WriteOffGenie's exclusive Agent Program. As an agent, you'll:</p>
          
          <ul style="color: #666; line-height: 1.8;">
            <li>Invite and manage CPAs</li>
            <li>Earn <strong>10% commission</strong> on all revenue from your CPAs</li>
            <li>Build your own network and grow your earnings</li>
          </ul>

          <p>Click the button below to complete your registration:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #4D7CFE; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Complete Registration
            </a>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 12px; color: #666; text-align: center;">
            <p style="margin: 0;">This invitation expires in 7 days.</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);

    return { success: true, message: "Agent invite sent successfully!" };

  } catch (error) {
    console.error("Send Agent Invite Error:", error);
    throw new HttpsError('internal', 'Failed to send the invite email. Please try again.');
  }
});

// Cloud Function to verify invite token (called from frontend)
export const verifyInvite = onCall({ cors: true }, async (request) => {
  const { token } = request.data;

  if (!token) {
    throw new HttpsError('invalid-argument', 'Invitation token is required.');
  }

  const result = verifyInviteToken(token);
  
  if (!result.valid) {
    throw new HttpsError('invalid-argument', result.error);
  }

  // Check if invite is still pending (not already used)
  const inviteQuery = await db.collection("PendingInvites")
    .where("email", "==", result.data.email)
    .where("status", "==", "pending")
    .get();

  if (inviteQuery.empty) {
    throw new HttpsError('not-found', 'Invitation not found or already used.');
  }

  const inviteDoc = inviteQuery.docs[0].data();

  return { 
    valid: true, 
    name: result.data.name, 
    email: result.data.email, 
    commissionRate: result.data.commissionRate,
    inviteType: inviteDoc.inviteType || 'cpa',
    referredBy: inviteDoc.invitedBy
  };
});
