// js/135d.js

var noticesData = [];
var currentVillageFilter = 'all';
var currentTypeFilter = 'all';
var unsubscribeNotices = null;
var currentEditingNoticeId = null;

// સ્ટાન્ડર્ડ પ્રકારો
var STANDARD_NOTICE_TYPES = [
    'વારસાઈ',
    'વેચાણ',
    'વહેંચણી',
    'હયાતીમાં હક્ક દાખલ',
    'બોજો દાખલ',
    'બોજો કમી',
    'અન્ય'
];

// ગામના મૂળ નામને અલગ કરવું: દા.ત. 'ચારણગામ (સા)' કે 'ચારણગામ(સાલાવાડા)' બંનેમાંથી 'ચારણગામ' મળશે
function getVillageBase(name) {
    if (!name) return '';
    return String(name).split('(')[0].replace(/[\s\-_]/g, '').trim().toLowerCase();
}

function isSameVillage(v1, v2) {
    if (!v1 || !v2) return false;
    var b1 = getVillageBase(v1);
    var b2 = getVillageBase(v2);
    return (b1 && b2 && b1 === b2);
}

// ડેટાબેઝના જુદા-જુદા ફિલ્ડ નેમ્સમાંથી સાચી વિગતો મેળવવા માટેના સેફ હેલ્પર્સ
function getNoticeType(item) {
    if (!item) return '';
    return String(item.Notice_Type || item.type || item.Type || item.NoticeType || '').trim();
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

// =========================================================
// ૧. લાઈવ નોટિસ ડેટા લોડ કરવો
// =========================================================
function loadNoticesDesk() {
    renderNoticeVillageFilters();
    renderNoticeTypeFilters();

    var container = document.getElementById('notice-list-container');
    if (container && noticesData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#777; margin-top:20px;"><i class="fa-solid fa-spinner fa-spin"></i> નોટિસો લોડ થઈ રહી છે...</p>';
    }

    if (unsubscribeNotices) {
        unsubscribeNotices();
    }

    var currentVillages = (typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) ? activeSeja.villages : [];

    unsubscribeNotices = db.collection("Notices_135D").onSnapshot(function(querySnapshot) {
        var list = [];
        querySnapshot.forEach(function(doc) {
            var data = doc.data();
            data.id = doc.id;
            
            var vName = String(data.Village_Name || data.village || '').trim();
            var isMatch = (currentVillages.length === 0) || 
                          currentVillages.some(function(v) { return isSameVillage(vName, v); });

            if (isMatch) {
                list.push(data);
            }
        });

        // નવી નોંધો ઉપર આવે તે રીતે સૉર્ટ કરો
        list.sort(function(a, b) {
            var timeA = 0;
            var timeB = 0;
            if (a.createdAt && a.createdAt.toDate) timeA = a.createdAt.toDate().getTime();
            else if (getNoticeRecDate(a)) timeA = new Date(parseUniversalDate(getNoticeRecDate(a))).getTime() || 0;

            if (b.createdAt && b.createdAt.toDate) timeB = b.createdAt.toDate().getTime();
            else if (getNoticeRecDate(b)) timeB = new Date(parseUniversalDate(getNoticeRecDate(b))).getTime() || 0;

            return timeB - timeA;
        });

        noticesData = list;
        renderNoticeVillageFilters();
        renderNoticeTypeFilters();
        applyNoticeFilters();
    }, function(error) {
        console.error("Firestore 135D Error:", error);
        if (container) {
            container.innerHTML = '<p style="text-align:center; color:#dc2626; padding: 20px;">ડેટા લાવવામાં એરર: ' + error.message + '</p>';
        }
    });
}

// =========================================================
// ૨. ગામ ફિલ્ટર બટન્સ (Chips)
// =========================================================
function renderNoticeVillageFilters() {
    var cont = document.getElementById('notice-village-filters');
    if (!cont) return;

    var currentVillages = (typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    if (currentVillages.length === 0) {
        cont.innerHTML = '';
        return;
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
    applyNoticeFilters();
}

// =========================================================
// ૩. પ્રકાર ફિલ્ટર બટન્સ (ડાયનેમિક & સચોટ કાઉન્ટ)
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

    // ડેટાબેઝમાં હયાત હોય તેવા તમામ પ્રકારો આપોઆપ શોધો
    var typesInDb = [];
    baseList.forEach(function(n) {
        var t = getNoticeType(n);
        if (t && typesInDb.indexOf(t) === -1) {
            typesInDb.push(t);
        }
    });

    // સ્ટાન્ડર્ડ પ્રકારો અને ડેટાબેઝના પ્રકારો ભેગા કરો
    var displayTypes = STANDARD_NOTICE_TYPES.slice();
    typesInDb.forEach(function(t) {
        if (displayTypes.indexOf(t) === -1) {
            displayTypes.push(t);
        }
    });

    var counts = { all: baseList.length };
    displayTypes.forEach(function(t) {
        counts[t] = baseList.filter(function(n) {
            var nt = getNoticeType(n);
            return nt === t || nt.toLowerCase() === t.toLowerCase();
        }).length;
    });

    var html = '<button class="type-filter-btn ' + (currentTypeFilter === 'all' ? 'active' : '') + '" onclick="switchNoticeType(\'all\', this)">' +
               'બધા પ્રકાર <span class="badge-count">' + toGujaratiDigits(counts.all) + '</span></button>';

    displayTypes.forEach(function(t) {
        var count = counts[t] || 0;
        // જો તે પ્રકારની ૦ નોંધો હોય અને તે સ્ટાન્ડર્ડ ન હોય તો ન બતાવો, સ્ટાન્ડર્ડ હોય તો બતાવો
        var isAct = (currentTypeFilter === t);
        html += '<button class="type-filter-btn ' + (isAct ? 'active' : '') + '" onclick="switchNoticeType(\'' + t + '\', this)">' +
                t + ' <span class="badge-count">' + toGujaratiDigits(count) + '</span></button>';
    });

    cont.innerHTML = html;
}

function switchNoticeType(tName, btnElem) {
    currentTypeFilter = tName;
    document.querySelectorAll('.type-filter-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btnElem) btnElem.classList.add('active');
    applyNoticeFilters();
}

function switchNoticeTab(tabKey, btnElem) {
    currentNoticeTab = tabKey;
    document.querySelectorAll('.notice-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btnElem) btnElem.classList.add('active');
    applyNoticeFilters();
}

function switchNoticeTabAndShow(tabKey) {
    showView('135d-desk');
    currentNoticeTab = tabKey;
    
    var tabs = document.querySelectorAll('.notice-tabs .tab-btn');
    tabs.forEach(function(t) { t.classList.remove('active'); });

    var tabMap = { 'all': 0, 'pending': 1, 'active': 2, 'ready': 3, 'completed': 4 };
    var idx = tabMap[tabKey];
    if (idx !== undefined && tabs[idx]) {
        tabs[idx].classList.add('active');
    }

    applyNoticeFilters();
}

// =========================================================
// ૪. ફિલ્ટરિંગ અને કાર્ડ્સ રેન્ડરિંગ લોજિક
// =========================================================
function applyNoticeFilters() {
    var query = document.getElementById('notice-search-input') ? document.getElementById('notice-search-input').value.trim().toLowerCase() : '';
    var clearBtn = document.getElementById('clear-notice-search');
    if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var filtered = noticesData.filter(function(item) {
        // ૧. ગામ ફિલ્ટર
        if (currentVillageFilter !== 'all') {
            if (!isSameVillage(item.Village_Name || item.village, currentVillageFilter)) return false;
        }

        // ૨. પ્રકાર ફિલ્ટર
        if (currentTypeFilter !== 'all') {
            var nType = getNoticeType(item);
            if (nType !== currentTypeFilter && !nType.includes(currentTypeFilter)) return false;
        }

        // ૩. સ્થિતિ ફિલ્ટર
        var servedD = getNoticeServedDate(item);
        var subD = getNoticeSubDate(item);
        var isSubmitted = (String(item.Current_Status || '').includes("જમા") || !!subD);
        var sDate = servedD ? parseUniversalDate(servedD) : null;
        var diffDays = null;
        if (sDate) {
            sDate.setHours(0, 0, 0, 0);
            diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
        }

        if (currentNoticeTab === 'pending') {
            if (isSubmitted || servedD) return false;
        } else if (currentNoticeTab === 'active') {
            if (isSubmitted || !servedD || (diffDays !== null && diffDays >= 30)) return false;
        } else if (currentNoticeTab === 'ready') {
            if (isSubmitted || !servedD || (diffDays !== null && diffDays < 30)) return false;
        } else if (currentNoticeTab === 'completed') {
            if (!isSubmitted) return false;
        }

        // ૪. સર્ચ ફિલ્ટર
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

    renderNoticeList(filtered);
}

function filterNotices(val) { applyNoticeFilters(); }
function clearNoticeSearch() {
    var inp = document.getElementById('notice-search-input');
    if (inp) inp.value = '';
    applyNoticeFilters();
}

function renderNoticeList(list) {
    var container = document.getElementById('notice-list-container');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px 10px; color: #94a3b8;"><i class="bi bi-inbox" style="font-size: 32px; display:block; margin-bottom: 8px;"></i><p style="font-size: 14px; margin: 0;">પસંદ કરેલ ફિલ્ટરમાં કોઈ ૧૩૫-ડી નોટિસ મળી નથી.</p></div>';
        return;
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var html = list.map(function(item) {
        var servedD = getNoticeServedDate(item);
        var subD = getNoticeSubDate(item);
        var isSubmitted = (String(item.Current_Status || '').includes("જમા") || !!subD);
        var sDate = servedD ? parseUniversalDate(servedD) : null;
        var diffDays = null;
        if (sDate) {
            sDate.setHours(0, 0, 0, 0);
            diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
        }

        var borderColor = '#dc2626';
        var statusBadge = '';

        if (isSubmitted) {
            borderColor = '#059669';
            statusBadge = '<span style="color:#059669; font-weight:700;"><i class="bi bi-check-circle-fill"></i> કચેરીએ જમા (' + formatDisplayDateGujarati(subD) + ')</span>';
        } else if (servedD) {
            if (diffDays !== null && diffDays >= 30) {
                borderColor = '#4f46e5';
                statusBadge = '<span style="color:#4f46e5; font-weight:700;"><i class="bi bi-bell-fill"></i> ૩૦ દિવસ પૂર્ણ (' + toGujaratiDigits(diffDays) + ' દિવસ થયા)</span>';
            } else {
                borderColor = '#d97706';
                var remaining = 30 - (diffDays || 0);
                statusBadge = '<span style="color:#d97706; font-weight:700;"><i class="bi bi-hourglass-split"></i> મુદતમાં (' + toGujaratiDigits(remaining) + ' દિવસ બાકી)</span>';
            }
        } else {
            borderColor = '#dc2626';
            statusBadge = '<span style="color:#dc2626; font-weight:700;"><i class="bi bi-exclamation-triangle-fill"></i> બજવણી બાકી</span>';
        }

        var genDateDisplay = formatDisplayDateGujarati(getNoticeGenDate(item));
        var recDateDisplay = formatDisplayDateGujarati(getNoticeRecDate(item));
        var noticeTypeDisplay = getNoticeType(item) || '-';

        return '<div class="notice-card" style="background:#fff; border-radius:10px; padding:14px 16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.06); display:flex; justify-content:space-between; align-items:flex-start; border-left: 4px solid ' + borderColor + ';">' +
            '<div style="flex: 1;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                    '<h4 style="margin:0; font-size:16px; font-weight:700; color:#0d47a1;">નોંધ નં: ' + toGujaratiDigits(item.Mutation_No) + '</h4>' +
                    '<span style="font-size:11px; color:#64748b;">મળ્યા: ' + recDateDisplay + '</span>' +
                '</div>' +
                '<div style="font-size:13px; font-weight:600; color:#1e293b; margin-bottom:3px;">ખાતેદાર: ' + (item.Khatedar_Name || '-') + '</div>' +
                '<div style="font-size:12px; color:#475569; margin-bottom:6px;">' +
                    '<span style="color:#0284c7; font-weight:600;">' + (item.Village_Name || item.village || '-') + '</span> | ' +
                    '<span style="background:#f1f5f9; padding:1px 6px; border-radius:4px; font-weight:600; color:#334155;">' + noticeTypeDisplay + '</span> | ' +
                    'નોટિસ તા: ' + genDateDisplay +
                '</div>' +
                '<div style="font-size:12px;">' + statusBadge + '</div>' +
            '</div>' +
            '<div style="margin-left:12px; align-self:center;">' +
                '<button class="btn-icon-circle" onclick="openEditNoticeModal(\'' + item.id + '\')" title="સુધારો કરો" style="background:#f1f5f9; border:none; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#334155;">' +
                    '<i class="bi bi-pencil-fill" style="font-size:13px;"></i>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');

    container.innerHTML = html;
}

// =========================================================
// ૫. નવી નોટિસ ઉમેરવી & એડિટિંગ
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

    var vSel = document.getElementById('notice-village');
    if (vSel && typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) {
        vSel.innerHTML = activeSeja.villages.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
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
        Notice_Date: genDate, // બંને સાચવી રાખવું
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

    // સાચી તારીખ ફોર્મેટ કરીને ઇનપુટમાં ભરો (જેથી ખાલી ન થઈ જાય)
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
    var sVal = document.getElementById('edit-notice-status').value;
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

    var btn = document.getElementById('btn-update-notice');
    if (btn) { btn.disabled = true; btn.innerText = "અપડેટ થાય છે..."; }

    db.collection("Notices_135D").doc(currentEditingNoticeId).update({
        Mutation_No: mutationNo,
        Village_Name: village,
        Khatedar_Name: khatedar,
        Notice_Type: type,
        Generated_Date: genDate,
        Notice_Date: genDate, // બેકવર્ડ સપોર્ટ માટે
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