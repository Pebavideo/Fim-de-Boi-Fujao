import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCc7iTAMI_W6c25Q_CSDbxVv-OeElULqAI",
  authDomain: "boi-fujao.firebaseapp.com",
  projectId: "boi-fujao",
  storageBucket: "boi-fujao.firebasestorage.app",
  messagingSenderId: "361906561884",
  appId: "1:361906561884:web:bd8ad650ff9d36bc715799",
  measurementId: "G-S6L1N45D63"
};

const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) => {
  return typeof value === "string" && value.includes("YOUR_");
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export { isFirebaseConfigured };
