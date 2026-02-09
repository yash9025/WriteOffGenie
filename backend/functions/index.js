import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import admin from "firebase-admin";

// Initialize the Admin SDK (Required for Firestore/Auth to work)
if (!admin.apps.length) {
  admin.initializeApp();
}

// 1. Import Logic-Only Controllers
// These are just functions, so we wrap them in onCall here.
import { registerCA as registerCALogic } from "./controllers/caController.js";
import { registerClient as registerClientLogic } from "./controllers/clientController.js";
import { requestWithdrawal as requestWithdrawalLogic } from "./controllers/payoutController.js";
import { 
    toggleCAStatus as toggleCAStatusLogic, 
    processWithdrawal as processWithdrawalLogic,
    updateCommissionRate as updateCommissionRateLogic
} from "./controllers/adminController.js";

// 2. Export Pre-configured Triggers Directly
// We export this directly because it is ALREADY defined as an onCall function in the controller
export { sendReferralInvite } from "./controllers/emailController.js";
export { sendCPAInvite, sendAgentInvite, verifyInvite } from "./controllers/inviteController.js";
export { getAgentStats, getAgentCPAs, processAgentCommission, registerAgent } from "./controllers/agentController.js";

// Set Max Instances
setGlobalOptions({ maxInstances: 10 });

// --- PUBLIC FUNCTIONS (Wrapped with CORS) ---
// We add { cors: true } here to prevent CORS errors on these functions too.

export const registerCA = onCall({ cors: true }, async (request) => {
    const { data, auth } = request;
    return await registerCALogic(data, auth);
});

export const registerClient = onCall({ cors: true }, async (request) => {
    const { data, auth } = request;
    return await registerClientLogic(data, auth);
});

export const requestWithdrawal = onCall({ cors: true }, async (request) => {
    const { data, auth } = request;
    return await requestWithdrawalLogic(data, auth);
});


// --- ADMIN FUNCTIONS ---

export const toggleCAStatus = onCall({ cors: true }, async (request) => {
    return await toggleCAStatusLogic(request.data, request);
});

export const processWithdrawal = onCall({ cors: true }, async (request) => {
    return await processWithdrawalLogic(request.data, request);
});

export const updateCommissionRate = onCall({ cors: true }, async (request) => {
    return await updateCommissionRateLogic(request.data, request);
});