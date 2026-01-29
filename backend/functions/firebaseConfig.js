import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import serviceAccount from "./service-account.json" with { type: "json" };

// Initialize the app immediately when this file is imported
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount) 
  });
}

// Export pre-initialized services
export const db = getFirestore();
export const auth = getAuth();
export default admin;