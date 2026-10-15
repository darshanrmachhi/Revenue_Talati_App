// js/config.js

// 1. GLOBAL STATE & VARIABLES
var currentUser = null;
var userSejas = [];
var activeSeja = { sejaName: "સાલાવાડા", chargeType: "કાયમી", villages: ["સાલાવાડા", "ચારણગામ (સા)", "કસલાલ"] };
var allNotices = [];
var currentNoticeTab = 'pending';
var noticeSearchQuery = "";
var currentEditingNotice = null;
var allPedhinamuList = [];
var pedhinamuSearchQuery = "";
var noticeApexChart = null;
var heirsArray = [];
var panchArray = [];
var editModeId = null;
var currentEditingPedhinamuId = null;

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