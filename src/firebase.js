import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Kunin ito sa Firebase Console > Project Settings
  apiKey: "YOUR_API_KEY",
  authDomain: "seims-pro.firebaseapp.com",
  projectId: "seims-pro",
  storageBucket: "seims-pro.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);