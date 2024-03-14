// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAOVFFWO6uLO2Q1sTtGphwvdVnUVZuhd4I",
  authDomain: "maps-1b566.firebaseapp.com",
  projectId: "maps-1b566",
  storageBucket: "maps-1b566.appspot.com",
  messagingSenderId: "1009193935310",
  appId: "1:1009193935310:web:f3a5fbc0e19f65916a0b9f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getFirestore(app)
export { app, database }