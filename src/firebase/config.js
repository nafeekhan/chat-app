import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBc2FM8X10pdjhPYGNL_rRg10fikOCQW94",
  authDomain: "chatting-app-3b477.firebaseapp.com",
  projectId: "chatting-app-3b477",
  storageBucket: "chatting-app-3b477.firebasestorage.app",
  messagingSenderId: "454905685181",
  appId: "1:454905685181:web:4108e6c2c492cfbe0dc3d4",
  measurementId: "G-1SPDTT7HJR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
