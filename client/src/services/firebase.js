import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // Added Auth emulator
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getFirestore} from "firebase/firestore"; // Added Firestore emulator

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// 🛠️ Emulator Connection Logic
if (location.hostname === "localhost") {
  console.log("🔌 Connecting to Local Firebase Emulators...");
  
  // 1. Connect Firestore (Port 8080 is default for Firestore)
  // connectFirestoreEmulator(db, "127.0.0.1", 8080);
  
  // // 2. Connect Auth (Port 9099 is default for Auth)
  // // This is critical so your app knows who "request.auth.uid" is in your rules
  // connectAuthEmulator(auth, "http://127.0.0.1:9099");
  
  // 3. Connect Functions
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export { app, analytics, auth, functions, db };