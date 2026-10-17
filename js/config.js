// js/config.js

const DEFAULT_PASS = "123456";

// Global Session & State Variables
var currentUser = null;
var userSejas = [];
var activeSeja = null;

// Central Data Stores & Unsubscribers
var noticesData = [];
var isNoticesLoaded = false;
var allPedhinamuList = [];
var unsubscribeNotices = null;
var unsubscribePedhinamu = null;

// UI & Chart States
var currentNoticeTab = 'all';
var pedhinamuSearchQuery = "";
var noticeApexChart = null;

// Pedhinamu Form States
var heirsArray = [];
var panchArray = [];
var currentEditingPedhinamuId = null;

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