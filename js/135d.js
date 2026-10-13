// js/135d.js

function loadNoticesDesk() {
    let container = document.getElementById('notice-list-container');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> નોટિસ લોડ થઈ રહી છે...</p>';
    
    let currentVillages = (activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    
    db.collection("Notices_135D").get().then((querySnapshot) => {
        let data = [];
        querySnapshot.forEach((doc) => {
            let notice = doc.data();
            notice.Notice_ID = doc.id;
            if (currentVillages.length === 0 || currentVillages.includes(notice.Village_Name) || !notice.Village_Name) { data.push(notice); }
        });
        allNotices = data;
        renderNotices();
    }).catch((error) => {
        container.innerHTML = `<p style="color:#ef4444; text-align:center; padding:15px;">એરર: ${error.message}</p>`;
    });
}

function switchNoticeTab(tabName, el) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
    currentNoticeTab = tabName;
    renderNotices();
}
function switchNoticeTabAndShow(tabName) {
    showView('135d-desk');
    setTimeout(() => {
        let tabs = document.querySelectorAll('.tab-btn');
        let indexMap = { 'pending': 0, 'active': 1, 'ready': 2, 'completed': 3 };
        if (tabs[indexMap[tabName]]) { switchNoticeTab(tabName, tabs[indexMap[tabName]]); }
    }, 150);
}

function filterNotices(query) {
    noticeSearchQuery = query.trim().toLowerCase();
    let clearBtn = document.getElementById('clear-notice-search');
    if (clearBtn) clearBtn.style.display = noticeSearchQuery ? "block" : "none";
    renderNotices();
}

function clearNoticeSearch() {
    let sInp = document.getElementById('notice-search-input');
    if (sInp) sInp.value = "";
    let clearBtn = document.getElementById('clear-notice-search');
    if (clearBtn) clearBtn.style.display = "none";
    noticeSearchQuery = "";
    renderNotices();
}

function renderNotices() {
    let container = document.getElementById('notice-list-container');
    if (!container) return;
    let today = new Date();
    today.setHours(0,0,0,0);
    
    let filtered = allNotices.filter(n => {
        if (noticeSearchQuery) {
            let q = noticeSearchQuery;
            let gujQ = toGujaratiDigits(q);

            // ૧. નોંધ નંબર મેચિંગ (English કે ગુજરાતી આંકડા બંનેમાં)
            let mutStr = String(n.Mutation_No || '');
            let matchMut = mutStr.includes(q) || toGujaratiDigits(mutStr).includes(q) || mutStr.includes(gujQ);

            // ૨. સ્માર્ટ ફોનેટિક સર્ચ (ગામ, પ્રકાર અને ખાતેદારનું નામ)
            let matchVill = matchesSmartSearch(n.Village_Name, q);
            let matchType = matchesSmartSearch(n.Entry_Type, q);
            let matchKhat = matchesSmartSearch(n.Khatedar_Name, q);

            if (!matchMut && !matchVill && !matchType && !matchKhat) return false;
        }

        let isSubmitted = (String(n.Current_Status || '').includes('જમા') || !!n.Submitted_Date);
        if (currentNoticeTab === 'completed') return isSubmitted;
        if (isSubmitted) return false;

        let sDateStr = n.Served_Date ? String(n.Served_Date).trim() : "";
        if (!sDateStr) return currentNoticeTab === 'pending';
        
        let servedDate = parseUniversalDate(sDateStr);
        if (!servedDate) return currentNoticeTab === 'pending';
        
        servedDate.setHours(0,0,0,0);
        let diffDays = Math.floor((today - servedDate) / (1000 * 60 * 60 * 24));
        
        if (currentNoticeTab === 'active') return diffDays < 30;
        if (currentNoticeTab === 'ready') return diffDays >= 30;
        return false;
    });

    if (filtered.length === 0) { 
        container.innerHTML = "<p style='text-align:center; margin-top:20px; color:#64748b;'>આ કેટેગરીમાં કોઈ નોંધ નથી.</p>"; return; 
    }

    container.innerHTML = filtered.map(n => {
        let isSubmitted = (String(n.Current_Status || '').includes('જમા') || !!n.Submitted_Date);
        let cardClass = isSubmitted ? 'ready' : (currentNoticeTab === 'pending' ? 'pending' : (currentNoticeTab === 'active' ? 'active-due' : 'ready'));
        let countdownHTML = "";
        
        if (isSubmitted) {
            countdownHTML = `<div class="countdown c-green"><i class="bi bi-check-circle-fill"></i> ઈ-ધરામાં પરત જમા (${formatDisplayDateGujarati(n.Submitted_Date) || 'તારીખ વગર'})</div>`;
        } else if (n.Served_Date) {
            let servedDate = parseUniversalDate(n.Served_Date);
            if (servedDate) {
                servedDate.setHours(0,0,0,0);
                let diffDays = Math.floor((today - servedDate) / (1000 * 60 * 60 * 24));
                let daysLeft = 30 - diffDays;
                if (daysLeft > 0) { countdownHTML = `<div class="countdown c-orange"><i class="bi bi-clock-history"></i> હજુ ${toGujaratiDigits(daysLeft)} દિવસ બાકી (${toGujaratiDigits(diffDays)} દિવસ થયા)</div>`; } 
                else { countdownHTML = `<div class="countdown c-green"><i class="bi bi-check-circle"></i> મુદત પૂર્ણ (${toGujaratiDigits(diffDays)} દિવસ થયા - પ્રમાણિત કરવા પાત્ર)</div>`; }
            } else { countdownHTML = `<div class="countdown c-red">બજવણી તારીખ અમાન્ય</div>`; }
        } else {
            countdownHTML = `<div class="countdown c-red"><i class="bi bi-exclamation-triangle-fill"></i> બજવણી બાકી</div>`;
        }

        let quickActionBtn = "";
        if (currentNoticeTab === 'ready' && !isSubmitted) { quickActionBtn = `<button class="btn" style="background:#dcfce7; color:#15803d; padding:6px 10px; font-size:11px; margin-right:6px;" onclick="quickCompleteNotice('${n.Notice_ID}')"><i class="bi bi-check2"></i> જમા કરો</button>`; }

        return `
        <div class="notice-card ${cardClass}">
            <div style="flex: 1;">
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px;">
                    <h3 style="font-size: 16px; color: var(--primary-blue); margin:0;">નોંધ નં: ${toGujaratiDigits(n.Mutation_No) || '-'}</h3><span style="font-size:11px; color:#64748b;">${n.Received_Date ? 'મળ્યા: ' + formatDisplayDateGujarati(n.Received_Date) : ''}</span>
                </div>
                <p style="font-size: 12px; font-weight:600; color: #334155; margin-top:2px;">ખાતેદાર: ${n.Khatedar_Name || '-'}</p>
                <p style="font-size: 11px; color: #64748b;">${n.Village_Name} | ${n.Entry_Type} ${n.Notice_Date ? ' | નોટિસ તા: ' + formatDisplayDateGujarati(n.Notice_Date) : ''}</p>
                ${countdownHTML}
            </div>
            <div style="display:flex; align-items:center; margin-left:10px;">
                ${quickActionBtn}
                <button class="btn-mini-contact" style="background:#f1f5f9; color:#475569; width:35px; height:35px;" onclick="openNoticeEditModal('${n.Notice_ID}')"><i class="fa-solid fa-pen"></i></button>
            </div>
        </div>`;
    }).join('');
}

function openNewNoticeModal() {
    let select = document.getElementById('notice-village');
    if (select) {
        select.innerHTML = '';
        let vList = (activeSeja && activeSeja.villages && activeSeja.villages.length > 0) ? activeSeja.villages : ["સાલાવાડા"];
        vList.forEach(v => { select.innerHTML += `<option value="${v}">${v}</option>`; });
    }
    let modal = document.getElementById('modal-new-notice');
    if (modal) modal.style.display = 'flex';
}

function saveNewNotice() {
    let btn = document.getElementById('btn-save-notice');
    let mutNo = document.getElementById('notice-mutation-no').value.trim();
    if (!mutNo) return alert('નોંધ નંબર દાખલ કરવો ફરજિયાત છે!');

    let served = document.getElementById('notice-served-date').value;
    let submitted = document.getElementById('notice-submitted-date').value;
    let status = submitted ? "કચેરીએ જમા" : (served ? "મુદતમાં" : "બજાવવાની બાકી");

    if (btn) { btn.innerText = 'સેવ થાય છે...'; btn.disabled = true; }

    let payload = {
        Village_Name: document.getElementById('notice-village').value,
        Mutation_No: mutNo,
        Khatedar_Name: document.getElementById('notice-khatedar').value.trim() || "-",
        Entry_Type: document.getElementById('notice-type').value,
        Notice_Date: document.getElementById('notice-gen-date').value,
        Received_Date: document.getElementById('notice-received-date').value,
        Served_Date: served,
        Submitted_Date: submitted,
        Current_Status: status,
        Remarks: document.getElementById('notice-remarks').value.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("Notices_135D").add(payload).then((docRef) => {
        if (btn) { btn.innerText = 'સેવ કરો'; btn.disabled = false; }
        document.getElementById('modal-new-notice').style.display = 'none';
        
        document.getElementById('notice-mutation-no').value = '';
        document.getElementById('notice-khatedar').value = '';
        document.getElementById('notice-served-date').value = '';
        document.getElementById('notice-submitted-date').value = '';
        
        showToast('✅ નવી નોંધ ઉમેરાઈ ગઈ!');
        loadNoticesDesk();
        loadDashboardData();
    }).catch((error) => {
        if (btn) { btn.innerText = 'સેવ કરો'; btn.disabled = false; }
        alert("ફાયરબેઝ એરર: " + error.message);
    });
}

function openNoticeEditModal(noticeId) {
    currentEditingNotice = allNotices.find(n => String(n.Notice_ID).trim() === String(noticeId).trim());
    if (!currentEditingNotice) return alert('નોંધ વિગત મળી નથી.');

    document.getElementById('edit-notice-id').value = currentEditingNotice.Notice_ID;

    let vSelect = document.getElementById('edit-notice-village');
    vSelect.innerHTML = '';
    let villagesList = (activeSeja && activeSeja.villages) ? [...activeSeja.villages] : [currentEditingNotice.Village_Name];
    if (!villagesList.includes(currentEditingNotice.Village_Name)) villagesList.push(currentEditingNotice.Village_Name);
    villagesList.forEach(v => {
        let isSel = (v === currentEditingNotice.Village_Name) ? 'selected' : '';
        vSelect.innerHTML += `<option value="${v}" ${isSel}>${v}</option>`;
    });

    document.getElementById('edit-notice-mutation-no').value = currentEditingNotice.Mutation_No || "";
    document.getElementById('edit-notice-khatedar').value = (currentEditingNotice.Khatedar_Name !== '-') ? currentEditingNotice.Khatedar_Name : "";
    document.getElementById('edit-notice-type').value = currentEditingNotice.Entry_Type || "વારસાઈ";

    document.getElementById('edit-notice-gen-date').value = formatForDateInput(currentEditingNotice.Notice_Date);
    document.getElementById('edit-notice-received-date').value = formatForDateInput(currentEditingNotice.Received_Date);
    document.getElementById('edit-notice-served-date').value = formatForDateInput(currentEditingNotice.Served_Date);
    document.getElementById('edit-notice-submitted-date').value = formatForDateInput(currentEditingNotice.Submitted_Date);

    let status = currentEditingNotice.Current_Status || "બજાવવાની બાકી";
    document.getElementById('edit-notice-status').value = status;
    toggleSubmittedDateInput();

    document.getElementById('edit-notice-remarks').value = currentEditingNotice.Remarks || "";
    document.getElementById('modal-edit-notice').style.display = 'flex';
}

function toggleSubmittedDateInput() {
    let s = document.getElementById('edit-notice-status').value;
    let grp = document.getElementById('grp-submitted-date');
    if (s === 'કચેરીએ જમા') {
        grp.style.display = 'block';
        if (!document.getElementById('edit-notice-submitted-date').value) {
            document.getElementById('edit-notice-submitted-date').value = new Date().toISOString().split('T')[0];
        }
    } else { grp.style.display = 'none'; }
}

function submitNoticeUpdate() {
    if (!currentEditingNotice) return;
    let mutNo = document.getElementById('edit-notice-mutation-no').value.trim();
    if (!mutNo) return alert('નોંધ નંબર ખાલી રાખી શકાય નહીં!');

    let btn = document.getElementById('btn-update-notice');
    if (btn) { btn.innerText = "અપડેટ થાય છે..."; btn.disabled = true; }

    let status = document.getElementById('edit-notice-status').value;
    let served = document.getElementById('edit-notice-served-date').value;
    if (served && status === 'બજાવવાની બાકી') status = 'મુદતમાં';

    let payload = {
        Village_Name: document.getElementById('edit-notice-village').value,
        Mutation_No: mutNo,
        Khatedar_Name: document.getElementById('edit-notice-khatedar').value.trim() || "-",
        Entry_Type: document.getElementById('edit-notice-type').value,
        Notice_Date: document.getElementById('edit-notice-gen-date').value,
        Received_Date: document.getElementById('edit-notice-received-date').value,
        Served_Date: served,
        Current_Status: status,
        Submitted_Date: (status === 'કચેરીએ જમા') ? document.getElementById('edit-notice-submitted-date').value : "",
        Remarks: document.getElementById('edit-notice-remarks').value.trim()
    };

    db.collection("Notices_135D").doc(currentEditingNotice.Notice_ID).update(payload).then(() => {
        if (btn) { btn.innerText = "સુધારો સેવ કરો"; btn.disabled = false; }
        document.getElementById('modal-edit-notice').style.display = 'none';
        showToast("✅ તમામ વિગતો અપડેટ થઈ ગઈ!");
        loadNoticesDesk();
        loadDashboardData();
    }).catch((error) => {
        if (btn) { btn.innerText = "સુધારો સેવ કરો"; btn.disabled = false; }
        alert("ફાયરબેઝ એરર: " + error.message);
    });
}

function quickCompleteNotice(noticeId) {
    let proceed = () => {
        showToast("સ્ટેટસ અપડેટ થાય છે...", 'info');
        let payload = { Current_Status: "કચેરીએ જમા", Submitted_Date: new Date().toISOString().split('T')[0] };
        db.collection("Notices_135D").doc(noticeId).update(payload).then(() => {
            showToast("✅ નોંધ કચેરીએ જમા થઈ ગઈ!", 'success');
            loadNoticesDesk();
            loadDashboardData();
        }).catch((error) => alert("ફાયરબેઝ એરર: " + error.message));
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'કચેરીએ જમા?', text: 'શું આ નોંધ ઈ-ધરા કચેરીએ જમા થઈ ગઈ છે?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'હા, જમા થઈ ગઈ', cancelButtonText: 'ના' }).then((result) => { if (result.isConfirmed) proceed(); });
    } else { if (confirm('શું આ નોંધ ઈ-ધરા કચેરીએ જમા થઈ ગઈ છે?')) proceed(); }
}

function deleteNoticeAction() {
    if (!currentEditingNotice) return;
    let confirmDelete = () => {
        let btn = document.getElementById('btn-delete-notice');
        if (btn) { btn.innerText = "રદ થાય છે..."; btn.disabled = true; }

        db.collection("Notices_135D").doc(currentEditingNotice.Notice_ID).delete().then(() => {
            if (btn) { btn.innerText = "રદ કરો"; btn.disabled = false; }
            document.getElementById('modal-edit-notice').style.display = 'none';
            showToast("🗑️ નોંધ સફળતાપૂર્વક રદ થઈ ગઈ!");
            loadNoticesDesk();
            loadDashboardData();
        }).catch((error) => {
            if (btn) { btn.innerText = "રદ કરો"; btn.disabled = false; }
            alert("ફાયરબેઝ એરર: " + error.message);
        });
    };
    if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'નોંધ રદ કરવી છે?', text: `નોંધ નં. ${currentEditingNotice.Mutation_No} નો રેકોર્ડ કાયમ માટે નીકળી જશે.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'હા, રદ કરો', cancelButtonText: 'ના' }).then((result) => { if (result.isConfirmed) confirmDelete(); });
    } else { if (confirm(`શું તમે નોંધ નં. ${currentEditingNotice.Mutation_No} રદ કરવા માંગો છો?`)) confirmDelete(); }
}
