import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import admin from "firebase-admin";

// Initialize the Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// 1. Import Logic-Only Controllers
import { registerCA as registerCALogic } from "./controllers/caController.js";
import { 
    toggleCAStatus as toggleCAStatusLogic,
    updateCommissionRate as updateCommissionRateLogic
} from "./controllers/adminController.js";

// 2. Export Pre-configured Triggers Directly
export { sendReferralInvite } from "./controllers/emailController.js";
export { sendCPAInvite, sendAgentInvite, verifyInvite } from "./controllers/inviteController.js";
export { getAgentStats, getAgentCPAs, processAgentCommission, registerAgent } from "./controllers/agentController.js";

// 3. Export Firestore Triggers
// This pulls the updated logic from the file above
export { 
    onUserCreatedTrigger,
    handleSubscriptionEarnings 
} from "./triggers/subscriptionTrigger.js";

// Set Max Instances
setGlobalOptions({ maxInstances: 10 });

// --- PUBLIC FUNCTIONS ---
export const registerCA = onCall({ cors: true }, async (request) => {
    const { data, auth } = request;
    return await registerCALogic(data, auth);
});

// --- ADMIN FUNCTIONS ---
export const toggleCAStatus = onCall({ cors: true }, async (request) => {
    return await toggleCAStatusLogic(request.data, request);
});

export const updateCommissionRate = onCall({ cors: true }, async (request) => {
    return await updateCommissionRateLogic(request.data, request);
});