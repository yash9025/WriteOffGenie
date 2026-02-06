import { onCall, HttpsError } from "firebase-functions/v2/https";
import sgMail from "@sendgrid/mail";

export const sendReferralInvite = onCall({ cors: true }, async (request) => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to send invites.');
    }

    const { email, referralLink, senderName } = request.data;

    if (!email || !referralLink) {
        throw new HttpsError('invalid-argument', 'Recipient email and referral link are required.');
    }

    try {
        const msg = {
            to: email,
            from: process.env.SENDGRID_VERIFIED_EMAIL || 'noreply@yourdomain.com',
            subject: `${senderName} invited you to join WriteOffGenie`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #011C39; margin-bottom: 5px;">You've been invited!</h2>
                        <p style="color: #666; font-size: 14px;">Start saving on taxes today.</p>
                    </div>
                    
                    <p>Hello,</p>
                    <p><strong>${senderName}</strong> is using WriteOffGenie to manage finances and thinks you would benefit from it too.</p>
                    <p>Use the referral link below to sign up and get started:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${referralLink}" style="background-color: #00D1A0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                            Register Now
                        </a>
                    </div>

                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; font-size: 12px; color: #666; text-align: center;">
                        <p style="margin: 0;">Link not working? Copy this:</p>
                        <p style="margin: 5px 0 0; word-break: break-all; color: #011C39;">${referralLink}</p>
                    </div>
                </div>
            `
        };

        const response = await sgMail.send(msg);

        return { success: true, message: "Invite sent successfully!", id: response[0].headers['x-message-id'] };

    } catch (error) {
        console.error("SendGrid Email Error:", error);
        throw new HttpsError('internal', 'Failed to send the invite email. Please try again.');
    }
});