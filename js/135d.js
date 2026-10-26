// js/135d.js

var currentVillageFilter = 'all';
var currentTypeFilter = 'all';
var currentEditingNoticeId = null;

var STANDARD_NOTICE_TYPES = [
    'વારસાઈ',
    'હયાતીમાં હક્ક દાખલ',
    'વેચાણ',
    'બોજો દાખલ',
    'બોજો કમી',
    'વહેંચણી',
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

function evaluateNoticeStatus(item, todayDate) {
    var today = todayDate ? new Date(todayDate) : new Date();
    today.setHours(0, 0, 0, 0);

    var servedD = getNoticeServedDate(item);
    var subD = getNoticeSubDate(item);
    var isSubmitted = (String(item.Current_Status || '').includes("જમા") || !!subD);
    var sDate = servedD ? parseUniversalDate(servedD) : null;
    var diffDays = null;

    if (sDate && !isNaN(sDate.getTime())) {
        sDate.setHours(0, 0, 0, 0);
        diffDays = Math.floor((today - sDate) / (1000 * 60 * 60 * 24));
    }

    var state = 'pending';
    if (isSubmitted) {
        state = 'completed';
    } else if (servedD && sDate) {
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
// ૨. નોંધ પ્રકાર આધારિત ડાયનેમિક ફિલ્ડ્સ રેન્ડરર (UI BUILDER)
// =========================================================
function handleNoticeTypeChange(prefix, initialData) {
    var typeSel = document.getElementById(prefix === 'new' ? 'notice-type' : 'edit-notice-type');
    var container = document.getElementById(prefix === 'new' ? 'notice-dynamic-fields-new' : 'notice-dynamic-fields-edit');
    if (!typeSel || !container) return;

    var nType = typeSel.value;
    var data = initialData || {};
    var html = '';

    if (nType === 'વારસાઈ') {
        html = `
            <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">મરનાર ખાતેદારનું નામ:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-deceased" placeholder="મરનારનું પૂરું નામ" value="${data.Deceased_Name || data.Khatedar_Name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">ઉમેરાતા વારસદારોની સંખ્યા:</label>
                <input type="number" min="1" class="form-control" id="${prefix}-dyn-heirs-count" placeholder="દા.ત. 4" value="${data.Heirs_Count || ''}">
            </div>
        `;
    } else if (nType === 'હયાતીમાં હક્ક દાખલ') {
        html = `
            <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">મૂળ ખાતેદારનું નામ (હક્ક આપનાર):</label>
                <input type="text" class="form-control" id="${prefix}-dyn-giver" placeholder="હક્ક આપનાર ખાતેદારનું નામ" value="${data.Giver_Name || data.Khatedar_Name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">હક્ક મેળવનાર વારસદારોની સંખ્યા:</label>
                <input type="number" min="1" class="form-control" id="${prefix}-dyn-takers-count" placeholder="દા.ત. 3" value="${data.Takers_Count || ''}">
            </div>
        `;
    } else if (nType === 'વેચાણ') {
        html = `
            <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">વેચનારનું નામ (Seller):</label>
                <input type="text" class="form-control" id="${prefix}-dyn-seller" placeholder="જમીન વેચનાર પક્ષકારનું નામ" value="${data.Seller_Name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">ખરીદનારનું નામ (Buyer):</label>
                <input type="text" class="form-control" id="${prefix}-dyn-buyer" placeholder="જમીન ખરીદનાર પક્ષકારનું નામ" value="${data.Buyer_Name || ''}">
            </div>
        `;
    } else if (nType === 'બોજો દાખલ') {
        html = `
            <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">ધિરાણ લેનાર ખાતેદારનું નામ:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-borrower" placeholder="ખાતેદારનું પૂરું નામ" value="${data.Borrower_Name || data.Khatedar_Name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">બેન્ક / મંડળીનું નામ:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-bank" placeholder="દા.ત. બેન્ક ઓફ બરોડા અથવા સેવા સહકારી મંડળી" value="${data.Bank_Name || ''}">
            </div>
        `;
    } else if (nType === 'બોજો કમી') {
        html = `
            <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">ખાતેદારનું નામ:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-borrower-rel" placeholder="ખાતેદારનું પૂરું નામ" value="${data.Borrower_Name || data.Khatedar_Name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">બોજો કમી કરનાર બેન્કનું નામ:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-bank-rel" placeholder="દા.ત. સ્ટેટ બેન્ક ઓફ ઇન્ડિયા" value="${data.Bank_Name || ''}">
            </div>
        `;
    } else if (nType === 'વહેંચણી') {
        html = `
            <div class="form-group">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">મુખ્ય ખાતેદારો / પક્ષકારોનાં નામ:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-share-parties" placeholder="દા.ત. રમેશભાઈ અને સુરેશભાઈ વિગેરે" value="${data.Khatedar_Name || ''}">
            </div>
        `;
    } else { // અન્ય
        html = `
            <div class="form-group" style="margin-bottom:8px;">
                <label class="form-label" style="font-weight:700; color:#0d47a1;">ખાતેદાર / પક્ષકારનું નામ:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-other-party" placeholder="પક્ષકારનું નામ" value="${data.Khatedar_Name || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">વિષય / ટૂંકી વિગત:</label>
                <input type="text" class="form-control" id="${prefix}-dyn-other-detail" placeholder="દા.ત. હક્ક કમી હુકમ" value="${data.Other_Detail || ''}">
            </div>
        `;
    }

    container.innerHTML = html;
}

// બજાવ્યા તારીખ પરથી લાઈવ ૩૦ દિવસ મુદત ગણતરી બતાવતું હેલ્પર
function updateNoticeDueDatePreview(prefix) {
    var sInput = document.getElementById(prefix === 'new' ? 'notice-served-date' : 'edit-notice-served-date');
    var pDiv = document.getElementById(prefix === 'new' ? 'notice-due-preview-new' : 'notice-due-preview-edit');
    if (!sInput || !pDiv) return;

    var sVal = sInput.value;
    if (!sVal) {
        pDiv.style.display = 'none';
        return;
    }

    var sDate = new Date(sVal);
    if (isNaN(sDate.getTime())) {
        pDiv.style.display = 'none';
        return;
    }

    // +૩૦ દિવસ ગણતરી
    var dueDate = new Date(sDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    pDiv.innerHTML = `<i class="bi bi-calendar-check-fill"></i> કાનૂની ૩૦ દિવસ પૂર્ણ તારીખ: ${formatDisplayDateGujarati(dueDate)}`;
    pDiv.style.display = 'block';
}

// =========================================================
// ૩. ૧૩૫-ડી ડેસ્ક લોડ કરવું & ફિલ્ટર્સ
// =========================================================
function loadNoticesDesk() {
    renderNoticeVillageFilters();
    renderNoticeTypeFilters();
    updateStatusTabsUIAndCounts();
    applyNoticeFilters();

    if (!unsubscribeNotices && typeof loadDashboardData === 'function') {
        loadDashboardData();
    }
}

function renderNoticeVillageFilters() {
    var cont = document.getElementById('notice-village-filters');
    if (!cont) return;

    var currentVillages = (typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    if (currentVillages.length === 0) {
        cont.innerHTML = '';
        return;
    }

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

    if (currentTypeFilter !== 'all' && (!counts[currentTypeFilter] || counts[currentTypeFilter] === 0)) {
        currentTypeFilter = 'all';
    }

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
// ૪. ફિલ્ટરિંગ અને કાર્ડ્સ રેન્ડરિંગ લોજિક (WITH SURVEY NUMBERS & DEEP SEARCH)
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
            var surveysStr = Array.isArray(item.Survey_Numbers) ? item.Survey_Numbers.join(' ') : String(item.Survey_Numbers || '');
            
            var match = mNo.includes(query) || 
                        toGujaratiDigits(mNo).includes(query) ||
                        surveysStr.includes(query) ||
                        toGujaratiDigits(surveysStr).includes(query) ||
                        matchesSmartSearch(item.Khatedar_Name, query) || 
                        matchesSmartSearch(item.Seller_Name, query) || 
                        matchesSmartSearch(item.Buyer_Name, query) || 
                        matchesSmartSearch(item.Bank_Name, query) || 
                        matchesSmartSearch(item.Deceased_Name, query) || 
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

    if (!isNoticesLoaded) {
        container.innerHTML = getSkeletonCardsHtml(3);
        return;
    }

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
            var remaining = Math.max(0, 30 - (st.diffDays || 0));
            badgeHtml = '<span class="notice-badge-pill badge-pill-active"><i class="bi bi-hourglass-split"></i> મુદતમાં (' + toGujaratiDigits(remaining) + ' દિવસ બાકી)</span>';
        } else {
            badgeHtml = '<span class="notice-badge-pill badge-pill-pending"><i class="bi bi-exclamation-triangle-fill"></i> બજવણી બાકી</span>';
        }

        var genDateDisplay = formatDisplayDateGujarati(getNoticeGenDate(item));
        var recDateDisplay = formatDisplayDateGujarati(getNoticeRecDate(item));
        var noticeTypeDisplay = getNoticeType(item) || '-';

        // સર્વે નંબરોનું ડિસ્પ્લે
        var surveysText = '';
        if (Array.isArray(item.Survey_Numbers) && item.Survey_Numbers.length > 0) {
            surveysText = item.Survey_Numbers.map(function(s) { return toGujaratiDigits(s); }).join(', ');
        } else if (item.Survey_Numbers) {
            surveysText = toGujaratiDigits(String(item.Survey_Numbers));
        }

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

                    <div style="font-size:13.5px; font-weight:700; color:#1e293b; margin-bottom:4px; line-height:1.4;">
                        ${item.Khatedar_Name || '-'}
                    </div>

                    ${surveysText ? `
                    <div style="font-size:11.5px; color:#0369a1; margin-bottom:4px; font-weight:600;">
                        <i class="bi bi-geo"></i> સર્વે નં: <b>${surveysText}</b>
                    </div>` : ''}

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
// ૫. નવી નોટિસ ઉમેરવી (NEW NOTICE SAVE)
// =========================================================
function openNewNoticeModal() {
    var todayStr = new Date().toISOString().split('T')[0];
    
    safeSetValue('notice-mutation-no', '');
    safeSetValue('notice-surveys', '');
    safeSetValue('notice-type', 'વારસાઈ');
    safeSetValue('notice-gen-date', todayStr);
    safeSetValue('notice-received-date', todayStr);
    safeSetValue('notice-served-date', '');
    safeSetValue('notice-remarks', '');

    var previewDiv = document.getElementById('notice-due-preview-new');
    if (previewDiv) previewDiv.style.display = 'none';

    var vSel = document.getElementById('notice-village');
    if (vSel && typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) {
        vSel.innerHTML = activeSeja.villages.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
        if (currentVillageFilter !== 'all' && activeSeja.villages.some(function(v) { return isSameVillage(v, currentVillageFilter); })) {
            var matchedV = activeSeja.villages.find(function(v) { return isSameVillage(v, currentVillageFilter); });
            if (matchedV) vSel.value = matchedV;
        }
    }

    handleNoticeTypeChange('new');
    document.getElementById('modal-new-notice').style.display = 'flex';
}

function saveNewNotice() {
    var mutationNo = toEnglishDigits(safeGetValue('notice-mutation-no'));
    var village = safeGetValue('notice-village');
    var type = safeGetValue('notice-type');
    var surveysRaw = safeGetValue('notice-surveys');
    var genDate = safeGetValue('notice-gen-date');
    var recDate = safeGetValue('notice-received-date');
    var servedDate = safeGetValue('notice-served-date');
    var remarks = safeGetValue('notice-remarks');

    if (!mutationNo) { alert("કૃપા કરી નોંધ નંબર દાખલ કરો."); return; }
    if (!village) { alert("કૃપા કરી ગામ પસંદ કરો."); return; }

    // સર્વે નંબરોનું એરેમાં રૂપાંતર
    var surveyNumbers = [];
    if (surveysRaw) {
        surveyNumbers = surveysRaw.split(',').map(function(s) { return toEnglishDigits(s.trim()); }).filter(function(s) { return s !== ""; });
    }

    // નોંધ પ્રકાર મુજબ પક્ષકારો અને સમરી નામ નિર્માણ
    var khatedarSummary = "";
    var dynData = {};

    if (type === 'વારસાઈ') {
        var decName = safeGetValue('new-dyn-deceased');
        var hCount = safeGetValue('new-dyn-heirs-count');
        if (!decName) { alert("કૃપા કરી મરનાર ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Deceased_Name = decName;
        dynData.Heirs_Count = hCount ? parseInt(toEnglishDigits(hCount), 10) : 0;
        khatedarSummary = "મરનાર: " + decName + (dynData.Heirs_Count ? " (કુલ વારસદાર: " + toGujaratiDigits(dynData.Heirs_Count) + ")" : "");
    } else if (type === 'હયાતીમાં હક્ક દાખલ') {
        var giver = safeGetValue('new-dyn-giver');
        var tCount = safeGetValue('new-dyn-takers-count');
        if (!giver) { alert("કૃપા કરી મૂળ ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Giver_Name = giver;
        dynData.Takers_Count = tCount ? parseInt(toEnglishDigits(tCount), 10) : 0;
        khatedarSummary = "હયાતી વારસાઈ: " + giver + (dynData.Takers_Count ? " (વારસદાર: " + toGujaratiDigits(dynData.Takers_Count) + ")" : "");
    } else if (type === 'વેચાણ') {
        var seller = safeGetValue('new-dyn-seller');
        var buyer = safeGetValue('new-dyn-buyer');
        if (!seller || !buyer) { alert("કૃપા કરી વેચનાર અને ખરીદનાર બંનેનાં નામ દાખલ કરો."); return; }
        dynData.Seller_Name = seller;
        dynData.Buyer_Name = buyer;
        khatedarSummary = "વેચનાર: " + seller + " ➔ ખરીદનાર: " + buyer;
    } else if (type === 'બોજો દાખલ') {
        var borrower = safeGetValue('new-dyn-borrower');
        var bank = safeGetValue('new-dyn-bank');
        if (!borrower) { alert("કૃપા કરી ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Borrower_Name = borrower;
        dynData.Bank_Name = bank;
        khatedarSummary = "ખાતેદાર: " + borrower + (bank ? " [" + bank + "]" : "");
    } else if (type === 'બોજો કમી') {
        var borrowerRel = safeGetValue('new-dyn-borrower-rel');
        var bankRel = safeGetValue('new-dyn-bank-rel');
        if (!borrowerRel) { alert("કૃપા કરી ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Borrower_Name = borrowerRel;
        dynData.Bank_Name = bankRel;
        khatedarSummary = "બોજો કમી: " + borrowerRel + (bankRel ? " [" + bankRel + "]" : "");
    } else if (type === 'વહેંચણી') {
        var parties = safeGetValue('new-dyn-share-parties');
        if (!parties) { alert("કૃપા કરી ખાતેદારોનાં નામ દાખલ કરો."); return; }
        khatedarSummary = "વહેંચણી: " + parties;
    } else {
        var otherParty = safeGetValue('new-dyn-other-party');
        var otherDet = safeGetValue('new-dyn-other-detail');
        if (!otherParty) { alert("કૃપા કરી ખાતેદાર/પક્ષકારનું નામ દાખલ કરો."); return; }
        dynData.Other_Detail = otherDet;
        khatedarSummary = otherParty + (otherDet ? " (" + otherDet + ")" : "");
    }

    // ડુપ્લિકેટ ચકાસણી
    var isDuplicate = noticesData.some(function(n) {
        return isSameVillage(n.Village_Name || n.village, village) && 
               String(n.Mutation_No || '').trim() === String(mutationNo).trim();
    });
    if (isDuplicate) {
        if (!confirm("મોજે " + village + " માં નોંધ નં. " + toGujaratiDigits(mutationNo) + " પહેલેથી અસ્તિત્વમાં છે! શું તમે તેમ છતાં સેવ કરવા માંગો છો?")) {
            return;
        }
    }

    var status = "બજાવવાની બાકી";
    if (servedDate) status = "મુદતમાં";

    var btn = document.getElementById('btn-save-notice');
    if (btn) { btn.disabled = true; btn.innerText = "સેવ થાય છે..."; }

    var payload = Object.assign({
        Mutation_No: mutationNo,
        Village_Name: village,
        Notice_Type: type,
        Survey_Numbers: surveyNumbers,
        Khatedar_Name: khatedarSummary,
        Generated_Date: genDate,
        Notice_Date: genDate,
        Received_Date: recDate,
        Served_Date: servedDate,
        Submitted_Date: "",
        Remarks: remarks,
        Current_Status: status,
        Seja_Name: (typeof activeSeja !== 'undefined' && activeSeja) ? activeSeja.sejaName : "",
        Created_By: (currentUser && currentUser.mobile) ? currentUser.mobile : "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, dynData);

    db.collection("Notices_135D").add(payload).then(function() {
        if (btn) { btn.disabled = false; btn.innerText = "સેવ કરો"; }
        document.getElementById('modal-new-notice').style.display = 'none';
        showToast("નવી ૧૩૫-ડી નોટિસ ઉમેરાઈ ગઈ!");
    }).catch(function(err) {
        if (btn) { btn.disabled = false; btn.innerText = "સેવ કરો"; }
        alert("એરર: " + err.message);
    });
}

// =========================================================
// ૬. નોટિસ સુધારવી (EDIT NOTICE SAVE)
// =========================================================
function openEditNoticeModal(id) {
    var item = noticesData.find(function(n) { return n.id === id; });
    if (!item) return;

    currentEditingNoticeId = id;
    safeSetValue('edit-notice-id', id);
    safeSetValue('edit-notice-mutation-no', item.Mutation_No);
    safeSetValue('edit-notice-type', getNoticeType(item) || 'વારસાઈ');

    // સર્વે નંબરો પોપ્યુલેટ કરવા
    var sVal = '';
    if (Array.isArray(item.Survey_Numbers)) {
        sVal = item.Survey_Numbers.join(', ');
    } else if (item.Survey_Numbers) {
        sVal = String(item.Survey_Numbers);
    }
    safeSetValue('edit-notice-surveys', sVal);

    safeSetValue('edit-notice-gen-date', formatForDateInput(getNoticeGenDate(item)));
    safeSetValue('edit-notice-received-date', formatForDateInput(getNoticeRecDate(item)));
    safeSetValue('edit-notice-served-date', formatForDateInput(getNoticeServedDate(item)));
    safeSetValue('edit-notice-submitted-date', formatForDateInput(getNoticeSubDate(item)));
    safeSetValue('edit-notice-remarks', item.Remarks || '');

    var vSel = document.getElementById('edit-notice-village');
    if (vSel && typeof activeSeja !== 'undefined' && activeSeja && activeSeja.villages) {
        var opts = activeSeja.villages.slice();
        var curVill = item.Village_Name || item.village || '';
        var matchedOpt = opts.find(function(v) { return isSameVillage(v, curVill); });
        
        if (matchedOpt) {
            vSel.innerHTML = opts.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
            vSel.value = matchedOpt;
        } else if (curVill) {
            opts.push(curVill);
            vSel.innerHTML = opts.map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
            vSel.value = curVill;
        }
    }

    var statusSel = document.getElementById('edit-notice-status');
    var subD = getNoticeSubDate(item);
    var servD = getNoticeServedDate(item);
    if (statusSel) {
        if (subD || String(item.Current_Status || '').includes('જમા')) {
            statusSel.value = 'કચેરીએ જમા';
        } else if (servD) {
            statusSel.value = 'મુદતમાં';
        } else {
            statusSel.value = 'બજાવવાની બાકી';
        }
    }

    handleNoticeTypeChange('edit', item);
    updateNoticeDueDatePreview('edit');
    toggleSubmittedDateInput();
    document.getElementById('modal-edit-notice').style.display = 'flex';
}

function toggleSubmittedDateInput() {
    var sVal = safeGetValue('edit-notice-status');
    var grp = document.getElementById('grp-submitted-date');
    var subInput = document.getElementById('edit-notice-submitted-date');
    
    if (grp) {
        grp.style.display = (sVal === 'કચેરીએ જમા') ? 'block' : 'none';
    }
    if (sVal === 'કચેરીએ જમા' && subInput && !subInput.value) {
        subInput.value = new Date().toISOString().split('T')[0];
    }
}

function submitNoticeUpdate() {
    if (!currentEditingNoticeId) return;

    var mutationNo = toEnglishDigits(safeGetValue('edit-notice-mutation-no'));
    var village = safeGetValue('edit-notice-village');
    var type = safeGetValue('edit-notice-type');
    var surveysRaw = safeGetValue('edit-notice-surveys');
    var genDate = safeGetValue('edit-notice-gen-date');
    var recDate = safeGetValue('edit-notice-received-date');
    var servedDate = safeGetValue('edit-notice-served-date');
    var subDate = safeGetValue('edit-notice-submitted-date');
    var status = safeGetValue('edit-notice-status');
    var remarks = safeGetValue('edit-notice-remarks');

    if (!mutationNo) { alert("કૃપા કરી નોંધ નંબર દાખલ કરો."); return; }
    if (!village) { alert("કૃપા કરી ગામ પસંદ કરો."); return; }

    var surveyNumbers = [];
    if (surveysRaw) {
        surveyNumbers = surveysRaw.split(',').map(function(s) { return toEnglishDigits(s.trim()); }).filter(function(s) { return s !== ""; });
    }

    var khatedarSummary = "";
    var dynData = {};

    if (type === 'વારસાઈ') {
        var decName = safeGetValue('edit-dyn-deceased');
        var hCount = safeGetValue('edit-dyn-heirs-count');
        if (!decName) { alert("કૃપા કરી મરનાર ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Deceased_Name = decName;
        dynData.Heirs_Count = hCount ? parseInt(toEnglishDigits(hCount), 10) : 0;
        khatedarSummary = "મરનાર: " + decName + (dynData.Heirs_Count ? " (કુલ વારસદાર: " + toGujaratiDigits(dynData.Heirs_Count) + ")" : "");
    } else if (type === 'હયાતીમાં હક્ક દાખલ') {
        var giver = safeGetValue('edit-dyn-giver');
        var tCount = safeGetValue('edit-dyn-takers-count');
        if (!giver) { alert("કૃપા કરી મૂળ ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Giver_Name = giver;
        dynData.Takers_Count = tCount ? parseInt(toEnglishDigits(tCount), 10) : 0;
        khatedarSummary = "હયાતી વારસાઈ: " + giver + (dynData.Takers_Count ? " (વારસદાર: " + toGujaratiDigits(dynData.Takers_Count) + ")" : "");
    } else if (type === 'વેચાણ') {
        var seller = safeGetValue('edit-dyn-seller');
        var buyer = safeGetValue('edit-dyn-buyer');
        if (!seller || !buyer) { alert("કૃપા કરી વેચનાર અને ખરીદનાર બંનેનાં નામ દાખલ કરો."); return; }
        dynData.Seller_Name = seller;
        dynData.Buyer_Name = buyer;
        khatedarSummary = "વેચનાર: " + seller + " ➔ ખરીદનાર: " + buyer;
    } else if (type === 'બોજો દાખલ') {
        var borrower = safeGetValue('edit-dyn-borrower');
        var bank = safeGetValue('edit-dyn-bank');
        if (!borrower) { alert("કૃપા કરી ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Borrower_Name = borrower;
        dynData.Bank_Name = bank;
        khatedarSummary = "ખાતેદાર: " + borrower + (bank ? " [" + bank + "]" : "");
    } else if (type === 'બોજો કમી') {
        var borrowerRel = safeGetValue('edit-dyn-borrower-rel');
        var bankRel = safeGetValue('edit-dyn-bank-rel');
        if (!borrowerRel) { alert("કૃપા કરી ખાતેદારનું નામ દાખલ કરો."); return; }
        dynData.Borrower_Name = borrowerRel;
        dynData.Bank_Name = bankRel;
        khatedarSummary = "બોજો કમી: " + borrowerRel + (bankRel ? " [" + bankRel + "]" : "");
    } else if (type === 'વહેંચણી') {
        var parties = safeGetValue('edit-dyn-share-parties');
        if (!parties) { alert("કૃપા કરી ખાતેદારોનાં નામ દાખલ કરો."); return; }
        khatedarSummary = "વહેંચણી: " + parties;
    } else {
        var otherParty = safeGetValue('edit-dyn-other-party');
        var otherDet = safeGetValue('edit-dyn-other-detail');
        if (!otherParty) { alert("કૃપા કરી ખાતેદાર/પક્ષકારનું નામ દાખલ કરો."); return; }
        dynData.Other_Detail = otherDet;
        khatedarSummary = otherParty + (otherDet ? " (" + otherDet + ")" : "");
    }

    if (status === 'કચેરીએ જમા') {
        if (!subDate) subDate = new Date().toISOString().split('T')[0];
    } else if (status === 'બજાવવાની બાકી') {
        servedDate = '';
        subDate = '';
    } else {
        subDate = '';
        if (!servedDate) servedDate = new Date().toISOString().split('T')[0];
    }

    var btn = document.getElementById('btn-update-notice');
    if (btn) { btn.disabled = true; btn.innerText = "અપડેટ થાય છે..."; }

    var updatePayload = Object.assign({
        Mutation_No: mutationNo,
        Village_Name: village,
        Notice_Type: type,
        Survey_Numbers: surveyNumbers,
        Khatedar_Name: khatedarSummary,
        Generated_Date: genDate,
        Notice_Date: genDate,
        Received_Date: recDate,
        Served_Date: servedDate,
        Submitted_Date: subDate,
        Current_Status: status,
        Remarks: remarks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, dynData);

    db.collection("Notices_135D").doc(currentEditingNoticeId).update(updatePayload).then(function() {
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

    var proceedDelete = function() {
        db.collection("Notices_135D").doc(currentEditingNoticeId).delete().then(function() {
            document.getElementById('modal-edit-notice').style.display = 'none';
            showToast("નોટિસ રદ થઈ ગઈ!");
        }).catch(function(err) { 
            alert("ડિલીટ એરર: " + err.message); 
        });
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '૧૩૫-ડી નોટિસ રદ કરવી છે?',
            text: 'આ નોટિસ કાયમ માટે રદ થઈ જશે.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'હા, રદ કરો',
            cancelButtonText: 'ના'
        }).then(function(result) { 
            if (result.isConfirmed) proceedDelete(); 
        });
    } else {
        if (confirm("શું તમે આ ૧૩૫-ડી નોટિસ ખરેખર રદ કરવા માંગો છો?")) {
            proceedDelete();
        }
    }
}