// js/ui-logic.js

// =========================================================================
// SAFE GETTERS & HELPERS
// =========================================================================
function safeGetValue(id) {
    let el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

function safeSetText(id, val) {
    let el = document.getElementById(id);
    if (el) el.innerText = (val !== undefined && val !== null) ? val : '';
}

function safeSetHTML(id, val) {
    let el = document.getElementById(id);
    if (el) el.innerHTML = (val !== undefined && val !== null) ? val : '';
}

function safeSetValue(id, val) {
    let el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
}

function getVal(sId, cId) { 
    let s = document.getElementById(sId); 
    return (s && s.value === 'custom') ? (document.getElementById(cId) ? document.getElementById(cId).value : '') : (s ? s.value : ''); 
}

// =========================================================================
// GUJARATI NUMERAL & DATE UTILITIES
// =========================================================================
// js/ui-logic.js (Date Utilities Update)

function toGujaratiDigits(val) {
    if (val === null || val === undefined || val === '') return '';
    const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return String(val).replace(/[0-9]/g, function(w) { return gujDigits[+w]; });
}

// ગુજરાતી અંકોને અંગ્રેજીમાં ફેરવવું (જેથી JavaScript તારીખ ઓળખી શકે)
function toEnglishDigits(str) {
    if (!str) return '';
    const gujToEng = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
    return String(str).replace(/[૦-૯]/g, function(d) { return gujToEng[d] || d; });
}

function parseUniversalDate(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr.toDate === 'function') return dateStr.toDate();
    if (dateStr.seconds) return new Date(dateStr.seconds * 1000);
    
    let s = toEnglishDigits(String(dateStr).trim());
    
    // DD/MM/YYYY અથવા YYYY/MM/DD
    if (s.includes('/')) {
        let parts = s.split('/');
        if (parts.length === 3) {
            if (parts[2].length === 4) {
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            } else if (parts[0].length === 4) {
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
        }
    }
    
    // YYYY-MM-DD અથવા DD-MM-YYYY
    if (s.includes('-')) {
        let parts = s.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else if (parts[2].length === 4) {
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
        }
    }

    let d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function formatForDateInput(dateVal) {
    if (!dateVal) return "";
    let d = parseUniversalDate(dateVal);
    if (!d || isNaN(d.getTime())) return "";
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    let year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
}

function formatDisplayDateGujarati(dStr) {
    if (!dStr) return "-";
    let d = parseUniversalDate(dStr);
    if (!d || isNaN(d.getTime())) {
        return toGujaratiDigits(String(dStr)); // જો parse ન થાય તો મૂળ સ્ટ્રિંગ ગુજરાતી અંકો સાથે બતાવો (ક્યારેય Reset ખાલી નહીં થાય)
    }
    let day = ('0' + d.getDate()).slice(-2);
    let month = ('0' + (d.getMonth() + 1)).slice(-2);
    let year = d.getFullYear();
    return toGujaratiDigits(`${day}/${month}/${year}`);
}

function formatAadharThreeRows(numStr) {
    if (!numStr) return '-';
    let clean = String(numStr).replace(/[^0-9]/g, '');
    if (clean.length === 12) {
        let p1 = toGujaratiDigits(clean.substring(0, 4));
        let p2 = toGujaratiDigits(clean.substring(4, 8));
        let p3 = toGujaratiDigits(clean.substring(8, 12));
        return `${p1}<br>${p2}<br>${p3}`;
    }
    return toGujaratiDigits(clean);
}

function showToast(msg, icon = 'success') {
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
        });
        Toast.fire({ icon: icon, title: msg });
    } else {
        let t = document.getElementById("toast");
        if (t) {
            t.innerText = msg;
            t.className = "show";
            setTimeout(() => { t.className = t.className.replace("show", ""); }, 3000);
        }
    }
}

// =========================================================================
// VIEWS ROUTING WITH HISTORY API
// =========================================================================
function showView(viewId, pushHistory = true) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
    
    let targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.classList.add('active');
    
    let activeNav = document.getElementById('nav-' + viewId);
    if (activeNav) activeNav.classList.add('active');
    
    let backBtn = document.getElementById('back-btn');
    let title = document.getElementById('header-title');
    let vpModal = document.getElementById('village-profile-modal');
    if (vpModal) vpModal.style.display = 'none';

    if (viewId === 'dashboard') { 
        if (backBtn) backBtn.style.display = 'none';
        if (title) title.innerText = 'મહેસૂલી તલાટી દફતર'; 
        loadDashboardData(); 
    }
    else if (viewId === 'directory') {
        if (backBtn) backBtn.style.display = 'block';
        if (title) title.innerText = 'તાલુકા ડિરેક્ટરી';
        let pCont = document.getElementById('panchayat-view-container');
        let dCont = document.getElementById('directory-grid-container');
        if (pCont) pCont.style.display = 'none';
        if (dCont) dCont.style.display = 'grid';
        loadDirectoryData();
    }
    else if (viewId === 'pedhinamu-list') { 
        if (backBtn) backBtn.style.display = 'block';
        if (title) title.innerText = 'પેઢીનામું રજીસ્ટર'; 
        if(typeof loadPedhinamuList === 'function') loadPedhinamuList(); 
    }
    else if (viewId === '135d-desk') { 
        if (backBtn) backBtn.style.display = 'block'; 
        if (title) title.innerText = '૧૩૫-ડી ડેસ્ક'; 
        if(typeof loadNoticesDesk === 'function') loadNoticesDesk(); 
    }

    if (pushHistory) { window.history.pushState({ view: viewId }, '', '#' + viewId); }
}

window.addEventListener('popstate', function(event) {
    const modal = document.getElementById('village-profile-modal');
    if (modal && modal.style.display === 'flex') {
        modal.style.display = 'none';
        window.history.pushState(event.state, '', window.location.hash);
        return;
    }
    if (event.state && event.state.view) {
        if (event.state.view === 'directory-panchayat') {
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
            let dView = document.getElementById('view-directory');
            if (dView) dView.classList.add('active');
            if(typeof renderPanchayatsView === 'function') renderPanchayatsView(event.state.seja, false);
        } else {
            showView(event.state.view, false);
        }
    } else {
        showView('dashboard', false);
    }
});

let unsubscribeDashboardNotices = null;
let unsubscribeDashboardPedhinamu = null;

function loadDashboardData() {
    let currentVillages = (activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    let loadStatus = document.getElementById('loading-status');
    if (loadStatus) loadStatus.innerText = "(લાઈવ સિંક...)";

    if (unsubscribeDashboardNotices) { unsubscribeDashboardNotices(); }
    if (unsubscribeDashboardPedhinamu) { unsubscribeDashboardPedhinamu(); }

    unsubscribeDashboardNotices = db.collection("Notices_135D").onSnapshot((querySnapshot) => {
        let p = 0, d = 0, rCount = 0, c = 0;
        let today = new Date();
        today.setHours(0,0,0,0);

        // ગામવાર નોંધોની ગણતરી માટે ઓબ્જેક્ટ તૈયાર કરો
        let villageCounts = {};
        currentVillages.forEach(v => villageCounts[v] = 0);

        querySnapshot.forEach((doc) => {
            let r = doc.data();
            let vName = String(r.Village_Name || '').trim();
            let matchedVill = currentVillages.find(v => vName.includes(v) || v.includes(vName));
            let isMatch = (currentVillages.length === 0) || !!matchedVill || !vName;

            if (isMatch) {
                if (matchedVill) {
                    villageCounts[matchedVill] = (villageCounts[matchedVill] || 0) + 1;
                }

                let isSubmitted = (String(r.Current_Status || '').includes("જમા") || !!r.Submitted_Date);
                if (isSubmitted) {
                    c++;
                } else if (r.Served_Date) {
                    let sDate = parseUniversalDate(r.Served_Date);
                    if (sDate) {
                        sDate.setHours(0,0,0,0);
                        let diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
                        if (diffDays < 30) d++;
                        else rCount++;
                    } else { p++; }
                } else { p++; }
            }
        });

        let elP = document.getElementById('pending-notices');
        let elD = document.getElementById('due-notices');
        let elC = document.getElementById('completed-notices');
        if (elP) elP.innerText = toGujaratiDigits(p); 
        if (elD) elD.innerText = toGujaratiDigits(d); 
        if (elC) elC.innerText = toGujaratiDigits(c); 

        // ૧. ૩૦ દિવસ પૂર્ણ એલર્ટ બેનર
        let alertBanner = document.getElementById('ready-notices-alert');
        let alertTitle = document.getElementById('ready-alert-title');
        if (alertBanner && alertTitle) {
            if (rCount > 0) {
                alertTitle.innerText = `${toGujaratiDigits(rCount)} નોંધોની મુદત પૂર્ણ (૩૦ દિવસ) - જમા કરવા પાત્ર`;
                alertBanner.style.display = 'flex';
            } else {
                alertBanner.style.display = 'none';
            }
        }

        // ૨. ગામવાર નોંધોની સ્ટ્રિપ રેન્ડર કરો
        let vStrip = document.getElementById('village-wise-stats-strip');
        if (vStrip && currentVillages.length > 0) {
            vStrip.innerHTML = currentVillages.map(v => {
                let shortVName = v.split('(')[0]; // 'ચારણગામ(સાલાવાડા)' ને નાનું બતાવવા
                return `<div class="v-stat-item"><span>${shortVName}:</span> <span class="v-stat-badge">${toGujaratiDigits(villageCounts[v] || 0)}</span></div>`;
            }).join('<span style="color:#e2e8f0;">|</span>');
            vStrip.style.display = 'flex';
        }

        renderNoticeChart(p, d + rCount, c);
        if (loadStatus) loadStatus.innerText = "";
    });

    unsubscribeDashboardPedhinamu = db.collection("Pedhinamu_Register").onSnapshot((querySnapshot) => {
        let count = 0;
        querySnapshot.forEach((doc) => {
            let r = doc.data();
            let vName = String(r.Village_Name || '').trim();
            let isMatch = (currentVillages.length === 0) || 
                          currentVillages.some(v => vName.includes(v) || v.includes(vName)) || 
                          !vName;
            if (isMatch) count++;
        });
        let elT = document.getElementById('total-pedhinamu');
        if (elT) elT.innerText = toGujaratiDigits(count);
    });
}

function renderNoticeChart(pending, due, completed) {
    let chartElem = document.querySelector("#notices-chart-container");
    if (!chartElem || typeof ApexCharts === 'undefined') return;

    let options = {
        series: [pending, due, completed],
        chart: { type: 'donut', height: 185, fontFamily: 'Noto Sans Gujarati, sans-serif' },
        labels: ['બજાવવાની બાકી', 'મુદતમાં ચાલુ', 'કચેરીએ જમા'],
        colors: ['#ef4444', '#f59e0b', '#10b981'],
        legend: { position: 'right', fontSize: '12px', offsetY: 15 },
        dataLabels: { enabled: false },
        plotOptions: { 
            pie: { 
                donut: { 
                    size: '70%', 
                    labels: { 
                        show: true, 
                        total: { 
                            show: true, 
                            label: 'કુલ નોટિસો', 
                            fontSize: '11px', 
                            fontWeight: 600, 
                            formatter: function (w) { 
                                return toGujaratiDigits(w.globals.seriesTotals.reduce((a, b) => a + b, 0)); 
                            } 
                        } 
                    } 
                } 
            } 
        }
    };

    if (noticeApexChart) { 
        noticeApexChart.updateOptions(options); 
    } else {
        chartElem.innerHTML = "";
        noticeApexChart = new ApexCharts(chartElem, options);
        noticeApexChart.render();
    }
}

function enforceMaxTodayOnDates() {
    let todayStr = new Date().toISOString().split('T')[0];
    const dateInputIds = ['notice-gen-date', 'notice-received-date', 'notice-served-date', 'notice-submitted-date', 'edit-notice-gen-date', 'edit-notice-received-date', 'edit-notice-served-date', 'edit-notice-submitted-date', 'inp-date', 'inp-deathdate', 'inp-affidavit-date'];
    dateInputIds.forEach(id => { let el = document.getElementById(id); if (el) el.setAttribute('max', todayStr); });
}

// Startup
window.onload = function() {
    if(typeof setupLivePreview === 'function') setupLivePreview();
    enforceMaxTodayOnDates();
    checkLoginSession();
};

// ==========================================
// PWA INSTALL PROMPT LOGIC
// ==========================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // બ્રાઉઝરના ડિફૉલ્ટ પ્રોમ્પ્ટને અટકાવો
    e.preventDefault();
    // ઇવેન્ટને સેવ કરી રાખો જેથી પછીથી યુઝર ક્લિક કરે ત્યારે વાપરી શકાય
    deferredPrompt = e;
    
    // ડેશબોર્ડ પર ઇન્સ્ટોલ બૅનર બતાવો
    let installContainer = document.getElementById('pwa-install-container');
    if (installContainer) {
        installContainer.style.display = 'flex';
    }
});

function installPWAApp() {
    if (!deferredPrompt) return;
    
    // ઇન્સ્ટોલ પ્રોમ્પ્ટ બતાવો
    deferredPrompt.prompt();
    
    // યુઝરના રિસ્પોન્સની રાહ જુઓ
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        deferredPrompt = null;
        
        // ઇન્સ્ટોલ થઈ ગયા પછી બૅનર છુપાવી દો
        let installContainer = document.getElementById('pwa-install-container');
        if (installContainer) {
            installContainer.style.display = 'none';
        }
    });
}

// જો એપ પહેલેથી જ ઇન્સ્ટોલ થયેલી હોય તો બૅનર નહીં દેખાય
window.addEventListener('appinstalled', (evt) => {
    console.log('App successfully installed.');
    let installContainer = document.getElementById('pwa-install-container');
    if (installContainer) {
        installContainer.style.display = 'none';
    }
});

// ==========================================
// SMART PHONETIC SEARCH (ENGLISH TO GUJARATI)
// ==========================================
function gujaratiToLatin(str) {
    if (!str) return "";
    
    const charMap = {
        'અ': 'a', 'આ': 'a', 'ઇ': 'i', 'ઈ': 'i', 'ઉ': 'u', 'ઊ': 'u', 'ઋ': 'ru',
        'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'અં': 'an', 'અઃ': 'ah',
        'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ૃ': 'ru',
        'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au', 'ં': 'n', 'ઃ': 'h',
        'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
        'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'z', 'ઞ': 'ny',
        'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
        'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
        'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
        'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v', 'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l',
        'ક્ષ': 'ksh', 'જ્ઞ': 'gn'
    };

    const matras = ['ા', 'િ', 'ી', 'ુ', 'ૂ', 'ૃ', 'ે', 'ૈ', 'ો', 'ૌ', 'ં', 'ઃ'];
    const virama = '્';
    const consonants = [
        'ક', 'ખ', 'ગ', 'ઘ', 'ઙ', 'ચ', 'છ', 'જ', 'ઝ', 'ઞ',
        'ટ', 'ઠ', 'ડ', 'ઢ', 'ણ', 'ત', 'થ', 'દ', 'ધ', 'ન',
        'પ', 'ફ', 'બ', 'ભ', 'મ', 'ય', 'ર', 'લ', 'વ', 'શ', 'ષ', 'સ', 'હ', 'ળ', 'ક્ષ', 'જ્ઞ'
    ];

    let result = '';
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        let nextChar = str[i + 1];

        if (charMap[char]) {
            result += charMap[char];
            if (consonants.includes(char)) {
                if (!matras.includes(nextChar) && nextChar !== virama) {
                    if (nextChar && nextChar !== ' ' && nextChar !== '-' && nextChar !== '(') {
                        result += 'a';
                    }
                }
            }
        } else if (char !== virama) {
            result += char;
        }
    }
    return result.toLowerCase();
}

function normalizePhonetic(str) {
    if (!str) return "";
    return str.toLowerCase()
        .replace(/w/g, 'v')             // 'w' અને 'v' સરખા ગણાય (Salawada / Salavada)
        .replace(/ee/g, 'i')            // 'ee' -> 'i'
        .replace(/oo/g, 'u')            // 'oo' -> 'u'
        .replace(/sh/g, 's')            // 'sh' -> 's'
        .replace(/aa/g, 'a')            // 'aa' -> 'a'
        .replace(/([a-z])\1+/g, '$1')   // ડબલ અક્ષરો સરખા ગણાય (tt -> t, ll -> l)
        .replace(/\s+/g, '');
}

function matchesSmartSearch(sourceGujaratiText, searchQuery) {
    if (!sourceGujaratiText || !searchQuery) return false;
    
    let src = String(sourceGujaratiText).toLowerCase();
    let query = String(searchQuery).trim().toLowerCase();

    // ૧. ડાયરેક્ટ ગુજરાતી મેચ (જો યુઝરે સીધું ગુજરાતીમાં જ ટાઇપ કર્યું હોય)
    if (src.includes(query)) return true;

    // ૨. English Phonetical Match
    let latinSrc = gujaratiToLatin(src);
    let normSrc = normalizePhonetic(latinSrc);
    let normQuery = normalizePhonetic(query);

    if (normSrc.includes(normQuery)) return true;

    // ૩. Consonant Skeleton Match (જો સ્પેલિંગમાં vowels નો થોડો ફેર હોય, દા.ત. kaslal vs kasalal)
    if (normQuery.length >= 3) {
        let skelSrc = normSrc.replace(/[aeiou]/g, '');
        let skelQuery = normQuery.replace(/[aeiou]/g, '');
        if (skelQuery.length >= 2 && skelSrc.includes(skelQuery)) {
            return true;
        }
    }

    return false;
}