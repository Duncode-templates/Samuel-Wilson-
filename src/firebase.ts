import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8TptV1xahItjFpexfqB1OtEZ71DtaogA",
  authDomain: "money-d9517.firebaseapp.com",
  databaseURL: "https://money-d9517-default-rtdb.firebaseio.com",
  projectId: "money-d9517",
  storageBucket: "money-d9517.firebasestorage.app",
  messagingSenderId: "1028474173381",
  appId: "1:1028474173381:web:6e2925596d3d8a58af7dac"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
