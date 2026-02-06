import { onCall, HttpsError } from "firebase-functions/v2/https";
import sgMail from "@sendgrid/mail";

export const sendReferralInvite = onCall({ cors: true }, async (request) => {
    // 1. Setup SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // 2. Auth Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to send invites.');
    }

    // 3. Get Data
    // We expect 'referralCode' specifically to build the link safely
    const { email, referralCode, senderName } = request.data;

    if (!email || !referralCode) {
        throw new HttpsError('invalid-argument', 'Recipient email and referral code are required.');
    }

    // 4. CONSTRUCT THE CORRECT LINK (The "Bridge" Link)
    // This ensures the user always lands on your /join page first
    // ⚠️ REPLACE 'https://writeoffgenie.ai' with your real domain if different
    const bridgeUrl = `https://write-off-genie.vercel.app/join?ref=${referralCode}`;

    try {
        const msg = {
            to: email,
            from: process.env.SENDGRID_VERIFIED_EMAIL || 'noreply@writeoffgenie.ai', // Use real domain
            subject: `${senderName || 'A friend'} invited you to join WriteOffGenie`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://writeoffgenie.ai/logo_writeoffgenie.png" alt="WriteOffGenie" style="width: 60px; height: 60px; margin-bottom: 10px;">
                        <h2 style="color: #011C39; margin: 0;">You've been invited!</h2>
                        <p style="color: #666; font-size: 14px;">Start saving on taxes today.</p>
                    </div>
                    
                    <p>Hello,</p>
                    <p><strong>${senderName || 'A friend'}</strong> is using WriteOffGenie to manage finances and thinks you would benefit from it too.</p>
                    <p>Tap the button below to accept the invite. If you have the app, it will open automatically. If not, we'll take you to the store.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${bridgeUrl}" style="background-color: #00D1A0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                            Accept Invite
                        </a>
                    </div>

                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 12px; color: #666; text-align: center;">
                        <p style="margin: 0;">Button not working? Copy this link:</p>
                        <p style="margin: 5px 0 0; word-break: break-all; color: #011C39;">${bridgeUrl}</p>
                    </div>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                        &copy; ${new Date().getFullYear()} WriteOffGenie. All rights reserved.
                    </p>
                </div>
            `
        };

        const response = await sgMail.send(msg);

        return { success: true, message: "Invite sent successfully!", id: response[0].headers['x-message-id'] };

    } catch (error) {
        console.error("SendGrid Email Error:", error);
        throw new HttpsError('internal', 'Failed to send the invite email.');
    }
});