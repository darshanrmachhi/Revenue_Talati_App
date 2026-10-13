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
function toGujaratiDigits(val) {
    if (val === null || val === undefined || val === '') return '';
    const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return String(val).replace(/[0-9]/g, function(w) {
        return gujDigits[+w];
    });
}

function parseUniversalDate(dateStr) {
    if (!dateStr) return null;
    let s = String(dateStr).trim();
    if (s.includes('/')) {
        let parts = s.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
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
    if (!dStr) return "___/___/૨૦___";
    let d = parseUniversalDate(dStr);
    if (!d || isNaN(d.getTime())) return dStr;
    let day = ('0' + d.getDate()).slice(-2);
    let month = ('0' + (d.getMonth() + 1)).slice(-2);
    let year = d.getFullYear();
    let enFormatted = `${day}/${month}/${year}`;
    return toGujaratiDigits(enFormatted);
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

function loadDashboardData() {
    let currentVillages = (activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    let loadStatus = document.getElementById('loading-status');
    if (loadStatus) loadStatus.innerText = "(લોડ થાય છે...)";

    db.collection("Notices_135D").get().then((querySnapshot) => {
        let p = 0, d = 0, c = 0;
        querySnapshot.forEach((doc) => {
            let r = doc.data();
            if (currentVillages.length === 0 || currentVillages.includes(r.Village_Name) || !r.Village_Name) {
                let s = String(r.Current_Status || ''); 
                if (s.includes("બાકી")) p++; 
                else if (s.includes("મુદત")) d++; 
                else c++;
            }
        });
        let elP = document.getElementById('pending-notices');
        let elD = document.getElementById('due-notices');
        let elC = document.getElementById('completed-notices');
        if (elP) elP.innerText = toGujaratiDigits(p); 
        if (elD) elD.innerText = toGujaratiDigits(d); 
        if (elC) elC.innerText = toGujaratiDigits(c); 
        renderNoticeChart(p, d, c);
    });

    db.collection("Pedhinamu_Register").get().then((querySnapshot) => {
        let count = 0;
        querySnapshot.forEach((doc) => {
            if (currentVillages.length === 0 || currentVillages.includes(doc.data().Village_Name) || !doc.data().Village_Name) count++;
        });
        let elT = document.getElementById('total-pedhinamu');
        if (elT) elT.innerText = toGujaratiDigits(count); 
        if (loadStatus) loadStatus.innerText = ""; 
    }).catch((err) => { if (loadStatus) loadStatus.innerText = ""; });
}

function renderNoticeChart(pending, due, completed) {
    let chartElem = document.querySelector("#notices-chart-container");
    if (!chartElem || typeof ApexCharts === 'undefined') return;

    let options = {
        series: [pending, due, completed],
        chart: { type: 'donut', height: 220, fontFamily: 'Noto Sans Gujarati, sans-serif' },
        labels: ['બજાવવાની બાકી', 'મુદતમાં ચાલુ', 'કચેરીએ જમા'],
        colors: ['#ef4444', '#f59e0b', '#10b981'],
        legend: { position: 'bottom', fontSize: '12px' },
        dataLabels: { enabled: true },
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'કુલ નોટિસો', fontSize: '13px', fontWeight: 600, formatter: function (w) { return toGujaratiDigits(w.globals.seriesTotals.reduce((a, b) => a + b, 0)); } } } } } }
    };

    if (noticeApexChart) { noticeApexChart.updateOptions(options); } else {
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