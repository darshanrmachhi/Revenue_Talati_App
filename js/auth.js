// js/auth.js

function checkLoginSession() {
    let saved = localStorage.getItem('revenue_talati_user');
    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            if (parsed && parsed.user && parsed.sejas && parsed.sejas.length > 0) {
                // સૌથી અગત્યનો સુધારો: Firebase Auth નું ટોકન એક્ટિવ થવાની રાહ જુઓ
                firebase.auth().onAuthStateChanged(function(user) {
                    if (user) {
                        currentUser = parsed.user; 
                        userSejas = parsed.sejas; 
                        activeSeja = parsed.activeSeja || userSejas[0];
                        initUserEnvironment();
                    } else {
                        localStorage.removeItem('revenue_talati_user');
                        let lModal = document.getElementById('modal-login');
                        if (lModal) lModal.style.display = 'flex';
                    }
                });
                return;
            }
        } catch(e) {}
    }
    let lModal = document.getElementById('modal-login');
    if (lModal) lModal.style.display = 'flex';
}

async function executeLogin() {
    let mob = document.getElementById('login-mobile').value.trim();
    let pass = document.getElementById('login-password').value.trim();
    
    if (!mob || mob.length !== 10) return alert('કૃપા કરીને માન્ય ૧૦ આંકડાનો મોબાઈલ નંબર દાખલ કરો.');
    if (!pass || pass.length < 6) return alert('૬ આંકડાનો પાસવર્ડ દાખલ કરો.');

    let btn = document.getElementById('btn-login-submit');
    if (btn) { btn.innerText = "ચકાસણી થાય છે..."; btn.disabled = true; }

    let secureEmail = mob + "@talati.in";

    try {
        // ૧. Firebase સિક્યોર લોગિન
        let userCredential = await firebase.auth().signInWithEmailAndPassword(secureEmail, pass);
        await new Promise(resolve => setTimeout(resolve, 800));

        // ૨. યુઝર્સ કલેક્શનમાંથી ડેટા મેળવો
        let snapshot = await db.collection("Users").get();
        if (snapshot.empty) { alert("Users ડેટાબેઝ ખાલી છે."); if(btn){btn.innerText="લોગિન કરો"; btn.disabled=false;} return; }

        let foundUser = null;
        snapshot.forEach((doc) => {
            let data = doc.data();
            let userMob = String(data.Mobile || data.mobile || data.Mobile_No || '').trim();
            if (userMob === mob) { foundUser = data; }
        });

        if (!foundUser) {
            alert("તમારો મોબાઈલ નંબર નોંધાયેલ નથી.");
            if(btn){btn.innerText="લોગિન કરો"; btn.disabled=false;} return;
        }

        let userName = foundUser.Name || foundUser.Talati_Name || foundUser.name || "તલાટી";
        
        // ૩. Master Data માંથી સેજા અને ગામોનું એક્ઝેક્ટ મેચિંગ
        if (btn) { btn.innerText = "માસ્ટર ડેટા સિંક થાય છે..."; }
        let loadedSejas = [];
        
        try {
            // ૧. Cache ચેક કરો
            let masterData = getMasterDataCache();
            
            // ૨. જો Cache ન હોય, તો જ Firebase માંથી લાવો
            if (!masterData) {
                let masterDoc = await db.collection("Master_Data").doc("Taluka_Directory").get();
                if (masterDoc.exists) {
                    masterData = masterDoc.data();
                    setMasterDataCache(masterData); // Cache માં સેવ કરો
                }
            }

           // ૩. મેચિંગ લોજીક ચાલુ કરો
            if (masterData && masterData.sejas && masterData.sejas.length > 0) {
                
                // યુઝરના પ્રોફાઈલમાં આપેલા સેજાના નામ...
                let userSejaStr = String(foundUser.Seja_Name || foundUser.Seja || "").trim().toLowerCase();

                masterData.sejas.forEach(s => {
                    let tName = String(s.talatiName || "").trim().toLowerCase();
                    // સુધારો: directory.js મુજબ talatiMobile ફિલ્ડ પણ ચેક કરો
                    let sCont = String(s.talatiMobile || s.contact || s.mobile || "").replace(/[^0-9]/g, '');
                    let sName = String(s.sejaName || s.name || "").trim().toLowerCase();
                        
                    // મેચિંગ લોજિક: મોબાઈલ નંબર, સેજાનું નામ અથવા તલાટીનું નામ મેચ થાય!
                    let isMatch = false;
                    if (sCont && sCont.includes(mob)) isMatch = true;
                    else if (userSejaStr && sName && (userSejaStr.includes(sName) || sName.includes(userSejaStr))) isMatch = true;
                    else if (tName && userName.toLowerCase() && (tName.includes(userName.toLowerCase()) || userName.toLowerCase().includes(tName))) isMatch = true;

                    if (isMatch) {
                        let vList = [];
                        
                        // પંચાયત અને મહેસૂલી ગામોનું હાયરાર્કી (Hierarchy) એક્સટ્રેક્શન
                        if (s.panchayats && Array.isArray(s.panchayats)) {
                            s.panchayats.forEach(p => {
                                if (p.villages && Array.isArray(p.villages)) {
                                    p.villages.forEach(v => {
                                        let vName = typeof v === 'string' ? v : (v.villageName || v.name || "");
                                        if(vName) vList.push(vName);
                                    });
                                }
                            });
                        } else if (s.villages && Array.isArray(s.villages)) {
                            s.villages.forEach(v => {
                                let vName = typeof v === 'string' ? v : (v.villageName || v.name || "");
                                if(vName) vList.push(vName);
                            });
                        }

                        vList = [...new Set(vList)].filter(v => v !== "");
                        
                        loadedSejas.push({
                            sejaName: s.sejaName || s.name || "સેજો",
                            chargeType: s.chargeType || ((userSejaStr && userSejaStr.startsWith(sName)) ? "કાયમી" : "ચાર્જ"), 
                            villages: vList
                        });
                    }
                });
            }
        } catch(e) { console.log("Master data fetch error:", e); }
        
        // જો માસ્ટર ડેટામાં મેચ ન મળે તો Users કલેક્શનમાંથી યુઝરના ગામ લો
        if (loadedSejas.length === 0) {
            let rawVillages = foundUser.Villages || foundUser.Village || foundUser.villages || foundUser.Seja_Name || "";
            let villagesArray = String(rawVillages).split(',').map(v => v.trim()).filter(v => v !== "");
            loadedSejas.push({
                sejaName: foundUser.Seja_Name || foundUser.Seja || "સેજો",
                chargeType: foundUser.Charge_Type || "કાયમી",
                villages: villagesArray
            });
        }

        if (btn) { btn.innerText = "લોગિન કરો"; btn.disabled = false; }

        currentUser = { mobile: mob, name: userName };
        userSejas = loadedSejas;
        activeSeja = userSejas[0];

        localStorage.setItem('revenue_talati_user', JSON.stringify({
            user: currentUser,
            sejas: userSejas,
            activeSeja: activeSeja
        }));

        document.getElementById('modal-login').style.display = 'none';
        showToast("સ્વાગત છે, " + currentUser.name);
        initUserEnvironment();

    } catch (error) {
        if (btn) { btn.innerText = "લોગિન કરો"; btn.disabled = false; }
        alert("લૉગિન એરર (Firebase): " + error.message);
    }
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

    // ૨. સેજાના ગામોની ચિપ્સ ડાયનેમિક બતાવો
    let chipsCont = document.getElementById('hero-villages-chips');
    if (chipsCont && activeSeja.villages) {
        chipsCont.innerHTML = activeSeja.villages.map(v => 
            `<span class="hero-village-chip"><i class="bi bi-geo-alt-fill" style="font-size:10px;"></i> ${v}</span>`
        ).join('');
    }

    if (activeSeja.villages && activeSeja.villages.length > 0) {
        let vInp = document.getElementById('inp-village'); 
        if (vInp) vInp.value = activeSeja.villages[0];
        let nVInp = document.getElementById('notice-village'); 
        if (nVInp) nVInp.value = activeSeja.villages[0];
    }
    
    loadDashboardData();
}

function openSejaSwitchModal() {
    let listCont = document.getElementById('seja-switch-list'); if (!listCont) return;
    listCont.innerHTML = userSejas.map(s => {
        let isCurrent = (s.sejaName === activeSeja.sejaName);
        return `<div style="padding: 12px; border-radius: 8px; border: 2px solid ${isCurrent?'var(--primary)':'#e2e8f0'}; background:${isCurrent?'#f0f7ff':'white'}; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="switchActiveSeja('${s.sejaName}')"><div><b>${s.sejaName} સેજો</b> (${s.chargeType})<p style="font-size: 11px; color:#64748b; margin-top:3px;">ગામો: ${s.villages.join(', ')}</p></div>${isCurrent ? '<i class="fa-solid fa-check" style="color:var(--primary);"></i>' : ''}</div>`;
    }).join('');
    document.getElementById('modal-seja-switch').style.display = 'flex';
}

function switchActiveSeja(sejaName) {
    activeSeja = userSejas.find(s => s.sejaName === sejaName);
    localStorage.setItem('revenue_talati_user', JSON.stringify({ user: currentUser, sejas: userSejas, activeSeja: activeSeja }));
    document.getElementById('modal-seja-switch').style.display = 'none'; showToast(`${activeSeja.sejaName} સેજા પર સ્વિચ કર્યું`); initUserEnvironment();
}

function userLogout() {
    let performLogout = async () => { 
        try { await firebase.auth().signOut(); } catch(e) {}
        localStorage.removeItem('revenue_talati_user'); 
        location.reload(); 
    };
    // userLogout ફંક્શનની અંદર performLogout માં સૌથી પહેલા આ ઉમેરો:
    if (typeof unsubscribeNotices === 'function' && unsubscribeNotices) unsubscribeNotices();
    if (typeof unsubscribePedhinamu === 'function' && unsubscribePedhinamu) unsubscribePedhinamu();
    if (typeof unsubscribeDashboardNotices === 'function' && unsubscribeDashboardNotices) unsubscribeDashboardNotices();
    if (typeof unsubscribeDashboardPedhinamu === 'function' && unsubscribeDashboardPedhinamu) unsubscribeDashboardPedhinamu();
   
    if (typeof Swal !== 'undefined') { Swal.fire({ title: 'લોગઆઉટ?', text: "શું તમે એપ્લિકેશનમાંથી બહાર નીકળવા માંગો છો?", icon: 'question', showCancelButton: true, confirmButtonColor: '#2563eb', confirmButtonText: 'હા, લોગઆઉટ', cancelButtonText: 'રદ કરો' }).then((result) => { if (result.isConfirmed) performLogout(); }); } 
    else { if (confirm('શું તમે લોગઆઉટ કરવા માંગો છો?')) performLogout(); }
}