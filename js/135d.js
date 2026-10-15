// js/135d.js

let noticesData = [];
let currentNoticeTab = 'pending';  // ડિફોલ્ટ: બજાવવાની બાકી
let currentVillageFilter = 'all';  // ડિફોલ્ટ: બધા ગામો
let currentTypeFilter = 'all';     // ડિફોલ્ટ: બધા પ્રકાર
let unsubscribeNotices = null;
let currentEditingNoticeId = null;

// પ્રમાણિત નોંધના પ્રકારો
const STANDARD_NOTICE_TYPES = [
    'વારસાઈ',
    'વેચાણ',
    'વહેંચણી',
    'હયાતીમાં હક્ક દાખલ',
    'બોજો દાખલ',
    'બોજો કમી',
    'અન્ય'
];

// =========================================================
// ૧. લાઈવ નોટિસ ડેટા લોડ કરવો (Safe Snapshot without server orderBy)
// =========================================================
function loadNoticesDesk() {
    renderNoticeVillageFilters();
    renderNoticeTypeFilters();

    let container = document.getElementById('notice-list-container');
    if (container && noticesData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#777; margin-top:20px;"><i class="fa-solid fa-spinner fa-spin"></i> નોટિસો લોડ થઈ રહી છે...</p>';
    }

    if (unsubscribeNotices) {
        unsubscribeNotices();
    }

    let currentVillages = (typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) ? activeSeja.villages : [];

    // સીધું કલેક્શન લાવો (કોઈ સર્વર ઇન્ડેક્સની જરૂર નથી)
    unsubscribeNotices = db.collection("Notices_135D").onSnapshot((querySnapshot) => {
        let list = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id;
            
            // સેજાના ગામો સાથે સુસંગતતા ચકાસો
            let vName = String(data.Village_Name || '').trim();
            let isMatch = (currentVillages.length === 0) || 
                          currentVillages.some(v => vName.includes(v) || v.includes(vName)) || 
                          !vName;

            if (isMatch) {
                list.push(data);
            }
        });

        // જાવાસ્ક્રિપ્ટ મેમરીમાં નવી નોંધો ઉપર આવે તે રીતે સૉર્ટ કરો
        list.sort((a, b) => {
            let timeA = 0;
            let timeB = 0;

            if (a.createdAt && a.createdAt.toDate) timeA = a.createdAt.toDate().getTime();
            else if (a.Received_Date) timeA = new Date(a.Received_Date).getTime() || 0;

            if (b.createdAt && b.createdAt.toDate) timeB = b.createdAt.toDate().getTime();
            else if (b.Received_Date) timeB = new Date(b.Received_Date).getTime() || 0;

            return timeB - timeA;
        });

        noticesData = list;
        renderNoticeVillageFilters();
        renderNoticeTypeFilters();
        applyNoticeFilters();
    }, (error) => {
        console.error("Firestore 135D Error:", error);
        if (container) {
            container.innerHTML = `<p style="text-align:center; color:#dc2626; padding: 20px;">ડેટા લાવવામાં એરર: ${error.message}</p>`;
        }
    });
}

// =========================================================
// ૨. ગામ ફિલ્ટર બટન્સ (Chips)
// =========================================================
function renderNoticeVillageFilters() {
    let cont = document.getElementById('notice-village-filters');
    if (!cont) return;

    let currentVillages = (typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    if (currentVillages.length === 0) {
        cont.innerHTML = '';
        return;
    }

    let counts = { all: noticesData.length };
    currentVillages.forEach(v => {
        counts[v] = noticesData.filter(n => {
            let vn = String(n.Village_Name || '').trim();
            return vn.includes(v) || v.includes(vn);
        }).length;
    });

    let html = `
        <button class="village-filter-btn ${currentVillageFilter === 'all' ? 'active' : ''}" onclick="switchNoticeVillage('all', this)">
            <i class="bi bi-grid-fill"></i> બધા ગામો <span class="badge-count">${toGujaratiDigits(counts.all)}</span>
        </button>
    `;

    currentVillages.forEach(v => {
        let isAct = (currentVillageFilter === v);
        html += `
            <button class="village-filter-btn ${isAct ? 'active' : ''}" onclick="switchNoticeVillage('${v}', this)">
                <i class="bi bi-geo-alt-fill"></i> ${v} <span class="badge-count">${toGujaratiDigits(counts[v] || 0)}</span>
            </button>
        `;
    });

    cont.innerHTML = html;
}

function switchNoticeVillage(vName, btnElem) {
    currentVillageFilter = vName;
    document.querySelectorAll('.village-filter-btn').forEach(b => b.classList.remove('active'));
    if (btnElem) btnElem.classList.add('active');
    
    renderNoticeTypeFilters();
    applyNoticeFilters();
}

// =========================================================
// ૩. પ્રકાર ફિલ્ટર બટન્સ (Type Filter Chips)
// =========================================================
function renderNoticeTypeFilters() {
    let cont = document.getElementById('notice-type-filters');
    if (!cont) return;

    let baseList = noticesData;
    if (currentVillageFilter !== 'all') {
        baseList = noticesData.filter(n => {
            let vn = String(n.Village_Name || '').trim();
            return vn.includes(currentVillageFilter) || currentVillageFilter.includes(vn);
        });
    }

    let counts = { all: baseList.length };
    STANDARD_NOTICE_TYPES.forEach(t => {
        counts[t] = baseList.filter(n => String(n.Notice_Type || '').trim() === t).length;
    });

    let html = `
        <button class="type-filter-btn ${currentTypeFilter === 'all' ? 'active' : ''}" onclick="switchNoticeType('all', this)">
            બધા પ્રકાર <span class="badge-count">${toGujaratiDigits(counts.all)}</span>
        </button>
    `;

    STANDARD_NOTICE_TYPES.forEach(t => {
        let count = counts[t] || 0;
        let isAct = (currentTypeFilter === t);
        html += `
            <button class="type-filter-btn ${isAct ? 'active' : ''}" onclick="switchNoticeType('${t}', this)">
                ${t} <span class="badge-count">${toGujaratiDigits(count)}</span>
            </button>
        `;
    });

    cont.innerHTML = html;
}

function switchNoticeType(tName, btnElem) {
    currentTypeFilter = tName;
    document.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
    if (btnElem) btnElem.classList.add('active');
    applyNoticeFilters();
}

// =========================================================
// ૪. સ્થિતિ ટેબ સ્વિચિંગ
// =========================================================
function switchNoticeTab(tabKey, btnElem) {
    currentNoticeTab = tabKey;
    document.querySelectorAll('.notice-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btnElem) btnElem.classList.add('active');
    applyNoticeFilters();
}

function switchNoticeTabAndShow(tabKey) {
    showView('135d-desk');
    currentNoticeTab = tabKey;
    
    const tabs = document.querySelectorAll('.notice-tabs .tab-btn');
    tabs.forEach(t => t.classList.remove('active'));

    const tabMap = { 'all': 0, 'pending': 1, 'active': 2, 'ready': 3, 'completed': 4 };
    let idx = tabMap[tabKey];
    if (idx !== undefined && tabs[idx]) {
        tabs[idx].classList.add('active');
    }

    applyNoticeFilters();
}

// =========================================================
// ૫. ફિલ્ટરિંગ અને કાર્ડ્સ રેન્ડરિંગ લોજિક
// =========================================================
function applyNoticeFilters() {
    let query = document.getElementById('notice-search-input') ? document.getElementById('notice-search-input').value.trim().toLowerCase() : '';
    let clearBtn = document.getElementById('clear-notice-search');
    if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = noticesData.filter((item) => {
        // ૧. ગામ ફિલ્ટર
        if (currentVillageFilter !== 'all') {
            let vName = String(item.Village_Name || '').trim();
            let matchesVillage = vName.includes(currentVillageFilter) || currentVillageFilter.includes(vName);
            if (!matchesVillage) return false;
        }

        // ૨. પ્રકાર ફિલ્ટર
        if (currentTypeFilter !== 'all') {
            let nType = String(item.Notice_Type || '').trim();
            if (nType !== currentTypeFilter) return false;
        }

        // ૩. સ્થિતિ ફિલ્ટર
        let isSubmitted = (String(item.Current_Status || '').includes("જમા") || !!item.Submitted_Date);
        let sDate = item.Served_Date ? parseUniversalDate(item.Served_Date) : null;
        let diffDays = null;
        if (sDate) {
            sDate.setHours(0, 0, 0, 0);
            diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
        }

        if (currentNoticeTab === 'pending') {
            if (isSubmitted || item.Served_Date) return false;
        } else if (currentNoticeTab === 'active') {
            if (isSubmitted || !item.Served_Date || (diffDays !== null && diffDays >= 30)) return false;
        } else if (currentNoticeTab === 'ready') {
            if (isSubmitted || !item.Served_Date || (diffDays !== null && diffDays < 30)) return false;
        } else if (currentNoticeTab === 'completed') {
            if (!isSubmitted) return false;
        }

        // ૪. સર્ચ ટેક્સ્ટ ફિલ્ટર
        if (query) {
            let mNo = String(item.Mutation_No || '');
            let khatedar = String(item.Khatedar_Name || '').toLowerCase();
            let vill = String(item.Village_Name || '').toLowerCase();
            let type = String(item.Notice_Type || '').toLowerCase();

            let match = mNo.includes(query) || 
                        toGujaratiDigits(mNo).includes(query) ||
                        khatedar.includes(query) || 
                        vill.includes(query) || 
                        type.includes(query);
            if (!match) return false;
        }

        return true;
    });

    renderNoticeList(filtered);
}

function filterNotices(val) {
    applyNoticeFilters();
}

function clearNoticeSearch() {
    let inp = document.getElementById('notice-search-input');
    if (inp) inp.value = '';
    applyNoticeFilters();
}

function renderNoticeList(list) {
    let container = document.getElementById('notice-list-container');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 10px; color: #94a3b8;">
                <i class="bi bi-inbox" style="font-size: 32px; display:block; margin-bottom: 8px;"></i>
                <p style="font-size: 14px; margin: 0;">પસંદ કરેલ ફિલ્ટરમાં કોઈ ૧૩૫-ડી નોટિસ મળી નથી.</p>
            </div>
        `;
        return;
    }

    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = list.map(item => {
        let isSubmitted = (String(item.Current_Status || '').includes("જમા") || !!item.Submitted_Date);
        let sDate = item.Served_Date ? parseUniversalDate(item.Served_Date) : null;
        let diffDays = null;
        if (sDate) {
            sDate.setHours(0, 0, 0, 0);
            diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
        }

        let borderClass = 'border-red';
        let statusBadge = '';

        if (isSubmitted) {
            borderClass = 'border-emerald';
            statusBadge = `<span style="color:#059669; font-weight:700;"><i class="bi bi-check-circle-fill"></i> કચેરીએ જમા (${formatDisplayDateGujarati(item.Submitted_Date)})</span>`;
        } else if (item.Served_Date) {
            if (diffDays !== null && diffDays >= 30) {
                borderClass = 'border-indigo';
                statusBadge = `<span style="color:#4f46e5; font-weight:700;"><i class="bi bi-bell-fill"></i> ૩૦ દિવસ પૂર્ણ (${toGujaratiDigits(diffDays)} દિવસ થયા)</span>`;
            } else {
                borderClass = 'border-amber';
                let remaining = 30 - (diffDays || 0);
                statusBadge = `<span style="color:#d97706; font-weight:700;"><i class="bi bi-hourglass-split"></i> મુદતમાં (${toGujaratiDigits(remaining)} દિવસ બાકી)</span>`;
            }
        } else {
            borderClass = 'border-red';
            statusBadge = `<span style="color:#dc2626; font-weight:700;"><i class="bi bi-exclamation-triangle-fill"></i> બજવણી બાકી</span>`;
        }

        return `
            <div class="notice-card ${borderClass}" style="background:#fff; border-radius:10px; padding:14px 16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.06); display:flex; justify-content:space-between; align-items:flex-start; border-left: 4px solid;">
                <div style="flex: 1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <h4 style="margin:0; font-size:16px; font-weight:700; color:#0d47a1;">નોંધ નં: ${toGujaratiDigits(item.Mutation_No)}</h4>
                        <span style="font-size:11px; color:#64748b;">મળ્યા: ${formatDisplayDateGujarati(item.Received_Date)}</span>
                    </div>
                    <div style="font-size:13px; font-weight:600; color:#1e293b; margin-bottom:3px;">
                        ખાતેદાર: ${item.Khatedar_Name || '-'}
                    </div>
                    <div style="font-size:12px; color:#475569; margin-bottom:6px;">
                        <span style="color:#0284c7; font-weight:600;">${item.Village_Name || '-'}</span> | 
                        <span style="background:#f1f5f9; padding:1px 6px; border-radius:4px; font-weight:600; color:#334155;">${item.Notice_Type || '-'}</span> | 
                        નોટિસ તા: ${formatDisplayDateGujarati(item.Generated_Date)}
                    </div>
                    <div style="font-size:12px;">
                        ${statusBadge}
                    </div>
                </div>
                <div style="margin-left:12px; align-self:center;">
                    <button class="btn-icon-circle" onclick="openEditNoticeModal('${item.id}')" title="સુધારો કરો" style="background:#f1f5f9; border:none; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#334155;">
                        <i class="bi bi-pencil-fill" style="font-size:13px;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// =========================================================
// ૬. મોડલ્સ (નવી નોટિસ & એડિટિંગ)
// =========================================================
function openNewNoticeModal() {
    let todayStr = new Date().toISOString().split('T')[0];
    
    safeSetValue('notice-mutation-no', '');
    safeSetValue('notice-khatedar', '');
    safeSetValue('notice-type', 'વારસાઈ');
    safeSetValue('notice-gen-date', todayStr);
    safeSetValue('notice-received-date', todayStr);
    safeSetValue('notice-served-date', '');
    safeSetValue('notice-submitted-date', '');
    safeSetValue('notice-remarks', '');

    let vSel = document.getElementById('notice-village');
    if (vSel && typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) {
        vSel.innerHTML = activeSeja.villages.map(v => `<option value="${v}">${v}</option>`).join('');
    }

    document.getElementById('modal-new-notice').style.display = 'flex';
}

function saveNewNotice() {
    let mutationNo = safeGetValue('notice-mutation-no');
    let village = safeGetValue('notice-village');
    let khatedar = safeGetValue('notice-khatedar');
    let type = safeGetValue('notice-type');
    let genDate = safeGetValue('notice-gen-date');
    let recDate = safeGetValue('notice-received-date');
    let servedDate = safeGetValue('notice-served-date');
    let subDate = safeGetValue('notice-submitted-date');
    let remarks = safeGetValue('notice-remarks');

    if (!mutationNo) { alert("કૃપા કરી નોંધ નંબર દાખલ કરો."); return; }
    if (!village) { alert("કૃપા કરી ગામ પસંદ કરો."); return; }
    if (!khatedar) { alert("કૃપા કરી ખાતેદારનું નામ દાખલ કરો."); return; }

    let status = "બજાવવાની બાકી";
    if (subDate) status = "કચેરીએ જમા";
    else if (servedDate) status = "મુદતમાં";

    let btn = document.getElementById('btn-save-notice');
    if (btn) { btn.disabled = true; btn.innerText = "સેવ થાય છે..."; }

    db.collection("Notices_135D").add({
        Mutation_No: mutationNo,
        Village_Name: village,
        Khatedar_Name: khatedar,
        Notice_Type: type,
        Generated_Date: genDate,
        Received_Date: recDate,
        Served_Date: servedDate,
        Submitted_Date: subDate,
        Remarks: remarks,
        Current_Status: status,
        Seja_Name: (typeof activeSeja !== 'undefined' && activeSeja) ? activeSeja.sejaName : "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        if (btn) { btn.disabled = false; btn.innerText = "સેવ કરો"; }
        document.getElementById('modal-new-notice').style.display = 'none';
        showToast("નવી ૧૩૫-ડી નોટિસ ઉમેરાઈ ગઈ!");
    }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerText = "સેવ કરો"; }
        alert("એરર: " + err.message);
    });
}

function openEditNoticeModal(id) {
    let item = noticesData.find(n => n.id === id);
    if (!item) return;

    currentEditingNoticeId = id;
    safeSetValue('edit-notice-id', id);
    safeSetValue('edit-notice-mutation-no', item.Mutation_No);
    safeSetValue('edit-notice-khatedar', item.Khatedar_Name);
    safeSetValue('edit-notice-type', item.Notice_Type || 'વારસાઈ');
    safeSetValue('edit-notice-gen-date', formatForDateInput(item.Generated_Date));
    safeSetValue('edit-notice-received-date', formatForDateInput(item.Received_Date));
    safeSetValue('edit-notice-served-date', formatForDateInput(item.Served_Date));
    safeSetValue('edit-notice-submitted-date', formatForDateInput(item.Submitted_Date));
    safeSetValue('edit-notice-remarks', item.Remarks || '');

    let vSel = document.getElementById('edit-notice-village');
    if (vSel && typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) {
        vSel.innerHTML = activeSeja.villages.map(v => `<option value="${v}">${v}</option>`).join('');
        vSel.value = item.Village_Name;
    }

    let statusSel = document.getElementById('edit-notice-status');
    if (statusSel) {
        if (item.Submitted_Date || String(item.Current_Status).includes('જમા')) statusSel.value = 'કચેરીએ જમા';
        else if (item.Served_Date) statusSel.value = 'મુદતમાં';
        else statusSel.value = 'બજાવવાની બાકી';
    }

    toggleSubmittedDateInput();
    document.getElementById('modal-edit-notice').style.display = 'flex';
}

function toggleSubmittedDateInput() {
    let sVal = document.getElementById('edit-notice-status').value;
    let grp = document.getElementById('grp-submitted-date');
    if (grp) {
        grp.style.display = (sVal === 'કચેરીએ જમા') ? 'block' : 'none';
    }
}

function submitNoticeUpdate() {
    if (!currentEditingNoticeId) return;

    let mutationNo = safeGetValue('edit-notice-mutation-no');
    let village = safeGetValue('edit-notice-village');
    let khatedar = safeGetValue('edit-notice-khatedar');
    let type = safeGetValue('edit-notice-type');
    let genDate = safeGetValue('edit-notice-gen-date');
    let recDate = safeGetValue('edit-notice-received-date');
    let servedDate = safeGetValue('edit-notice-served-date');
    let subDate = safeGetValue('edit-notice-submitted-date');
    let status = safeGetValue('edit-notice-status');
    let remarks = safeGetValue('edit-notice-remarks');

    let btn = document.getElementById('btn-update-notice');
    if (btn) { btn.disabled = true; btn.innerText = "અપડેટ થાય છે..."; }

    db.collection("Notices_135D").doc(currentEditingNoticeId).update({
        Mutation_No: mutationNo,
        Village_Name: village,
        Khatedar_Name: khatedar,
        Notice_Type: type,
        Generated_Date: genDate,
        Received_Date: recDate,
        Served_Date: servedDate,
        Submitted_Date: (status === 'કચેરીએ જમા') ? subDate : '',
        Current_Status: status,
        Remarks: remarks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        if (btn) { btn.disabled = false; btn.innerText = "સુધારો સેવ કરો"; }
        document.getElementById('modal-edit-notice').style.display = 'none';
        showToast("નોટિસ સફળતાપૂર્વક અપડેટ થઈ!");
    }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerText = "સુધારો સેવ કરો"; }
        alert("એરર: " + err.message);
    });
}

function deleteNoticeAction() {
    if (!currentEditingNoticeId) return;
    if (!confirm("શું તમે આ ૧૩૫-ડી નોટિસ ખરેખર રદ (Delete) કરવા માંગો છો?")) return;

    db.collection("Notices_135D").doc(currentEditingNoticeId).delete().then(() => {
        document.getElementById('modal-edit-notice').style.display = 'none';
        showToast("નોટિસ રદ થઈ ગઈ!");
    }).catch(err => alert("ડિલીટ એરર: " + err.message));
}