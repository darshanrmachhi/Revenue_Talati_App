// js/135d.js

var currentVillageFilter = 'all';
var currentTypeFilter = 'all';
var currentEditingNoticeId = null;

var STANDARD_NOTICE_TYPES = [
    'વારસાઈ',
    'વેચાણ',
    'વહેંચણી',
    'હયાતીમાં હક્ક દાખલ',
    'બોજો દાખલ',
    'બોજો કમી',
    'અન્ય'
];

// =========================================================
// ૧. હેલ્પર ફંક્શન્સ (નોટિસ ડેટા રીડર્સ & સ્ટેટસ કેલ્ક્યુલેટર)
// =========================================================
function getNoticeType(item) {
    if (!item || typeof item !== 'object') return '';
    var directVal = item.Notice_Type || item.notice_type || item.NoticeType || 
                    item.type || item.Type || item.Notice_type || 
                    item.Prakar || item.prakar || item.Subject || item.Notice_Subject;
    if (directVal && String(directVal).trim() !== '' && String(directVal).trim() !== '-') {
        return String(directVal).trim();
    }
    var keys = Object.keys(item);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i].toLowerCase();
        if (k.includes('type') || k.includes('prakar') || k.includes('subject')) {
            var val = item[keys[i]];
            if (val && String(val).trim() !== '' && String(val).trim() !== '-') {
                return String(val).trim();
            }
        }
    }
    var rem = String(item.Remarks || item.remarks || '').trim();
    for (var j = 0; j < STANDARD_NOTICE_TYPES.length; j++) {
        if (rem.includes(STANDARD_NOTICE_TYPES[j])) {
            return STANDARD_NOTICE_TYPES[j];
        }
    }
    return '';
}

function getNoticeGenDate(item) {
    if (!item) return '';
    return item.Generated_Date || item.Notice_Date || item.NoticeDate || item.date || item.Date || '';
}

function getNoticeRecDate(item) {
    if (!item) return '';
    return item.Received_Date || item.ReceivedDate || item.received_date || item.Rec_Date || '';
}

function getNoticeServedDate(item) {
    if (!item) return '';
    return item.Served_Date || item.ServedDate || item.served_date || '';
}

function getNoticeSubDate(item) {
    if (!item) return '';
    return item.Submitted_Date || item.SubmittedDate || item.submitted_date || '';
}

// નોટિસની સ્થિતિ અને દિવસોની ગણતરી કરતું સેન્ટ્રલ ફંક્શન (No Duplication)
function evaluateNoticeStatus(item, todayDate) {
    var today = todayDate || new Date();
    today.setHours(0, 0, 0, 0);

    var servedD = getNoticeServedDate(item);
    var subD = getNoticeSubDate(item);
    var isSubmitted = (String(item.Current_Status || '').includes("જમા") || !!subD);
    var sDate = servedD ? parseUniversalDate(servedD) : null;
    var diffDays = null;

    if (sDate) {
        sDate.setHours(0, 0, 0, 0);
        diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
    }

    var state = 'pending';
    if (isSubmitted) {
        state = 'completed';
    } else if (servedD) {
        state = (diffDays !== null && diffDays >= 30) ? 'ready' : 'active';
    }

    return {
        state: state,
        isSubmitted: isSubmitted,
        servedD: servedD,
        subD: subD,
        diffDays: diffDays
    };
}

// =========================================================
// ૨. ૧૩૫-ડી ડેસ્ક લોડ કરવું (Central Data માંથી Instant Render)
// =========================================================
function loadNoticesDesk() {
    renderNoticeVillageFilters();
    renderNoticeTypeFilters();
    updateStatusTabsUIAndCounts();
    applyNoticeFilters();

    // જો કોઈ કારણસર સેન્ટ્રલ લિસનર ચાલુ ન હોય તો જ ચાલુ કરો
    if (!unsubscribeNotices && typeof loadDashboardData === 'function') {
        loadDashboardData();
    }
}

// =========================================================
// ૩. ગામ ફિલ્ટર બટન્સ (Chips)
// =========================================================
function renderNoticeVillageFilters() {
    var cont = document.getElementById('notice-village-filters');
    if (!cont) return;

    var currentVillages = (typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    if (currentVillages.length === 0) {
        cont.innerHTML = '';
        return;
    }

    // જો પસંદ કરેલું ગામ નવા સેજામાં ન હોય તો 'all' કરી દો
    if (currentVillageFilter !== 'all' && !currentVillages.some(function(v) { return isSameVillage(v, currentVillageFilter); })) {
        currentVillageFilter = 'all';
    }

    var counts = { all: noticesData.length };
    currentVillages.forEach(function(v) {
        counts[v] = noticesData.filter(function(n) {
            return isSameVillage(n.Village_Name || n.village, v);
        }).length;
    });

    var html = '<button class="village-filter-btn ' + (currentVillageFilter === 'all' ? 'active' : '') + '" onclick="switchNoticeVillage(\'all\', this)">' +
               '<i class="bi bi-grid-fill"></i> બધા ગામો <span class="badge-count">' + toGujaratiDigits(counts.all) + '</span></button>';

    currentVillages.forEach(function(v) {
        var isAct = (currentVillageFilter === v);
        html += '<button class="village-filter-btn ' + (isAct ? 'active' : '') + '" onclick="switchNoticeVillage(\'' + v + '\', this)">' +
                '<i class="bi bi-geo-alt-fill"></i> ' + v + ' <span class="badge-count">' + toGujaratiDigits(counts[v] || 0) + '</span></button>';
    });

    cont.innerHTML = html;
}

function switchNoticeVillage(vName, btnElem) {
    currentVillageFilter = vName;
    document.querySelectorAll('.village-filter-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btnElem) btnElem.classList.add('active');
    
    renderNoticeTypeFilters();
    updateStatusTabsUIAndCounts();
    applyNoticeFilters();
}

// =========================================================
// ૪. પ્રકાર ફિલ્ટર બટન્સ (Type Filter Chips)
// =========================================================
function renderNoticeTypeFilters() {
    var cont = document.getElementById('notice-type-filters');
    if (!cont) return;

    var baseList = noticesData;
    if (currentVillageFilter !== 'all') {
        baseList = noticesData.filter(function(n) {
            return isSameVillage(n.Village_Name || n.village, currentVillageFilter);
        });
    }

    var displayTypes = STANDARD_NOTICE_TYPES.slice();
    baseList.forEach(function(n) {
        var t = getNoticeType(n);
        if (t && displayTypes.indexOf(t) === -1) {
            displayTypes.push(t);
        }
    });

    var counts = { all: baseList.length };
    displayTypes.forEach(function(t) {
        counts[t] = baseList.filter(function(n) {
            var nt = getNoticeType(n);
            return nt && (nt.toLowerCase() === t.toLowerCase() || nt.includes(t) || t.includes(nt));
        }).length;
    });

    var html = '<button class="type-filter-btn ' + (currentTypeFilter === 'all' ? 'active' : '') + '" onclick="switchNoticeType(\'all\', this)">' +
               'બધા પ્રકાર <span class="badge-count">' + toGujaratiDigits(counts.all) + '</span></button>';

    displayTypes.forEach(function(t) {
        var count = counts[t] || 0;
        if (count > 0 || STANDARD_NOTICE_TYPES.indexOf(t) !== -1) {
            var isAct = (currentTypeFilter === t);
            html += '<button class="type-filter-btn ' + (isAct ? 'active' : '') + '" onclick="switchNoticeType(\'' + t + '\', this)">' +
                    t + ' <span class="badge-count">' + toGujaratiDigits(count) + '</span></button>';
        }
    });

    cont.innerHTML = html;
}

function switchNoticeType(tName, btnElem) {
    currentTypeFilter = tName;
    document.querySelectorAll('.type-filter-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btnElem) btnElem.classList.add('active');
    
    updateStatusTabsUIAndCounts();
    applyNoticeFilters();
}

// =========================================================
// ૫. સ્થિતિવાર ટેબ્સના કાઉન્ટ અને UI અપડેટ
// =========================================================
function updateStatusTabsUIAndCounts() {
    var baseList = noticesData.filter(function(item) {
        if (currentVillageFilter !== 'all') {
            if (!isSameVillage(item.Village_Name || item.village, currentVillageFilter)) return false;
        }
        if (currentTypeFilter !== 'all') {
            var nType = getNoticeType(item);
            if (!nType || (nType.toLowerCase() !== currentTypeFilter.toLowerCase() && !nType.includes(currentTypeFilter))) return false;
        }
        return true;
    });

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var counts = { all: baseList.length, pending: 0, active: 0, ready: 0, completed: 0 };

    baseList.forEach(function(item) {
        var st = evaluateNoticeStatus(item, today);
        if (counts[st.state] !== undefined) counts[st.state]++;
    });

    safeSetText('badge-tab-all', toGujaratiDigits(counts.all));
    safeSetText('badge-tab-pending', toGujaratiDigits(counts.pending));
    safeSetText('badge-tab-active', toGujaratiDigits(counts.active));
    safeSetText('badge-tab-ready', toGujaratiDigits(counts.ready));
    safeSetText('badge-tab-completed', toGujaratiDigits(counts.completed));

    document.querySelectorAll('.notice-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    var activeTabEl = document.getElementById('tab-btn-' + currentNoticeTab) || document.getElementById('tab-btn-all');
    if (activeTabEl) activeTabEl.classList.add('active');
}

function switchNoticeTab(tabKey, btnElem) {
    currentNoticeTab = tabKey;
    document.querySelectorAll('.notice-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btnElem) btnElem.classList.add('active');
    applyNoticeFilters();
}

function switchNoticeTabAndShow(tabKey) {
    currentNoticeTab = tabKey;
    showView('135d-desk');
}

// =========================================================
// ૬. ફિલ્ટરિંગ અને કાર્ડ્સ રેન્ડરિંગ લોજિક
// =========================================================
function applyNoticeFilters() {
    var query = safeGetValue('notice-search-input').toLowerCase();
    var clearBtn = document.getElementById('clear-notice-search');
    if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var filtered = noticesData.filter(function(item) {
        if (currentVillageFilter !== 'all') {
            if (!isSameVillage(item.Village_Name || item.village, currentVillageFilter)) return false;
        }

        if (currentTypeFilter !== 'all') {
            var nType = getNoticeType(item);
            var matchType = nType && (nType.toLowerCase() === currentTypeFilter.toLowerCase() || 
                            nType.includes(currentTypeFilter) || 
                            currentTypeFilter.includes(nType));
            if (!matchType) return false;
        }

        if (currentNoticeTab !== 'all') {
            var st = evaluateNoticeStatus(item, today);
            if (st.state !== currentNoticeTab) return false;
        }

        if (query) {
            var mNo = String(item.Mutation_No || '');
            var match = mNo.includes(query) || 
                        toGujaratiDigits(mNo).includes(query) ||
                        matchesSmartSearch(item.Khatedar_Name, query) || 
                        matchesSmartSearch(item.Village_Name || item.village, query) || 
                        matchesSmartSearch(getNoticeType(item), query);
            if (!match) return false;
        }

        return true;
    });

    renderNoticeList(filtered, today);
}

function filterNotices() { applyNoticeFilters(); }

function clearNoticeSearch() {
    safeSetValue('notice-search-input', '');
    applyNoticeFilters();
}

function renderNoticeList(list, today) {
    var container = document.getElementById('notice-list-container');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 45px 15px; color: #94a3b8; background: #ffffff; border-radius: 16px; border: 1.5px dashed #cbd5e1; margin-top: 10px;">
                <i class="bi bi-inbox" style="font-size: 38px; display:block; margin-bottom: 10px; color: #cbd5e1;"></i>
                <h4 style="font-size: 15px; margin: 0; color: #475569; font-weight: 700;">કોઈ ૧૩૫-ડી નોટિસ મળી નથી</h4>
                <p style="font-size: 12px; margin: 4px 0 0 0;">પસંદ કરેલા ફિલ્ટરમાં કોઈ રેકોર્ડ ઉપલબ્ધ નથી.</p>
            </div>
        `;
        return;
    }

    var html = list.map(function(item) {
        var st = evaluateNoticeStatus(item, today);
        var stateClass = 'state-' + st.state;
        var badgeHtml = '';

        if (st.state === 'completed') {
            badgeHtml = '<span class="notice-badge-pill badge-pill-completed"><i class="bi bi-check-circle-fill"></i> કચેરીએ જમા (' + formatDisplayDateGujarati(st.subD) + ')</span>';
        } else if (st.state === 'ready') {
            badgeHtml = '<span class="notice-badge-pill badge-pill-ready"><i class="bi bi-bell-fill"></i> ૩૦ દિવસ પૂર્ણ (' + toGujaratiDigits(st.diffDays) + ' દિવસ થયા)</span>';
        } else if (st.state === 'active') {
            var remaining = 30 - (st.diffDays || 0);
            badgeHtml = '<span class="notice-badge-pill badge-pill-active"><i class="bi bi-hourglass-split"></i> મુદતમાં (' + toGujaratiDigits(remaining) + ' દિવસ બાકી)</span>';
        } else {
            badgeHtml = '<span class="notice-badge-pill badge-pill-pending"><i class="bi bi-exclamation-triangle-fill"></i> બજવણી બાકી</span>';
        }

        var genDateDisplay = formatDisplayDateGujarati(getNoticeGenDate(item));
        var recDateDisplay = formatDisplayDateGujarati(getNoticeRecDate(item));
        var noticeTypeDisplay = getNoticeType(item) || '-';

        return `
            <div class="modern-notice-card ${stateClass}">
                <div style="flex: 1; min-width: 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:15px; font-weight:800; color:#0d47a1;">
                            નોંધ નં: ${toGujaratiDigits(item.Mutation_No)}
                        </span>
                        <span style="font-size:11px; color:#64748b; font-weight:600;">
                            મળ્યા: ${recDateDisplay}
                        </span>
                    </div>
                    <div style="font-size:13.5px; font-weight:700; color:#1e293b; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${item.Khatedar_Name || '-'}
                    </div>
                    <div style="font-size:11.5px; color:#475569; margin-bottom:6px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                        <span style="color:#0284c7; font-weight:700;"><i class="bi bi-geo-alt-fill"></i> ${item.Village_Name || item.village || '-'}</span>
                        <span style="color:#cbd5e1;">•</span>
                        <span style="background:#f1f5f9; padding:1px 6px; border-radius:4px; font-weight:600; color:#334155;">${noticeTypeDisplay}</span>
                        <span style="color:#cbd5e1;">•</span>
                        <span>તા: ${genDateDisplay}</span>
                    </div>
                    <div>${badgeHtml}</div>
                </div>
                <div style="margin-left:12px; align-self:center;">
                    <button class="btn-icon-circle" onclick="openEditNoticeModal('${item.id}')" title="સુધારો કરો" style="background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#1e3a8a; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                        <i class="bi bi-pencil-fill" style="font-size:13px;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// =========================================================
// ૭. નવી નોટિસ ઉમેરવી & એડિટિંગ
// =========================================================
function openNewNoticeModal() {
    var todayStr = new Date().toISOString().split('T')[0];
    
    safeSetValue('notice-mutation-no', '');
    safeSetValue('notice-khatedar', '');
    safeSetValue('notice-type', 'વારસાઈ');
    safeSetValue('notice-gen-date', todayStr);
    safeSetValue('notice-received-date', todayStr);
    safeSetValue('notice-served-date', '');
    safeSetValue('notice-submitted-date', '');
    safeSetValue('notice-remarks', '');

    var vSel = document.getElementById('notice-village');
    if (vSel && typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) {
        vSel.innerHTML = activeSeja.villages.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
        if (currentVillageFilter !== 'all') vSel.value = currentVillageFilter;
    }

    document.getElementById('modal-new-notice').style.display = 'flex';
}

function saveNewNotice() {
    var mutationNo = safeGetValue('notice-mutation-no');
    var village = safeGetValue('notice-village');
    var khatedar = safeGetValue('notice-khatedar');
    var type = safeGetValue('notice-type');
    var genDate = safeGetValue('notice-gen-date');
    var recDate = safeGetValue('notice-received-date');
    var servedDate = safeGetValue('notice-served-date');
    var subDate = safeGetValue('notice-submitted-date');
    var remarks = safeGetValue('notice-remarks');

    if (!mutationNo) { alert("કૃપા કરી નોંધ નંબર દાખલ કરો."); return; }
    if (!village) { alert("કૃપા કરી ગામ પસંદ કરો."); return; }
    if (!khatedar) { alert("કૃપા કરી ખાતેદારનું નામ દાખલ કરો."); return; }

    var status = "બજાવવાની બાકી";
    if (subDate) status = "કચેરીએ જમા";
    else if (servedDate) status = "મુદતમાં";

    var btn = document.getElementById('btn-save-notice');
    if (btn) { btn.disabled = true; btn.innerText = "સેવ થાય છે..."; }

    db.collection("Notices_135D").add({
        Mutation_No: mutationNo,
        Village_Name: village,
        Khatedar_Name: khatedar,
        Notice_Type: type,
        Generated_Date: genDate,
        Notice_Date: genDate,
        Received_Date: recDate,
        Served_Date: servedDate,
        Submitted_Date: subDate,
        Remarks: remarks,
        Current_Status: status,
        Seja_Name: (typeof activeSeja !== 'undefined' && activeSeja) ? activeSeja.sejaName : "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        if (btn) { btn.disabled = false; btn.innerText = "સેવ કરો"; }
        document.getElementById('modal-new-notice').style.display = 'none';
        showToast("નવી ૧૩૫-ડી નોટિસ ઉમેરાઈ ગઈ!");
    }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.innerText = "સેવ કરો"; }
        alert("એરર: " + err.message);
    });
}

function openEditNoticeModal(id) {
    var item = noticesData.find(function(n) { return n.id === id; });
    if (!item) return;

    currentEditingNoticeId = id;
    safeSetValue('edit-notice-id', id);
    safeSetValue('edit-notice-mutation-no', item.Mutation_No);
    safeSetValue('edit-notice-khatedar', item.Khatedar_Name);
    safeSetValue('edit-notice-type', getNoticeType(item) || 'વારસાઈ');

    safeSetValue('edit-notice-gen-date', formatForDateInput(getNoticeGenDate(item)));
    safeSetValue('edit-notice-received-date', formatForDateInput(getNoticeRecDate(item)));
    safeSetValue('edit-notice-served-date', formatForDateInput(getNoticeServedDate(item)));
    safeSetValue('edit-notice-submitted-date', formatForDateInput(getNoticeSubDate(item)));
    safeSetValue('edit-notice-remarks', item.Remarks || '');

    var vSel = document.getElementById('edit-notice-village');
    if (vSel && typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) {
        var opts = activeSeja.villages.slice();
        var curVill = item.Village_Name || item.village;
        if (curVill && !opts.some(function(v) { return isSameVillage(v, curVill); })) {
            opts.push(curVill);
        }
        vSel.innerHTML = opts.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
        vSel.value = curVill;
    }

    var statusSel = document.getElementById('edit-notice-status');
    var subD = getNoticeSubDate(item);
    var servD = getNoticeServedDate(item);
    if (statusSel) {
        if (subD || String(item.Current_Status).includes('જમા')) statusSel.value = 'કચેરીએ જમા';
        else if (servD) statusSel.value = 'મુદતમાં';
        else statusSel.value = 'બજાવવાની બાકી';
    }

    toggleSubmittedDateInput();
    document.getElementById('modal-edit-notice').style.display = 'flex';
}

function toggleSubmittedDateInput() {
    var sVal = safeGetValue('edit-notice-status');
    var grp = document.getElementById('grp-submitted-date');
    if (grp) {
        grp.style.display = (sVal === 'કચેરીએ જમા') ? 'block' : 'none';
    }
}

function submitNoticeUpdate() {
    if (!currentEditingNoticeId) return;

    var mutationNo = safeGetValue('edit-notice-mutation-no');
    var village = safeGetValue('edit-notice-village');
    var khatedar = safeGetValue('edit-notice-khatedar');
    var type = safeGetValue('edit-notice-type');
    var genDate = safeGetValue('edit-notice-gen-date');
    var recDate = safeGetValue('edit-notice-received-date');
    var servedDate = safeGetValue('edit-notice-served-date');
    var subDate = safeGetValue('edit-notice-submitted-date');
    var status = safeGetValue('edit-notice-status');
    var remarks = safeGetValue('edit-notice-remarks');

    // જો 'કચેરીએ જમા' સિલેક્ટ કર્યું હોય અને તારીખ ખાલી હોય તો આજની તારીખ લઈ લો
    if (status === 'કચેરીએ જમા' && !subDate) {
        subDate = new Date().toISOString().split('T')[0];
    }

    var btn = document.getElementById('btn-update-notice');
    if (btn) { btn.disabled = true; btn.innerText = "અપડેટ થાય છે..."; }

    db.collection("Notices_135D").doc(currentEditingNoticeId).update({
        Mutation_No: mutationNo,
        Village_Name: village,
        Khatedar_Name: khatedar,
        Notice_Type: type,
        Generated_Date: genDate,
        Notice_Date: genDate,
        Received_Date: recDate,
        Served_Date: servedDate,
        Submitted_Date: (status === 'કચેરીએ જમા') ? subDate : '',
        Current_Status: status,
        Remarks: remarks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        if (btn) { btn.disabled = false; btn.innerText = "સુધારો સેવ કરો"; }
        document.getElementById('modal-edit-notice').style.display = 'none';
        showToast("નોટિસ સફળતાપૂર્વક અપડેટ થઈ!");
    }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.innerText = "સુધારો સેવ કરો"; }
        alert("એરર: " + err.message);
    });
}

function deleteNoticeAction() {
    if (!currentEditingNoticeId) return;
    if (!confirm("શું તમે આ ૧૩૫-ડી નોટિસ ખરેખર રદ (Delete) કરવા માંગો છો?")) return;

    db.collection("Notices_135D").doc(currentEditingNoticeId).delete().then(function() {
        document.getElementById('modal-edit-notice').style.display = 'none';
        showToast("નોટિસ રદ થઈ ગઈ!");
    }).catch(function(err) { alert("ડિલીટ એરર: " + err.message); });
}