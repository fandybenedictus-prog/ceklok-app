import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCK_bwlq_LQtw0-4v3i6mNqZcAxYD7dWqM",
    authDomain: "ceklok-app.firebaseapp.com",
    databaseURL: "https://ceklok-app-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ceklok-app",
    storageBucket: "ceklok-app.firebasestorage.app",
    messagingSenderId: "943564792238",
    appId: "1:943564792238:web:d303053cd386122a6f683f",
    measurementId: "G-1XRGTEXYGB"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
