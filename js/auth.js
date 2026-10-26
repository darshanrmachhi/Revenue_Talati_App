// js/auth.js

// =========================================================================
// 1. MASTER DATA LOCAL STORAGE CACHING (With 24-Hour TTL)
// =========================================================================
const MASTER_CACHE_KEY = 'revenue_talati_master_directory_v1';
const MASTER_CACHE_TIME_KEY = 'revenue_talati_master_directory_time_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 કલાક

function getMasterDataCache() {
    try {
        let dataStr = localStorage.getItem(MASTER_CACHE_KEY);
        let timeStr = localStorage.getItem(MASTER_CACHE_TIME_KEY);
        if (!dataStr || !timeStr) return null;
        if (Date.now() - parseInt(timeStr, 10) > CACHE_TTL_MS) {
            localStorage.removeItem(MASTER_CACHE_KEY);
            localStorage.removeItem(MASTER_CACHE_TIME_KEY);
            return null;
        }
        return JSON.parse(dataStr);
    } catch (e) {
        return null;
    }
}

function setMasterDataCache(data) {
    try {
        localStorage.setItem(MASTER_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(MASTER_CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {
        console.warn("Cache save error:", e);
    }
}

function forceRefreshMasterData() {
    localStorage.removeItem(MASTER_CACHE_KEY);
    localStorage.removeItem(MASTER_CACHE_TIME_KEY);
    localStorage.removeItem('taluka_directory_cache');
    if (typeof talukaDirectoryData !== 'undefined') talukaDirectoryData = null;

    showToast("માસ્ટર ડેટા રિફ્રેશ થઈ રહ્યો છે...", "info");
    db.collection("Master_Data").doc("Taluka_Directory").get().then((doc) => {
        if (doc.exists) {
            let response = doc.data();
            setMasterDataCache(response);
            if (typeof talukaDirectoryData !== 'undefined') talukaDirectoryData = response;
            
            if (currentUser) syncUserSejasFromMaster(response);
            
            let dirView = document.getElementById('view-directory');
            if (dirView && dirView.classList.contains('active')) {
                if (typeof loadDirectoryData === 'function') loadDirectoryData();
            } else {
                initUserEnvironment();
            }
            showToast("માસ્ટર ડેટા અપડેટ થઈ ગયો!");
        }
    }).catch(err => {
        alert("રિફ્રેશ એરર: " + err.message);
    });
}

// =========================================================================
// 2. CENTRALIZED SEJA MATCHING HELPER (NO DUPLICATION)
// =========================================================================
function extractMatchedSejas(masterData, mob, userName, userSejaStr) {
    let matchedSejas = [];
    if (!masterData || !Array.isArray(masterData.sejas)) return matchedSejas;

    let cleanMob = String(mob || "").replace(/[^0-9]/g, '');
    let cleanName = String(userName || "").trim().toLowerCase();
    let cleanSeja = String(userSejaStr || "").trim().toLowerCase();

    masterData.sejas.forEach(s => {
        let tName = String(s.talatiName || "").trim().toLowerCase();
        let sCont = String(s.talatiMobile || s.contact || s.mobile || "").replace(/[^0-9]/g, '');
        let sName = String(s.sejaName || s.name || "").trim().toLowerCase();

        let isMatch = false;
        if (cleanMob && sCont && sCont.includes(cleanMob)) isMatch = true;
        else if (cleanSeja && sName && (cleanSeja.includes(sName) || sName.includes(cleanSeja))) isMatch = true;
        else if (cleanName && tName && (tName.includes(cleanName) || cleanName.includes(tName))) isMatch = true;

        if (isMatch) {
            let vList = [];
            if (Array.isArray(s.panchayats)) {
                s.panchayats.forEach(p => {
                    if (Array.isArray(p.villages)) {
                        p.villages.forEach(v => {
                            let vName = typeof v === 'string' ? v : (v.villageName || v.name || "");
                            if (vName) vList.push(vName.trim());
                        });
                    }
                });
            }
            vList = [...new Set(vList)].filter(v => v !== "");
            matchedSejas.push({
                sejaName: s.sejaName || "સેજો",
                chargeType: s.chargeType || "કાયમી",
                villages: vList
            });
        }
    });
    return matchedSejas;
}

function saveUserSessionToLocal() {
    localStorage.setItem('revenue_talati_user', JSON.stringify({
        user: currentUser,
        sejas: userSejas,
        activeSeja: activeSeja
    }));
}

function syncUserSejasFromMaster(masterData) {
    if (!masterData || !currentUser) return;
    let matched = extractMatchedSejas(masterData, currentUser.mobile, currentUser.name, currentUser.seja);
    if (matched.length > 0) {
        userSejas = matched;
        // જો અગાઉ પસંદ કરેલો સેજો નવા લિસ્ટમાં હોય તો તે જ રાખો, નહીંતર પહેલો સેજો
        let prevActive = activeSeja ? matched.find(s => s.sejaName === activeSeja.sejaName) : null;
        activeSeja = prevActive || userSejas[0];
        saveUserSessionToLocal();
    }
}

// =========================================================================
// 3. MULTI-USER AUTHENTICATION & SESSION MANAGEMENT
// =========================================================================
function checkLoginSession() {
    let savedSession = localStorage.getItem('revenue_talati_user');
    let loginModal = document.getElementById('modal-login');

    if (savedSession) {
        try {
            let parsed = JSON.parse(savedSession);
            currentUser = parsed.user;
            userSejas = parsed.sejas || [];
            activeSeja = parsed.activeSeja || (userSejas.length > 0 ? userSejas[0] : null);
            
            if (loginModal) loginModal.style.display = 'none';
            
            let cachedMaster = getMasterDataCache();
            if (cachedMaster && (!activeSeja || !activeSeja.villages || activeSeja.villages.length <= 1)) {
                syncUserSejasFromMaster(cachedMaster);
            }
            initUserEnvironment();
        } catch (e) {
            localStorage.removeItem('revenue_talati_user');
            if (loginModal) loginModal.style.display = 'flex';
        }
    } else {
        if (loginModal) loginModal.style.display = 'flex';
    }
}

function executeLogin() {
    let mobInput = toEnglishDigits(safeGetValue('login-mobile')).replace(/[^0-9]/g, '');
    let passInput = toEnglishDigits(safeGetValue('login-password'));
    let btn = document.getElementById('btn-login-submit');
    let defaultPwd = (typeof DEFAULT_PASS !== 'undefined') ? DEFAULT_PASS : "123456";

    if (mobInput.length !== 10) { alert("કૃપા કરી ૧૦ આંકડાનો સાચો મોબાઈલ નંબર નાખો."); return; }
    if (!passInput) { alert("કૃપા કરી પાસવર્ડ નાખો."); return; }

    if (btn) { btn.disabled = true; btn.innerText = "ચકાસણી ચાલુ છે..."; }

    db.collection("Users").get().then(async (snapshot) => {
        let foundUser = null;
        let foundDocId = null;

        snapshot.forEach(doc => {
            let d = doc.data();
            let dbMob = toEnglishDigits(String(d.Mobile || d.mobile || d.Phone || doc.id || "")).replace(/[^0-9]/g, '');
            if (dbMob.includes(mobInput)) {
                foundUser = d;
                foundDocId = doc.id;
            }
        });

        // Master_Data લોડ કરો (કેશમાંથી અથવા Firestore માંથી)
        let masterData = getMasterDataCache();
        if (!masterData) {
            try {
                let mDoc = await db.collection("Master_Data").doc("Taluka_Directory").get();
                if (mDoc.exists) {
                    masterData = mDoc.data();
                    setMasterDataCache(masterData);
                }
            } catch (e) { console.warn(e); }
        }

        // જો Users કલેક્શનમાં ન હોય તો સીધું Taluka_Directory માંથી તલાટી મોબાઈલ ચેક કરો
        if (!foundUser && masterData && Array.isArray(masterData.sejas)) {
            let matchedSeja = masterData.sejas.find(s => String(s.talatiMobile || "").replace(/[^0-9]/g, '').includes(mobInput));
            if (matchedSeja) {
                foundUser = {
                    Name: matchedSeja.talatiName,
                    Mobile: mobInput,
                    Seja_Name: matchedSeja.sejaName,
                    Password: defaultPwd
                };
            }
        }

        if (!foundUser) {
            if (btn) { btn.disabled = false; btn.innerText = "લોગિન કરો"; }
            alert("આ મોબાઈલ નંબર રજીસ્ટર થયેલ નથી!");
            return;
        }

        let dbPass = toEnglishDigits(String(foundUser.Password || foundUser.password || defaultPwd).trim());
        // જો ડેટાબેઝમાં જૂનો '000000' રહી ગયો હોય તો પણ '123456' અને યુઝરનો પોતાનો પાસવર્ડ માન્ય ગણાશે
        let isValidPass = (passInput === dbPass) || (dbPass === "000000" && passInput === defaultPwd);

        if (!isValidPass) {
            if (btn) { btn.disabled = false; btn.innerText = "લોગિન કરો"; }
            alert("પાસવર્ડ ખોટો છે!");
            return;
        }

        let userName = foundUser.Name || foundUser.name || foundUser.Talati_Name || "તલાટી";
        let userSejaStr = String(foundUser.Seja_Name || foundUser.seja || "").trim();

        currentUser = {
            docId: foundDocId || mobInput,
            name: userName,
            mobile: mobInput,
            seja: userSejaStr
        };

        let loadedSejas = extractMatchedSejas(masterData, mobInput, userName, userSejaStr);

        if (loadedSejas.length === 0) {
            let rawVillages = foundUser.Villages || foundUser.Village || foundUser.villages || userSejaStr || "";
            let villagesArray = String(rawVillages).split(',').map(v => v.trim()).filter(v => v !== "");
            loadedSejas.push({
                sejaName: userSejaStr || "સેજો",
                chargeType: foundUser.Charge_Type || "કાયમી",
                villages: villagesArray
            });
        }

        userSejas = loadedSejas;
        activeSeja = userSejas[0];
        saveUserSessionToLocal();

        if (btn) { btn.disabled = false; btn.innerText = "લોગિન કરો"; }
        document.getElementById('modal-login').style.display = 'none';
        safeSetValue('login-password', '');
        initUserEnvironment();
        showToast("સ્વાગત છે, " + currentUser.name);

    }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerText = "લોગિન કરો"; }
        alert("લોગિન એરર: " + err.message);
    });
}

function initUserEnvironment() {
    if (!currentUser || !activeSeja) return;

    // સમય મુજબ શુભેચ્છા સંદેશ (Dynamic Greeting)
    let curHour = new Date().getHours();
    let greetingText = "નમસ્તે";
    if (curHour >= 5 && curHour < 12) greetingText = "શુભ પ્રભાત";
    else if (curHour >= 12 && curHour < 17) greetingText = "શુભ બપોર";
    else greetingText = "શુભ સંધ્યા";
    
    safeSetText('hero-greeting-text', greetingText);
    safeSetText('user-display-name', (currentUser.name || "તલાટી") + " 👋");
    safeSetText('current-seja-title', (activeSeja.sejaName || "") + " સેજો");

    let elBadge = document.getElementById('current-charge-badge'); 
    if (elBadge) { 
        elBadge.innerText = activeSeja.chargeType || "કાયમી"; 
        elBadge.className = "badge " + (activeSeja.chargeType === 'કાયમી' ? 'permanent' : 'additional'); 
    }

    let elSwitch = document.getElementById('seja-switch-btn-container');
    if (elSwitch) { elSwitch.style.display = (userSejas && userSejas.length > 1) ? 'block' : 'none'; }
    
    // ૧. આજની તારીખ અને વાર સેટ કરો
    let dateEl = document.getElementById('current-date-display');
    if (dateEl) {
        const days = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
        const months = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'];
        let now = new Date();
        dateEl.innerHTML = `<i class="bi bi-calendar3"></i> ${days[now.getDay()]}, ${toGujaratiDigits(now.getDate())} ${months[now.getMonth()]} ${toGujaratiDigits(now.getFullYear())}`;
    }

    // ૨. સેજાના ગામોની ચિપ્સ ડાયનેમિક અને ક્લિકેબલ બતાવો
    let chipsCont = document.getElementById('hero-villages-chips');
    if (chipsCont && activeSeja.villages) {
        chipsCont.innerHTML = activeSeja.villages.map(v => 
            `<span class="hero-village-chip" onclick="openVillageFromHero('${v}')" style="cursor:pointer;">
                <i class="bi bi-geo-alt-fill" style="font-size:10px;"></i> ${v}
             </span>`
        ).join('');
    }

    // ૩. ગામોના ડ્રોપડાઉન ભરો
    if (activeSeja.villages && activeSeja.villages.length > 0) {
        const dropIds = ['inp-village', 'panch-vill', 'notice-village', 'edit-notice-village'];
        let optionsHtml = activeSeja.villages.map(v => `<option value="${v}">${v}</option>`).join('');
        dropIds.forEach(id => {
            let sel = document.getElementById(id);
            if (sel) sel.innerHTML = optionsHtml;
        });
    }
    
    loadDashboardData();
}

function openSejaSwitchModal() {
    let listCont = document.getElementById('seja-switch-list');
    if (!listCont) return;
    listCont.innerHTML = userSejas.map(s => {
        let isCurrent = (s.sejaName === activeSeja.sejaName);
        return `<div onclick="switchActiveSeja('${s.sejaName}')" style="padding:12px 15px; border-radius:10px; border:2px solid ${isCurrent ? '#2563eb' : '#e2e8f0'}; background:${isCurrent ? '#eff6ff' : '#fff'}; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <b style="font-size:15px; color:#1e293b;">${s.sejaName} સેજો</b>
                <span style="font-size:11px; display:block; color:#64748b;">ગામો: ${s.villages.join(', ')}</span>
            </div>
            <span class="badge" style="background:${s.chargeType === 'કાયમી' ? '#dcfce7' : '#fef3c7'}; color:${s.chargeType === 'કાયમી' ? '#166534' : '#92400e'}; padding:4px 8px; border-radius:6px; font-size:11px;">${s.chargeType}</span>
        </div>`;
    }).join('');
    document.getElementById('modal-seja-switch').style.display = 'flex';
}

function switchActiveSeja(sejaName) {
    let found = userSejas.find(s => s.sejaName === sejaName);
    if (found) {
        activeSeja = found;
        saveUserSessionToLocal();
        document.getElementById('modal-seja-switch').style.display = 'none';
        initUserEnvironment();
        showToast(`${sejaName} સેજો સક્રિય થયો`);
    }
}

// ભવિષ્યમાં પ્રોફાઈલમાંથી પાસવર્ડ બદલવા માટેનું તૈયાર ફંક્શન
function changeUserPassword(newPass) {
    if (!currentUser || !currentUser.mobile) return;
    let cleanPass = toEnglishDigits(String(newPass || '').trim());
    if (cleanPass.length < 6) { alert("પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષર/આંકડાનો હોવો જોઈએ."); return; }

    let docRef = db.collection("Users").doc(currentUser.docId || currentUser.mobile);
    docRef.set({
        Name: currentUser.name,
        Mobile: currentUser.mobile,
        Seja_Name: currentUser.seja,
        Password: cleanPass,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        showToast("પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો!");
    }).catch(err => {
        alert("પાસવર્ડ અપડેટ એરર: " + err.message);
    });
}

function userLogout() {
    if (!confirm("શું તમે લોગઆઉટ કરવા માંગો છો?")) return;
    if (typeof unsubscribeNotices === 'function' && unsubscribeNotices) { unsubscribeNotices(); unsubscribeNotices = null; }
    if (typeof unsubscribePedhinamu === 'function' && unsubscribePedhinamu) { unsubscribePedhinamu(); unsubscribePedhinamu = null; }
    if (typeof updateHeaderAvatar === 'function') updateHeaderAvatar('');

    localStorage.removeItem('revenue_talati_user');
    currentUser = null;
    userSejas = [];
    activeSeja = null;
    noticesData = [];
    allPedhinamuList = [];
    isNoticesLoaded = false;
    document.getElementById('modal-login').style.display = 'flex';
}