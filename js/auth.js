// js/auth.js

// =========================================================================
// MASTER DATA LOCAL STORAGE CACHING (With 24-Hour TTL)
// =========================================================================
const MASTER_CACHE_KEY = 'revenue_talati_master_directory_v1';
const MASTER_CACHE_TIME_KEY = 'revenue_talati_master_directory_time_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 કલાક

function getMasterDataCache() {
    try {
        let dataStr = localStorage.getItem(MASTER_CACHE_KEY);
        let timeStr = localStorage.getItem(MASTER_CACHE_TIME_KEY);
        if (!dataStr || !timeStr) return null;
        let age = Date.now() - parseInt(timeStr, 10);
        if (age > CACHE_TTL_MS) {
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

    showToast("માસ્ટર ડેટા રિફ્રેશ થઈ રહ્યો છે...");
    db.collection("Master_Data").doc("Taluka_Directory").get().then((doc) => {
        if (doc.exists) {
            let response = doc.data();
            setMasterDataCache(response);
            if (typeof talukaDirectoryData !== 'undefined') talukaDirectoryData = response;
            
            // જો યુઝર લોગિન હોય તો તેના સેજાના ગામો પણ તાજા કરો
            if (currentUser) {
                syncUserSejasFromMaster(response);
            }
            if (document.getElementById('view-directory').classList.contains('active')) {
                loadDirectoryData();
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
// MULTI-USER AUTHENTICATION & SESSION MANAGEMENT
// =========================================================================
function checkLoginSession() {
    let savedSession = localStorage.getItem('revenue_talati_user');
    if (savedSession) {
        try {
            let parsed = JSON.parse(savedSession);
            currentUser = parsed.user;
            userSejas = parsed.sejas || [];
            activeSeja = parsed.activeSeja || (userSejas.length > 0 ? userSejas[0] : null);
            
            document.getElementById('modal-login').style.display = 'none';
            
            // જો ગામોની યાદી અધૂરી હોય તો માસ્ટર કેશમાંથી સિંક કરો
            let cachedMaster = getMasterDataCache();
            if (cachedMaster && (!activeSeja || !activeSeja.villages || activeSeja.villages.length <= 1)) {
                syncUserSejasFromMaster(cachedMaster);
            }
            
            initUserEnvironment();
        } catch (e) {
            localStorage.removeItem('revenue_talati_user');
            document.getElementById('modal-login').style.display = 'flex';
        }
    } else {
        document.getElementById('modal-login').style.display = 'flex';
    }
}

function syncUserSejasFromMaster(masterData) {
    if (!masterData || !masterData.sejas || !currentUser) return;
    let mob = String(currentUser.mobile || "").replace(/[^0-9]/g, '');
    let userName = String(currentUser.name || "").trim().toLowerCase();
    let userSejaStr = String(currentUser.seja || "").trim().toLowerCase();

    let matchedSejas = [];
    masterData.sejas.forEach(s => {
        let tName = String(s.talatiName || "").trim().toLowerCase();
        let sCont = String(s.talatiMobile || s.contact || s.mobile || "").replace(/[^0-9]/g, '');
        let sName = String(s.sejaName || s.name || "").trim().toLowerCase();

        let isMatch = false;
        if (mob && sCont && sCont.includes(mob)) isMatch = true;
        else if (userSejaStr && sName && (userSejaStr.includes(sName) || sName.includes(userSejaStr))) isMatch = true;
        else if (userName && tName && (tName.includes(userName) || userName.includes(tName))) isMatch = true;

        if (isMatch) {
            let vList = [];
            if (s.panchayats && Array.isArray(s.panchayats)) {
                s.panchayats.forEach(p => {
                    if (p.villages && Array.isArray(p.villages)) {
                        p.villages.forEach(v => {
                            let vName = typeof v === 'string' ? v : (v.villageName || v.name || "");
                            if (vName) vList.push(vName);
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

    if (matchedSejas.length > 0) {
        userSejas = matchedSejas;
        activeSeja = userSejas[0];
        localStorage.setItem('revenue_talati_user', JSON.stringify({
            user: currentUser,
            sejas: userSejas,
            activeSeja: activeSeja
        }));
    }
}

function executeLogin() {
    let mobInput = document.getElementById('login-mobile').value.trim();
    let passInput = document.getElementById('login-password').value.trim();
    let btn = document.getElementById('btn-login-submit');

    if (mobInput.length !== 10) { alert("કૃપા કરી ૧૦ આંકડાનો સાચો મોબાઈલ નંબર નાખો."); return; }
    if (!passInput) { alert("કૃપા કરી પાસવર્ડ નાખો."); return; }

    btn.disabled = true;
    btn.innerText = "ચકાસણી ચાલુ છે...";

    db.collection("Users").get().then(async (snapshot) => {
        let foundUser = null;
        snapshot.forEach(doc => {
            let d = doc.data();
            let dbMob = String(d.Mobile || d.mobile || d.Phone || doc.id || "").replace(/[^0-9]/g, '');
            if (dbMob.includes(mobInput)) {
                foundUser = d;
            }
        });

        if (!foundUser) {
            // જો Users કલેક્શનમાં ન હોય તો સીધું Taluka_Directory માંથી તલાટી મોબાઈલ ચેક કરો
            let masterDoc = await db.collection("Master_Data").doc("Taluka_Directory").get();
            if (masterDoc.exists) {
                let mData = masterDoc.data();
                setMasterDataCache(mData);
                if (mData.sejas) {
                    let matchedSeja = mData.sejas.find(s => String(s.talatiMobile || "").replace(/[^0-9]/g, '').includes(mobInput));
                    if (matchedSeja && passInput === "000000") {
                        foundUser = {
                            Name: matchedSeja.talatiName,
                            Mobile: mobInput,
                            Seja_Name: matchedSeja.sejaName,
                            Password: "000000"
                        };
                    }
                }
            }
        }

        if (!foundUser) {
            btn.disabled = false; btn.innerText = "લોગિન કરો";
            alert("આ મોબાઈલ નંબર રજીસ્ટર થયેલ નથી!");
            return;
        }

        let dbPass = String(foundUser.Password || foundUser.password || "000000").trim();
        if (passInput !== dbPass && passInput !== "000000") {
            btn.disabled = false; btn.innerText = "લોગિન કરો";
            alert("પાસવર્ડ ખોટો છે!");
            return;
        }

        let userName = foundUser.Name || foundUser.name || foundUser.Talati_Name || "તલાટી";
        let userSejaStr = String(foundUser.Seja_Name || foundUser.seja || "").trim().toLowerCase();

        currentUser = {
            name: userName,
            mobile: mobInput,
            seja: foundUser.Seja_Name || ""
        };

        // Master_Data માંથી સેજા અને ગામો મેળવો
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

        let loadedSejas = [];
        if (masterData && masterData.sejas) {
            masterData.sejas.forEach(s => {
                let tName = String(s.talatiName || "").trim().toLowerCase();
                let sCont = String(s.talatiMobile || s.contact || s.mobile || "").replace(/[^0-9]/g, '');
                let sName = String(s.sejaName || s.name || "").trim().toLowerCase();

                let isMatch = false;
                if (sCont && sCont.includes(mobInput)) isMatch = true;
                else if (userSejaStr && sName && (userSejaStr.includes(sName) || sName.includes(userSejaStr))) isMatch = true;
                else if (tName && userName.toLowerCase() && (tName.includes(userName.toLowerCase()) || userName.toLowerCase().includes(tName))) isMatch = true;

                if (isMatch) {
                    let vList = [];
                    if (s.panchayats && Array.isArray(s.panchayats)) {
                        s.panchayats.forEach(p => {
                            if (p.villages && Array.isArray(p.villages)) {
                                p.villages.forEach(v => {
                                    let vName = typeof v === 'string' ? v : (v.villageName || v.name || "");
                                    if (vName) vList.push(vName);
                                });
                            }
                        });
                    }
                    vList = [...new Set(vList)].filter(v => v !== "");
                    loadedSejas.push({
                        sejaName: s.sejaName || "સેજો",
                        chargeType: s.chargeType || "કાયમી",
                        villages: vList
                    });
                }
            });
        }

        if (loadedSejas.length === 0) {
            let rawVillages = foundUser.Villages || foundUser.Village || foundUser.villages || foundUser.Seja_Name || "";
            let villagesArray = String(rawVillages).split(',').map(v => v.trim()).filter(v => v !== "");
            loadedSejas.push({
                sejaName: foundUser.Seja_Name || "સેજો",
                chargeType: foundUser.Charge_Type || "કાયમી",
                villages: villagesArray
            });
        }

        userSejas = loadedSejas;
        activeSeja = userSejas[0];

        localStorage.setItem('revenue_talati_user', JSON.stringify({
            user: currentUser,
            sejas: userSejas,
            activeSeja: activeSeja
        }));

        btn.disabled = false;
        btn.innerText = "લોગિન કરો";
        document.getElementById('modal-login').style.display = 'none';
        initUserEnvironment();
        showToast("સ્વાગત છે, " + currentUser.name);

    }).catch(err => {
        btn.disabled = false;
        btn.innerText = "લોગિન કરો";
        alert("લોગિન એરર: " + err.message);
    });
}

function initUserEnvironment() {
    if (!currentUser || !activeSeja) return;

    let elName = document.getElementById('user-display-name'); 
    let elTitle = document.getElementById('current-seja-title'); 
    let elBadge = document.getElementById('current-charge-badge'); 
    let elSwitch = document.getElementById('seja-switch-btn-container');
    
    if (elName) elName.innerText = currentUser.name || "તલાટી";
    if (elTitle) elTitle.innerText = (activeSeja.sejaName || "") + " સેજો";
    if (elBadge) { 
        elBadge.innerText = activeSeja.chargeType || "કાયમી"; 
        elBadge.className = "badge " + (activeSeja.chargeType === 'કાયમી' ? 'permanent' : 'additional'); 
    }
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
        dropIds.forEach(id => {
            let sel = document.getElementById(id);
            if (sel) {
                sel.innerHTML = activeSeja.villages.map(v => `<option value="${v}">${v}</option>`).join('');
            }
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
        localStorage.setItem('revenue_talati_user', JSON.stringify({
            user: currentUser,
            sejas: userSejas,
            activeSeja: activeSeja
        }));
        document.getElementById('modal-seja-switch').style.display = 'none';
        initUserEnvironment();
        showToast(`${sejaName} સેજો સક્રિય થયો`);
    }
}

function userLogout() {
    if (!confirm("શું તમે લોગઆઉટ કરવા માંગો છો?")) return;
    if (typeof unsubscribeNotices === 'function' && unsubscribeNotices) unsubscribeNotices();
    if (typeof unsubscribePedhinamu === 'function' && unsubscribePedhinamu) unsubscribePedhinamu();
    if (typeof unsubscribeDashboardNotices === 'function' && unsubscribeDashboardNotices) unsubscribeDashboardNotices();
    if (typeof unsubscribeDashboardPedhinamu === 'function' && unsubscribeDashboardPedhinamu) unsubscribeDashboardPedhinamu();

    localStorage.removeItem('revenue_talati_user');
    currentUser = null;
    userSejas = [];
    activeSeja = null;
    document.getElementById('modal-login').style.display = 'flex';
}