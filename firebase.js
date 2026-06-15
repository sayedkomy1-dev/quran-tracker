import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAf9pAaoKXoOLyVg4KL9Zdf1TB7tn7W--c",
  authDomain: "we-live-quran.firebaseapp.com",
  projectId: "we-live-quran",
  storageBucket: "we-live-quran.firebasestorage.app",
  messagingSenderId: "435543106755",
  appId: "1:435543106755:web:d908f21de42a7680092e76",
  measurementId: "G-T4TEOFHEHS"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);