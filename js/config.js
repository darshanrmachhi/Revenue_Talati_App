// js/config.js

// 1. GLOBAL STATE & VARIABLES
let currentUser = null;
let userSejas = [];
let activeSeja = { sejaName: "સાલાવાડા", chargeType: "કાયમી", villages: ["સાલાવાડા", "ચારણગામ(સાલાવાડા)", "કસલાલ"] };
let allNotices = [];
let currentNoticeTab = 'pending';
let noticeSearchQuery = "";
let currentEditingNotice = null;
let allPedhinamuList = [];
let pedhinamuSearchQuery = "";
let noticeApexChart = null;
let heirsArray = [];
let panchArray = [];
let editModeId = null;
let currentEditingPedhinamuId = null;

// 2. FIREBASE DATABASE SETUP
const firebaseConfig = {
  apiKey: "AIzaSyDkBT0NWpZMZO2LWUECxSXdP9kWIrsSnSQ",
  authDomain: "revenue-talati-app.firebaseapp.com",
  projectId: "revenue-talati-app",
  storageBucket: "revenue-talati-app.firebasestorage.app",
  messagingSenderId: "472128730919",
  appId: "1:472128730919:web:7e9b4d986ad655b4e51b02"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
