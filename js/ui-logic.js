// js/ui-logic.js

// =========================================================================
// 1. SAFE DOM GETTERS & SETTERS
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
    return (s && s.value === 'custom') ? safeGetValue(cId) : (s ? s.value : ''); 
}

// =========================================================================
// 2. GUJARATI NUMERAL, DATE & AREA UTILITIES (CENTRALIZED)
// =========================================================================
function toGujaratiDigits(val) {
    if (val === null || val === undefined || val === '') return '';
    const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return String(val).replace(/[0-9]/g, w => gujDigits[+w]);
}

function toEnglishDigits(str) {
    if (!str) return '';
    const gujToEng = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
    return String(str).replace(/[૦-૯]/g, d => gujToEng[d] || d);
}

// ગામનું મૂળ નામ કાઢવું (દા.ત. 'ગામનું નામ(પેટા)' -> 'ગામનું નામ')
function getVillageBase(name) {
    if (!name) return '';
    return String(name).split('(')[0].replace(/[\s\-_]/g, '').trim().toLowerCase();
}

// બે ગામના નામ સરખા છે કે નહીં તે ચકાસતું સેન્ટ્રલ ફંક્શન
function isSameVillage(v1, v2) {
    if (!v1 || !v2) return false;
    let b1 = getVillageBase(v1);
    let b2 = getVillageBase(v2);
    return !!(b1 && b2 && b1 === b2);
}

// ચોરસ મીટરમાંથી હેક્ટર-આરે-ચો.મી. નો ઓબ્જેક્ટ આપતું કોમન ફંક્શન
function sqmToHaAreSqm(totalSqM) {
    let abs = Math.abs(parseFloat(totalSqM) || 0);
    let ha = Math.floor(abs / 10000);
    let remHa = abs % 10000;
    let are = Math.floor(remHa / 100);
    let sqm = Math.round(remHa % 100);
    return {
        ha: ha,
        are: are,
        sqm: sqm,
        formattedEng: `${ha}-${('0' + are).slice(-2)}-${('0' + sqm).slice(-2)}`,
        formattedGuj: toGujaratiDigits(`${ha}-${('0' + are).slice(-2)}-${('0' + sqm).slice(-2)}`)
    };
}

// ક્ષેત્રફળને "હે.-આરે-ચો.મી." ફોર્મેટમાં ફેરવતું સ્માર્ટ હેલ્પર ફંક્શન
function formatLandAreaDisplay(val) {
    if (!val) return '';
    let clean = toEnglishDigits(String(val).trim());
    
    if (clean.includes('-') || clean.includes('/') || clean.includes('.')) {
        let parts = clean.split(/[-/.]/);
        if (parts.length >= 2) {
            let ha = parts[0] || '0';
            let are = ('0' + (parts[1] || '0')).slice(-2);
            let sqm = parts[2] ? ('0' + parts[2]).slice(-2) : '00';
            return toGujaratiDigits(`${ha}-${are}-${sqm}`);
        }
    }
    
    let num = parseFloat(clean);
    if (!isNaN(num) && num > 0) {
        return sqmToHaAreSqm(num).formattedGuj;
    }
    return toGujaratiDigits(val);
}

function parseUniversalDate(dateVal) {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    
    let s = toEnglishDigits(String(dateVal).trim());
    
    // ISO ફોર્મેટ ચકાસણી (દા.ત. YYYY-MM-DDTHH:mm:ss)
    if (s.includes('T')) {
        let d = new Date(s);
        if (!isNaN(d.getTime())) return d;
    }

    if (s.includes('/')) {
        let parts = s.split('/');
        if (parts.length === 3) {
            if (parts[2].length === 4) return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            if (parts[0].length === 4) return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
    }
    
    if (s.includes('-')) {
        let parts = s.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            if (parts[2].length === 4) return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
    }

    let d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function formatForDateInput(dateVal) {
    if (!dateVal) return "";
    let d = parseUniversalDate(dateVal);
    if (!d || isNaN(d.getTime())) return "";
    let month = ('0' + (d.getMonth() + 1)).slice(-2);
    let day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
}

function formatDisplayDateGujarati(dStr) {
    if (!dStr) return "-";
    let d = parseUniversalDate(dStr);
    if (!d || isNaN(d.getTime())) return toGujaratiDigits(String(dStr));
    let day = ('0' + d.getDate()).slice(-2);
    let month = ('0' + (d.getMonth() + 1)).slice(-2);
    return toGujaratiDigits(`${day}/${month}/${d.getFullYear()}`);
}

function formatAadharThreeRows(numStr) {
    if (!numStr) return '-';
    let clean = toEnglishDigits(String(numStr)).replace(/[^0-9]/g, '');
    if (clean.length === 12) {
        return `${toGujaratiDigits(clean.substring(0, 4))}<br>${toGujaratiDigits(clean.substring(4, 8))}<br>${toGujaratiDigits(clean.substring(8, 12))}`;
    }
    return toGujaratiDigits(clean);
}

function showToast(msg, icon = 'success') {
    if (typeof Swal !== 'undefined') {
        Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
        }).fire({ icon: icon, title: msg });
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
// 3. VIEWS ROUTING WITH HISTORY API
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
        updateDashboardStatsUI(); 
    }
    else if (viewId === 'directory') {
        if (backBtn) backBtn.style.display = 'block';
        let talukaName = (talukaDirectoryData && talukaDirectoryData.talukaName) || "લુણાવાડા";
        if (title) title.innerText = talukaName + ' ડિરેક્ટરી';
        let pCont = document.getElementById('panchayat-view-container');
        let dCont = document.getElementById('directory-grid-container');
        if (pCont) pCont.style.display = 'none';
        if (dCont) dCont.style.display = 'grid';
        if (typeof loadDirectoryData === 'function') loadDirectoryData();
    }
    else if (viewId === 'pedhinamu-list') { 
        if (backBtn) backBtn.style.display = 'block';
        if (title) title.innerText = 'પેઢીનામું રજીસ્ટર'; 
        if (typeof loadPedhinamuList === 'function') loadPedhinamuList(); 
    }
    else if (viewId === '135d-desk') { 
        if (backBtn) backBtn.style.display = 'block'; 
        if (title) title.innerText = '૧૩૫-ડી ડેસ્ક'; 
        if (typeof loadNoticesDesk === 'function') loadNoticesDesk(); 
    }
    else if (viewId === 'profile') { 
        if (backBtn) backBtn.style.display = 'block'; 
        if (title) title.innerText = 'મારી પ્રોફાઈલ'; 
        if (typeof loadUserProfileData === 'function') loadUserProfileData(); 
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
            if (typeof renderPanchayatsView === 'function') renderPanchayatsView(event.state.seja, false);
        } else {
            showView(event.state.view, false);
        }
    } else {
        showView('dashboard', false);
    }
});

// =========================================================================
// 4. CENTRAL REAL-TIME SYNC ENGINE (SECURE ISOLATION)
// =========================================================================
function loadDashboardData() {
    let currentVillages = (activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    let loadStatus = document.getElementById('loading-status');
    if (loadStatus) loadStatus.innerText = "(લાઈવ સિંક...)";

    if (unsubscribeNotices) { unsubscribeNotices(); unsubscribeNotices = null; }
    if (unsubscribePedhinamu) { unsubscribePedhinamu(); unsubscribePedhinamu = null; }

    // ૧. ૧૩૫-ડી નોટિસ લિસનર
    unsubscribeNotices = db.collection("Notices_135D").onSnapshot((querySnapshot) => {
        let list = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            let vName = String(data.Village_Name || data.village || '').trim();
            
            // સિક્યોરિટી શરત: માત્ર સક્રિય સેજાના ગામો જ સિંક થશે
            let isMatch = (currentVillages.length > 0) && 
                          (vName !== '' && currentVillages.some(v => isSameVillage(vName, v)));
            if (isMatch) list.push(data);
        });

        list.sort((a, b) => {
            let timeA = (a.createdAt && a.createdAt.toDate) ? a.createdAt.toDate().getTime() : 0;
            let timeB = (b.createdAt && b.createdAt.toDate) ? b.createdAt.toDate().getTime() : 0;
            if (!timeA && a.Received_Date) { let d = parseUniversalDate(a.Received_Date); if (d) timeA = d.getTime(); }
            if (!timeB && b.Received_Date) { let d = parseUniversalDate(b.Received_Date); if (d) timeB = d.getTime(); }
            return timeB - timeA;
        });

        noticesData = list;
        isNoticesLoaded = true;
        updateDashboardStatsUI();

        if (typeof renderNoticeVillageFilters === 'function') renderNoticeVillageFilters();
        if (typeof renderNoticeTypeFilters === 'function') renderNoticeTypeFilters();
        if (typeof updateStatusTabsUIAndCounts === 'function') updateStatusTabsUIAndCounts();
        if (typeof applyNoticeFilters === 'function') applyNoticeFilters();

        if (loadStatus) loadStatus.innerText = "";
    }, (error) => {
        console.error("Notices Sync Error:", error);
        if (loadStatus) loadStatus.innerText = "(સિંક એરર)";
    });

    // ૨. પેઢીનામા રજીસ્ટર લિસનર
    unsubscribePedhinamu = db.collection("Pedhinamu_Register").onSnapshot((querySnapshot) => {
        let data = [];
        querySnapshot.forEach((doc) => {
            let r = doc.data();
            r.Pedhinamu_ID = doc.id;
            let vName = String(r.Village_Name || '').trim();
            
            let isMatch = (currentVillages.length > 0) && 
                          (vName !== '' && currentVillages.some(v => isSameVillage(vName, v)));
            if (isMatch) data.push(r);
        });

        data.sort((a, b) => {
            let t1 = (a.timestamp && a.timestamp.toMillis) ? a.timestamp.toMillis() : 0;
            let t2 = (b.timestamp && b.timestamp.toMillis) ? b.timestamp.toMillis() : 0;
            return t2 - t1;
        });

        allPedhinamuList = data;
        safeSetText('total-pedhinamu', toGujaratiDigits(allPedhinamuList.length));

        if (typeof renderPedhinamuList === 'function') renderPedhinamuList();
    }, (error) => {
        console.error("Pedhinamu Sync Error:", error);
    });
}

function updateDashboardStatsUI() {
    let currentVillages = (activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    let p = 0, d = 0, rCount = 0, c = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let villageCounts = {};
    currentVillages.forEach(v => villageCounts[v] = 0);

    noticesData.forEach(r => {
        let vName = String(r.Village_Name || r.village || '').trim();
        let matchedVill = currentVillages.find(v => isSameVillage(vName, v));
        if (matchedVill) {
            villageCounts[matchedVill] = (villageCounts[matchedVill] || 0) + 1;
        }

        let subD = r.Submitted_Date || r.SubmittedDate || r.submitted_date || '';
        let servedD = r.Served_Date || r.ServedDate || r.served_date || '';
        let isSubmitted = (String(r.Current_Status || '').includes("જમા") || !!subD);

        if (isSubmitted) {
            c++;
        } else if (servedD) {
            let sDate = parseUniversalDate(servedD);
            if (sDate && !isNaN(sDate.getTime())) {
                sDate.setHours(0, 0, 0, 0);
                let diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
                if (diffDays < 30) d++;
                else rCount++;
            } else { 
                p++; 
            }
        } else { 
            p++; 
        }
    });

    safeSetText('pending-notices', toGujaratiDigits(p));
    safeSetText('due-notices', toGujaratiDigits(d));
    safeSetText('completed-notices', toGujaratiDigits(c));
    safeSetText('total-pedhinamu', toGujaratiDigits(allPedhinamuList.length));

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

    let vStrip = document.getElementById('village-wise-stats-strip');
    if (vStrip && currentVillages.length > 0) {
        vStrip.innerHTML = currentVillages.map(v => {
            let shortVName = v.split('(')[0];
            return `<div class="v-stat-item"><span>${shortVName}:</span> <span class="v-stat-badge">${toGujaratiDigits(villageCounts[v] || 0)}</span></div>`;
        }).join('<span style="color:#e2e8f0;">|</span>');
        vStrip.style.display = 'flex';
    }

    renderNoticeChart(p, d + rCount, c);
}

// સુધારેલું નોટિસ ચાર્ટ ફંક્શન (No flickering, Fast Smooth Re-render)
function renderNoticeChart(pending, due, completed) {
    let chartElem = document.querySelector("#notices-chart-container");
    if (!chartElem || typeof ApexCharts === 'undefined') return;

    if (noticeApexChart) { 
        // આખું ઓપ્શન રીસેટ કરવાને બદલે સીરીઝ અપડેટ કરો
        noticeApexChart.updateSeries([pending, due, completed], true); 
    } else {
        chartElem.innerHTML = "";
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
        noticeApexChart = new ApexCharts(chartElem, options);
        noticeApexChart.render();
    }
}

function enforceMaxTodayOnDates() {
    let todayStr = new Date().toISOString().split('T')[0];
    const dateInputIds = [
        'notice-gen-date', 'notice-received-date', 'notice-served-date', 'notice-submitted-date',
        'edit-notice-gen-date', 'edit-notice-received-date', 'edit-notice-served-date', 'edit-notice-submitted-date',
        'inp-date', 'inp-deathdate', 'inp-affidavit-date',
        'prof-dob', 'prof-first-join', 'prof-rev-join', 'post-from', 'post-to'
    ];
    dateInputIds.forEach(id => { 
        let el = document.getElementById(id); 
        if (el) el.setAttribute('max', todayStr); 
    });
}

window.onload = function() {
    if (typeof setupLivePreview === 'function') setupLivePreview();
    enforceMaxTodayOnDates();
    checkLoginSession();
};

// =========================================================
// 5. PWA INSTALL PROMPT LOGIC
// =========================================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    let installContainer = document.getElementById('pwa-install-container');
    if (installContainer) installContainer.style.display = 'flex';
});

function installPWAApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        let installContainer = document.getElementById('pwa-install-container');
        if (installContainer) installContainer.style.display = 'none';
    });
}

window.addEventListener('appinstalled', () => {
    let installContainer = document.getElementById('pwa-install-container');
    if (installContainer) installContainer.style.display = 'none';
});

// =========================================================
// 6. SMART PHONETIC SEARCH (ENGLISH TO GUJARATI)
// =========================================================
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
            if (consonants.includes(char) && !matras.includes(nextChar) && nextChar !== virama) {
                if (nextChar && nextChar !== ' ' && nextChar !== '-' && nextChar !== '(') {
                    result += 'a';
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
        .replace(/w/g, 'v')
        .replace(/ee/g, 'i')
        .replace(/oo/g, 'u')
        .replace(/sh/g, 's')
        .replace(/aa/g, 'a')
        .replace(/([a-z])\1+/g, '$1')
        .replace(/\s+/g, '');
}

function matchesSmartSearch(sourceGujaratiText, searchQuery) {
    if (!sourceGujaratiText || !searchQuery) return false;
    let src = String(sourceGujaratiText).toLowerCase();
    let query = String(searchQuery).trim().toLowerCase();

    if (src.includes(query)) return true;

    let normSrc = normalizePhonetic(gujaratiToLatin(src));
    let normQuery = normalizePhonetic(query);
    if (normSrc.includes(normQuery)) return true;

    if (normQuery.length >= 3) {
        let skelSrc = normSrc.replace(/[aeiou]/g, '');
        let skelQuery = normQuery.replace(/[aeiou]/g, '');
        if (skelQuery.length >= 2 && skelSrc.includes(skelQuery)) return true;
    }
    return false;
}

// =========================================================
// 7. સ્કેલેટન શિમર જનરેટર & બેકડ્રોપ ટચ ડિસમિસ
// =========================================================
function getSkeletonCardsHtml(count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="skeleton-line" style="width: 38%; height: 16px;"></div>
                    <div class="skeleton-line" style="width: 22%; height: 12px;"></div>
                </div>
                <div class="skeleton-line" style="width: 65%; height: 13px;"></div>
                <div style="display:flex; gap: 8px;">
                    <div class="skeleton-line" style="width: 28%; height: 11px;"></div>
                    <div class="skeleton-line" style="width: 24%; height: 11px;"></div>
                    <div class="skeleton-line" style="width: 32%; height: 11px;"></div>
                </div>
            </div>
        `;
    }
    return html;
}

document.addEventListener('click', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
        if (e.target.id === 'modal-login') return;
        e.target.style.display = 'none';
    }
});