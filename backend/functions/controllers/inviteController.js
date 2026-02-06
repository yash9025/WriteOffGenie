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

// Cloud Function to send CPA invite
export const sendCPAInvite = onCall({ cors: true }, async (request) => {
  // Initialize SendGrid with API key
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // 1. Auth Check: Ensure user is logged in and is an admin
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to send invites.');
  }

  // Check if user is admin (stored in Partners collection with role: "admin")
  const partnerDoc = await db.collection("Partners").doc(request.auth.uid).get();
  if (!partnerDoc.exists || partnerDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can send CPA invites.');
  }

  // 2. Extract Data
  const { name, email, commissionRate } = request.data;

  // 3. Validation
  if (!name || !email) {
    throw new HttpsError('invalid-argument', 'Name and email are required.');
  }

  const commission = commissionRate || 10;
  if (commission < 1 || commission > 100) {
    throw new HttpsError('invalid-argument', 'Commission rate must be between 1 and 100.');
  }

  // 4. Check if email is already registered as a Partner
  const existingPartner = await db.collection("Partners").where("email", "==", email).get();
  if (!existingPartner.empty) {
    throw new HttpsError('already-exists', 'A partner with this email already exists.');
  }

  // 5. Check for pending invite
  const pendingInvite = await db.collection("PendingInvites").where("email", "==", email).get();
  
  try {
    // 6. Generate secure invite token
    const inviteToken = generateInviteToken(name, email, commission);
    // Use localhost for local testing, change to production URL when deploying
    const baseUrl = process.env.FUNCTIONS_EMULATOR ? 'http://localhost:5173' : 'https://writeoffgenie.ai';
    const inviteLink = `${baseUrl}/register?token=${inviteToken}`;

    // 7. Store pending invite in Firestore
    const inviteRef = pendingInvite.empty 
      ? db.collection("PendingInvites").doc() 
      : db.collection("PendingInvites").doc(pendingInvite.docs[0].id);
    
    await inviteRef.set({
      name,
      email,
      commissionRate: commission,
      invitedBy: request.auth.uid,
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
      token: inviteToken
    });

    // 8. Send Email via SendGrid
    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_EMAIL || 'noreply@yourdomain.com', // MUST be verified in SendGrid
      subject: `You're Invited to Partner with WriteOffGenie`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #011C39; margin-bottom: 5px;">Welcome to the Partner Program!</h2>
            <p style="color: #666; font-size: 14px;">You've been invited to become a CPA Partner.</p>
          </div>
          
          <p>Hello <strong>${name}</strong>,</p>
          <p>You've been personally invited to join WriteOffGenie's exclusive CPA Partner Program.</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00D1A0;">
            <p style="margin: 0; font-size: 14px;"><strong>Your Commission Rate:</strong> ${commission}%</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Earn commission on every client you refer!</p>
          </div>

          <p>Click the button below to complete your registration:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #011C39; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Complete Registration
            </a>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 12px; color: #666; text-align: center;">
            <p style="margin: 0;">This invitation expires in 7 days.</p>
            <p style="margin: 5px 0 0; word-break: break-all; color: #011C39;">Link not working? Copy this: ${inviteLink}</p>
          </div>
        </div>
      `
    };

    const response = await sgMail.send(msg);

    return { success: true, message: "Invite sent successfully!", id: response[0].headers['x-message-id'] };

  } catch (error) {
    console.error("Send Invite Error:", error);
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

  return { 
    valid: true, 
    name: result.data.name, 
    email: result.data.email, 
    commissionRate: result.data.commissionRate 
  };
});
