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

// For cost control... (Same comments as before)
setGlobalOptions({ maxInstances: 10 });


// Export the Cloud Function

export const registerCA = onCall(async (request) => {
    const { data, auth } = request;

    return await registerCALogic(data, auth);
});

export const registerClient = onCall(async (request) => {
    const { data, auth } = request;

    return await registerClientLogic(data, auth);
});