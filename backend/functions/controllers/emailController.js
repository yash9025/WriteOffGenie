import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Resend } from "resend";

// ✅ Add { cors: true } here
export const sendReferralInvite = onCall({ cors: true }, async (request) => {
    // Initialize Resend inside the function where env var is available
    const resend = new Resend(process.env.RESEND_EMAIL_API_KEY);
    
    // 1. Auth Check: Ensure user is logged in
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to send invites.');
    }

    // 2. Extract Data
    const { email, referralLink, senderName } = request.data;

    // 3. Validation
    if (!email || !referralLink) {
        throw new HttpsError('invalid-argument', 'Recipient email and referral link are required.');
    }

    try {
        // 4. Send Email via Resend
        const data = await resend.emails.send({
            from: 'WriteOffGenie <onboarding@resend.dev>', // Update to 'noreply@yourdomain.com' after verification
            to: [email],
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
        });

        return { success: true, message: "Invite sent successfully!", id: data.id };

    } catch (error) {
        console.error("Resend Email Error:", error);
        throw new HttpsError('internal', 'Failed to send the invite email. Please try again.');
    }
});