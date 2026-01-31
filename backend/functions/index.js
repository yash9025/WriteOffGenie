/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";

// Import your custom logic
import { registerCA as registerCALogic } from "./controllers/caController.js";
import { registerClient as registerClientLogic } from "./controllers/clientController.js";
import { requestWithdrawal as requestWithdrawalLogic } from "./controllers/payoutController.js";
import { 
    toggleCAStatus as toggleCAStatusLogic, 
    processWithdrawal as processWithdrawalLogic 
} from "./controllers/adminController.js";

// For cost control...
setGlobalOptions({ maxInstances: 10 });


// --- PUBLIC FUNCTIONS ---

export const registerCA = onCall(async (request) => {
    const { data, auth } = request;
    return await registerCALogic(data, auth);
});

export const registerClient = onCall(async (request) => {
    const { data, auth } = request;
    return await registerClientLogic(data, auth);
});

export const requestWithdrawal = onCall(async (request) => {
    const { data, auth } = request;
    return await requestWithdrawalLogic(data, auth);
});


// --- ADMIN FUNCTIONS ---

export const toggleCAStatus = onCall(async (request) => {
    return await toggleCAStatusLogic(request.data, request);
});

export const processWithdrawal = onCall(async (request) => {
    return await processWithdrawalLogic(request.data, request);
});