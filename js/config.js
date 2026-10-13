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

// ==========================================
// 3. LOCAL STORAGE CACHING LOGIC
// ==========================================
const MASTER_DATA_KEY = 'talati_taluka_directory_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 કલાક (Time To Live)

function setMasterDataCache(data) {
    const cacheObject = { data: data, timestamp: new Date().getTime() };
    localStorage.setItem(MASTER_DATA_KEY, JSON.stringify(cacheObject));
}

function getMasterDataCache() {
    const cachedString = localStorage.getItem(MASTER_DATA_KEY);
    if (!cachedString) return null;
    
    const cacheObject = JSON.parse(cachedString);
    // જો 24 કલાક વીતી ગયા હોય, તો Cache ડિલીટ કરો
    if (new Date().getTime() - cacheObject.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(MASTER_DATA_KEY);
        return null;
    }
    return cacheObject.data;
}

function forceRefreshMasterData() {
    localStorage.removeItem(MASTER_DATA_KEY);
    showToast("Master Data રિફ્રેશ થઈ રહ્યો છે...", 'info');
    
    // જો યુઝર ડિરેક્ટરી પેજ પર હોય તો ફરીથી ડેટા લોડ કરો
    talukaDirectoryData = null; 
    if (document.getElementById('view-directory') && document.getElementById('view-directory').classList.contains('active')) {
        if(typeof loadDirectoryData === 'function') loadDirectoryData();
    } else {
        showToast("જૂનો ડેટા રિમૂવ થયો. હવે નવો ડેટા ફેચ થશે.", 'success');
    }
}