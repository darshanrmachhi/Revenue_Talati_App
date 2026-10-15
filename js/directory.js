// js/directory.js
var talukaDirectoryData = null;
let currentActiveSeja = null; 
let currentActivePanchayat = null;
let currentActiveVillage = null;
let editingLandRecordIdx = null; // સરકારી જમીન એડિટ ટ્રેકિંગ માટે
let editingBookmarkIdx = null;   // બુકમાર્ક એડિટ ટ્રેકિંગ માટે

// Call, WhatsApp અને Copy નું ૩-બટન ગ્રુપ બનાવતું હેલ્પર ફંક્શન
function buildContactActionButtons(rawMobile) {
    if (!rawMobile || rawMobile === "-") {
        return '<span style="font-size:11px; color:#94a3b8;">સંપર્ક ઉપલબ્ધ નથી</span>';
    }
    const clean = String(rawMobile).replace(/[^0-9]/g, '');
    if (clean.length < 10) {
        return '<span style="font-size:11px; color:#94a3b8;">અમાન્ય નંબર</span>';
    }
    const num10 = clean.slice(-10);
    return `
        <div class="contact-actions-wrap" style="display:flex; align-items:center; gap:6px;">
            <a href="tel:${num10}" class="btn-mini-contact btn-mini-call" style="background:#2563eb; width:30px; height:30px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; color:#fff; text-decoration:none; font-size:12px;" title="કોલ કરો">
                <i class="fa-solid fa-phone"></i>
            </a>
            <a href="https://wa.me/91${num10}" target="_blank" class="btn-mini-contact btn-mini-wa" style="background:#16a34a; width:30px; height:30px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; color:#fff; text-decoration:none; font-size:13px;" title="WhatsApp મેસેજ કરો">
                <i class="fa-brands fa-whatsapp"></i>
            </a>
            <button type="button" class="btn-mini-contact btn-mini-copy" onclick="copyToClipboard('${num10}')" style="background:#64748b; width:30px; height:30px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; color:#fff; border:none; cursor:pointer; font-size:12px;" title="નંબર કોપી કરો">
                <i class="fa-solid fa-copy"></i>
            </button>
        </div>
    `;
}

// ક્ષેત્રફળને "હે.-આરે-ચો.મી." ફોર્મેટમાં ફેરવતું સ્માર્ટ હેલ્પર ફંક્શન
function formatLandAreaDisplay(val) {
    if (!val) return '';
    let s = String(val).trim();
    
    // જો ગુજરાતી અંકો હોય તો ગણતરી માટે અંગ્રેજી અંકોમાં ફેરવો
    const gujToEng = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
    let clean = s.replace(/[૦-૯]/g, d => gujToEng[d] || d);
    
    // ૧. જો સીધું "1-05-19" કે "1/5/19" લખ્યું હોય
    if (clean.includes('-') || clean.includes('/') || clean.includes('.')) {
        let parts = clean.split(/[-/.]/);
        if (parts.length >= 2) {
            let ha = parts[0] || '0';
            let are = ('0' + (parts[1] || '0')).slice(-2);
            let sqm = parts[2] ? ('0' + parts[2]).slice(-2) : '00';
            return toGujaratiDigits(`${ha}-${are}-${sqm}`);
        }
    }
    
    // ૨. જો માત્ર ચોરસ મીટર (દા.ત. 10519) લખ્યું હોય તો હેક્ટર-આરે-ચો.મી. ગણો
    let num = parseFloat(clean);
    if (!isNaN(num) && num > 0) {
        let ha = Math.floor(num / 10000);
        let remHa = num % 10000;
        let are = Math.floor(remHa / 100);
        let sqm = Math.round(remHa % 100);
        return toGujaratiDigits(`${ha}-${('0' + are).slice(-2)}-${('0' + sqm).slice(-2)}`);
    }
    
    return toGujaratiDigits(s);
}

function loadDirectoryData() {
    if (talukaDirectoryData) { renderSejasGrid(talukaDirectoryData.sejas); return; }
    
    let container = document.getElementById('directory-grid-container');
    if (container) container.innerHTML = '<p style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> ડિરેક્ટરી લોડ થાય છે...</p>';
    
    let mySejaName = (activeSeja && activeSeja.sejaName) ? activeSeja.sejaName : "";
    let cachedData = (typeof getMasterDataCache === 'function') ? getMasterDataCache() : null;
    if (cachedData) {
        processDirectoryData(cachedData, mySejaName, container);
        return;
    }

    db.collection("Master_Data").doc("Taluka_Directory").get().then((doc) => {
        if (doc.exists) {
            let response = doc.data();
            if (typeof setMasterDataCache === 'function') setMasterDataCache(response);
            processDirectoryData(response, mySejaName, container);
        } else { 
            if (container) container.innerHTML = `<p style="color:red; text-align:center;">ડિરેક્ટરી ડેટા હજુ સેટ થયો નથી.</p>`; 
        }
    }).catch((err) => { 
        if (container) container.innerHTML = `<p style="color:red; text-align:center;">ડિરેક્ટરી એરર: ${err.message}</p>`; 
    });
}

function processDirectoryData(response, mySejaName, container) {
    talukaDirectoryData = response;
    let statTotal = document.getElementById('stat-total-sejas');
    let statPanch = document.getElementById('stat-total-panchayats');
    let statVill = document.getElementById('stat-total-villages');
    
    if (statTotal) statTotal.innerText = toGujaratiDigits(response.totalSejas || (response.sejas ? response.sejas.length : 0));
    if (statPanch && response.totalPanchayats) statPanch.innerText = toGujaratiDigits(response.totalPanchayats);
    if (statVill && response.totalVillages) statVill.innerText = toGujaratiDigits(response.totalVillages);
    
    if (response.sejas && response.sejas.length > 0) {
        response.sejas.sort((a, b) => { 
            if (a.sejaName === mySejaName) return -1; 
            if (b.sejaName === mySejaName) return 1; 
            return a.sejaName.localeCompare(b.sejaName, 'gu'); 
        });
        renderSejasGrid(response.sejas);
    } else { 
        if (container) container.innerHTML = `<p style="grid-column: 1/-1; text-align:center;">કોઈ સેજો મળ્યો નથી.</p>`; 
    }
}

function renderSejasGrid(sejasList) {
    const list = sejasList || (talukaDirectoryData ? talukaDirectoryData.sejas : []);
    const container = document.getElementById('directory-grid-container');
    if (!container) return;
    
    let bc = document.getElementById('dir-breadcrumbs');
    if (bc) bc.innerHTML = `<span class="crumb-link" onclick="renderSejasGrid()"><i class="fa-solid fa-house"></i> લુણાવાડા</span>`;
    
    if (!list || list.length === 0) { 
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center;">કોઈ સેજો મળ્યો નથી.</p>`; 
        return; 
    }

    let mySejaName = (activeSeja && activeSeja.sejaName) ? activeSeja.sejaName : "";
    container.innerHTML = list.map(seja => {
        const isMySeja = (seja.sejaName === mySejaName);
        const chargeClass = (seja.chargeType === "કાયમી") ? "permanent" : "additional";
        const cm = seja.talatiMobile && seja.talatiMobile !== "-" ? seja.talatiMobile.replace(/[^0-9]/g, '') : '';
        return `<div class="seja-grid-card ${isMySeja ? 'my-seja' : ''}" onclick="renderPanchayatsView('${seja.sejaName}')"><div><div class="seja-card-header"><div class="seja-card-title">${seja.sejaName} સેજો ${isMySeja?'<span style="font-size:10px; color:#2563eb; display:block;">(મારો સેજો)</span>':''}</div><span class="badge-charge ${chargeClass}">${seja.chargeType}</span></div><div class="talati-info"><i class="fa-solid fa-user-tie" style="color:var(--text-muted); font-size:12px;"></i><span>${seja.talatiName}</span></div><div class="seja-counts-bar"><span><i class="fa-solid fa-building"></i> ${toGujaratiDigits(seja.panchayatsCount)} પંચાયત</span><span><i class="fa-solid fa-location-dot"></i> ${toGujaratiDigits(seja.villagesCount)} ગામો</span></div></div><div class="seja-quick-actions" onclick="event.stopPropagation()">${cm.length===10 ? `<a href="tel:${cm}" class="btn-contact btn-call"><i class="fa-solid fa-phone"></i> કોલ</a><a href="https://wa.me/91${cm}" target="_blank" class="btn-contact btn-wa"><i class="fa-brands fa-whatsapp"></i> વોટ્સએપ</a>` : `<span style="font-size:11px; color:#999; text-align:center; width:100%;">સંપર્ક ઉપલબ્ધ નથી</span>`}</div></div>`;
    }).join('');
}

function filterDirectory(query) {
    const clearBtn = document.getElementById('clear-search'); 
    if (clearBtn) clearBtn.style.display = query ? "block" : "none";
    if (!talukaDirectoryData) return;
    
    const q = query.trim().toLowerCase();
    if (!q) { renderSejasGrid(talukaDirectoryData.sejas); return; }

    const filtered = talukaDirectoryData.sejas.filter(s => {
        if (matchesSmartSearch(s.sejaName, q) || matchesSmartSearch(s.talatiName, q)) return true;
        if (s.panchayats && Array.isArray(s.panchayats)) {
            return s.panchayats.some(p => {
                if (matchesSmartSearch(p.panchayatName, q)) return true;
                if (p.villages && Array.isArray(p.villages)) {
                    return p.villages.some(v => {
                        let vName = typeof v === 'string' ? v : (v.villageName || v.name || "");
                        return matchesSmartSearch(vName, q);
                    });
                }
                return false;
            });
        }
        return false;
    });

    renderSejasGrid(filtered);
}

function clearSearchInput() { 
    document.getElementById('dir-search-input').value = ""; 
    document.getElementById('clear-search').style.display = "none"; 
    if (talukaDirectoryData) renderSejasGrid(talukaDirectoryData.sejas); 
}

function renderPanchayatsView(sejaName, pushHistory = true) {
    currentActiveSeja = talukaDirectoryData.sejas.find(s => s.sejaName === sejaName); 
    if (!currentActiveSeja) return;
    
    document.getElementById('directory-grid-container').style.display = 'none'; 
    document.getElementById('panchayat-view-container').style.display = 'block';
    document.getElementById('dir-breadcrumbs').innerHTML = `<span class="crumb-link" onclick="restoreSejasGrid()"><i class="fa-solid fa-house"></i> લુણાવાડા</span><i class="fa-solid fa-chevron-right" style="font-size:10px;"></i><span>${currentActiveSeja.sejaName} સેજો</span>`;
    document.getElementById('seja-detail-header').innerHTML = `<div style="display:flex; justify-content:space-between; align-items:flex-start;"><div><h2>${currentActiveSeja.sejaName} સેજો (${currentActiveSeja.chargeType})</h2><p><i class="fa-solid fa-user-tie"></i> તલાટી: <b>${currentActiveSeja.talatiName}</b></p></div><div style="text-align:right;"><p style="font-size:12px;"><i class="fa-solid fa-users"></i> વસ્તી: <b>${toGujaratiDigits(currentActiveSeja.totalPopulation)}</b></p><p style="font-size:12px;"><i class="fa-solid fa-vector-square"></i> ક્ષેત્રફળ: <b>${toGujaratiDigits(currentActiveSeja.totalAreaSqMtr)} ચો.મી.</b></p></div></div>`;
    
    document.getElementById('panchayats-list').innerHTML = currentActiveSeja.panchayats.map(p => {
        return `
            <div class="panchayat-card">
                <div class="panchayat-header">
                    <h3><i class="fa-solid fa-landmark"></i> ${p.panchayatName} પંચાયત</h3>
                    <span style="font-size:11px;">${toGujaratiDigits(p.villages.length)} ગામો</span>
                </div>
                
                <div class="contact-row">
                    <div>
                        <span class="contact-badge">TCM</span>
                        <b>${p.tcmName || '-'}</b>
                    </div>
                    <div>${buildContactActionButtons(p.tcmMobile)}</div>
                </div>

                <div class="contact-row" style="border-top:1px dashed #f1f5f9; margin-top:4px; padding-top:4px;">
                    <div>
                        <span class="contact-badge" style="background:#fef3c7; color:#92400e;">સરપંચ</span>
                        <b>${p.sarpanchName || '-'}</b>
                    </div>
                    <div>${buildContactActionButtons(p.sarpanchMobile)}</div>
                </div>

                <div class="panchayat-villages-list">
                    <span style="font-size:11px; font-weight:bold; color:var(--text-muted); display:block; margin-bottom:4px;">મહેસૂલી ગામો:</span>
                    ${p.villages.map(v => `<button class="village-chip-btn" onclick="openVillageProfile('${v.villageId}', '${p.panchayatName}')"><i class="fa-solid fa-location-dot" style="font-size:10px;"></i> ${v.villageName}</button>`).join('')}
                </div>
            </div>
        `;
    }).join('');

    if (pushHistory) { window.history.pushState({ view: 'directory-panchayat', seja: sejaName }, '', '#panchayat'); }
}

function restoreSejasGrid() { window.history.back(); }

// =========================================================
// ગામની પ્રોફાઈલ ખોલવાનું મુખ્ય ફંક્શન (VIEW MODE)
// =========================================================
function openVillageProfile(vid, pname) {
    if (!currentActiveSeja) return;
    let tv = null; 
    let tp = null;
    
    for (let p of currentActiveSeja.panchayats) { 
        let v = p.villages.find(i => i.villageId === vid || i.villageName === vid); 
        if (v) { tv = v; tp = p; break; } 
    }
    if (!tv) return; 
    
    currentActiveVillage = tv;
    currentActivePanchayat = tp;

    let elName = document.getElementById('vp-village-name');
    let elPath = document.getElementById('vp-hierarchy-path');
    let elSqm = document.getElementById('vp-area-sqm');
    let elHa = document.getElementById('vp-area-ha');
    let elPop = document.getElementById('vp-population');
    let elVid = document.getElementById('vp-village-id');
    let elKhata = document.getElementById('vp-total-khata');
    let elSurvey = document.getElementById('vp-total-survey');

    if (elName) elName.innerText = tv.villageName; 
    if (elPath) elPath.innerText = `${currentActiveSeja.sejaName} સેજો > ${tp.panchayatName} પંચાયત`; 
    if (elSqm) elSqm.innerText = toGujaratiDigits(Number(tv.areaSqMtr || 0).toLocaleString('en-IN')); 
    if (elHa) elHa.innerText = toGujaratiDigits(tv.formattedArea || '-'); 
    if (elPop) elPop.innerText = toGujaratiDigits(Number(tv.population || 0).toLocaleString('en-IN')); 
    if (elVid) elVid.innerText = tv.villageId || '-';
    if (elKhata) elKhata.innerText = tv.totalKhata ? toGujaratiDigits(tv.totalKhata) : '-';
    if (elSurvey) elSurvey.innerText = tv.totalSurvey ? toGujaratiDigits(tv.totalSurvey) : '-';

    // સ્થાનિક પદાધિકારી / સ્ટાફ (Call, WhatsApp, Copy સાથે)
    let contactsContainer = document.getElementById('vp-contacts-list');
    if (contactsContainer) {
        contactsContainer.innerHTML = `
            <div class="contact-row">
                <div>
                    <span class="contact-badge">મહે. તલાટી</span>
                    <b>${currentActiveSeja.talatiName || '-'}</b>
                </div>
                <div>${buildContactActionButtons(currentActiveSeja.talatiMobile)}</div>
            </div>
            <div class="contact-row" style="border-top:1px dashed #f1f5f9; margin-top:6px; padding-top:6px;">
                <div>
                    <span class="contact-badge">TCM</span>
                    <b>${tp.tcmName || '-'}</b>
                </div>
                <div>${buildContactActionButtons(tp.tcmMobile)}</div>
            </div>
            <div class="contact-row" style="border-top:1px dashed #f1f5f9; margin-top:6px; padding-top:6px;">
                <div>
                    <span class="contact-badge" style="background:#fef3c7; color:#92400e;">સરપંચ</span>
                    <b>${tp.sarpanchName || '-'}</b>
                </div>
                <div>${buildContactActionButtons(tp.sarpanchMobile)}</div>
            </div>
        `;
    }
    
    let isAuthorized = false; 
    if (typeof userSejas !== 'undefined' && userSejas && userSejas.length > 0) { 
        isAuthorized = userSejas.some(s => s.sejaName === currentActiveSeja.sejaName); 
    }
    let editCont = document.getElementById('vp-edit-container');
    if (editCont) editCont.style.display = isAuthorized ? 'block' : 'none';

    document.getElementById('village-profile-modal').style.display = 'flex'; 
    window.history.pushState({ view: 'modal' }, '', '#village');

    // ૧. પહેલાંથી મેમરીમાં રહેલો ડેટા તાત્કાલિક બતાવો (જેથી ક્ષેત્રફળ તરત દેખાય)
    renderVillageViewExtra(tv);

    // ૨. Firestore માંથી લેટેસ્ટ ડેટા લાવી ફરીથી અપડેટ કરો
    let docId = tv.villageId || tv.villageName.replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
    db.collection("Village_Land_Records").doc(docId).get().then(doc => {
        if (doc.exists) {
            let lData = doc.data();
            tv.totalKhata = lData.totalKhata || tv.totalKhata || "";
            tv.totalSurvey = lData.totalSurvey || tv.totalSurvey || "";
            if (lData.population) tv.population = lData.population;
            if (lData.areaSqMtr) {
                tv.areaSqMtr = lData.areaSqMtr;
                tv.formattedArea = lData.formattedArea || tv.formattedArea;
            }
            tv.landRecords = lData.landRecords || [];
            tv.bookmarks = lData.bookmarks || [];
            
            if (elKhata) elKhata.innerText = tv.totalKhata ? toGujaratiDigits(tv.totalKhata) : '-';
            if (elSurvey) elSurvey.innerText = tv.totalSurvey ? toGujaratiDigits(tv.totalSurvey) : '-';
            if (elPop && lData.population) elPop.innerText = toGujaratiDigits(Number(tv.population).toLocaleString('en-IN'));
            if (elSqm && lData.areaSqMtr) elSqm.innerText = toGujaratiDigits(Number(tv.areaSqMtr).toLocaleString('en-IN'));
            if (elHa && lData.formattedArea) elHa.innerText = toGujaratiDigits(tv.formattedArea);
            
            renderVillageViewExtra(tv); // Firestore ડેટા સાથે ફરી તાજું કરો
        }
    }).catch(err => console.log("Land record fetch info:", err));
}

// સરકારી જમીન & બુકમાર્ક્સ કાર્ડ્સ દર્શાવવા
function renderVillageViewExtra(tv) {
    let lrDisp = document.getElementById('vp-land-records-display');
    let bmDisp = document.getElementById('vp-bookmarks-display');
    
    if (bmDisp) {
        if (tv.bookmarks && tv.bookmarks.length > 0) {
            let html = '<div style="font-size:13px; font-weight:700; color:#854d0e; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:12px; margin-bottom:8px;"><i class="fa-solid fa-thumbtack"></i> અગત્યના બુકમાર્કસ</div>';
            
            html += tv.bookmarks.map(b => {
                let bg = b.tag.includes('કોર્ટ') ? '#fee2e2' : (b.tag.includes('દબાણ') ? '#ffedd5' : '#fefce8');
                let tc = b.tag.includes('કોર્ટ') ? '#991b1b' : (b.tag.includes('દબાણ') ? '#9a3412' : '#854d0e');
                let brc = b.tag.includes('કોર્ટ') ? '#f87171' : (b.tag.includes('દબાણ') ? '#fb923c' : '#fde047');
                let formattedArea = formatLandAreaDisplay(b.area);
                
                return `<div style="background:${bg}; border-left:4px solid ${brc}; padding:10px; margin-bottom:8px; border-radius:4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size:10px; font-weight:bold; color:${tc}; margin-bottom:2px; text-transform:uppercase;">${b.tag}</div>
                    <div style="font-size:13px; font-weight:bold; color:#1e293b;">
                        સર્વે નં: ${toGujaratiDigits(b.surveyNo)}
                        ${formattedArea ? `<span style="color:#047857; font-weight:600; font-size:12px; margin-left:5px;">(${formattedArea})</span>` : ''}
                    </div>
                    ${b.note ? `<div style="font-size:11px; color:#475569; margin-top:3px;"><i class="bi bi-info-circle"></i> ${toGujaratiDigits(b.note)}</div>` : ''}
                </div>`;
            }).join('');
            bmDisp.innerHTML = html;
        } else {
            bmDisp.innerHTML = '';
        }
    }

    // બુકમાર્ક્સ રેન્ડર (પ્રોફાઇલમાં ક્ષેત્રફળ બેજ સાથે)
    if (bmDisp) {
        if (tv.bookmarks && tv.bookmarks.length > 0) {
            let html = '<div style="font-size:13px; font-weight:700; color:#854d0e; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:12px; margin-bottom:8px;"><i class="fa-solid fa-thumbtack"></i> અગત્યના બુકમાર્કસ</div>';
            
            html += tv.bookmarks.map(b => {
                let bg = b.tag.includes('કોર્ટ') ? '#fee2e2' : (b.tag.includes('દબાણ') ? '#ffedd5' : '#fefce8');
                let tc = b.tag.includes('કોર્ટ') ? '#991b1b' : (b.tag.includes('દબાણ') ? '#9a3412' : '#854d0e');
                let brc = b.tag.includes('કોર્ટ') ? '#f87171' : (b.tag.includes('દબાણ') ? '#fb923c' : '#fde047');
                
                let areaVal = b.area || b.areaSqMtr || '';
                let formattedArea = formatLandAreaDisplay(areaVal);

                return `
                    <div style="background:${bg}; border-left:4px solid ${brc}; padding:10px 12px; margin-bottom:8px; border-radius:6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-size:10px; font-weight:bold; color:${tc}; text-transform:uppercase; letter-spacing:0.5px;">${b.tag}</span>
                            ${formattedArea ? `<span style="font-size:12px; font-weight:700; color:#047857; background:rgba(255,255,255,0.85); padding:1px 7px; border-radius:4px; border:1px solid rgba(4,120,87,0.25);"><i class="fa-solid fa-vector-square" style="font-size:10px;"></i> ${formattedArea}</span>` : ''}
                        </div>
                        <div style="font-size:13px; font-weight:bold; color:#1e293b;">
                            સર્વે નં: ${toGujaratiDigits(b.surveyNo)}
                        </div>
                        ${b.note ? `<div style="font-size:11px; color:#475569; margin-top:4px;"><i class="bi bi-info-circle"></i> ${toGujaratiDigits(b.note)}</div>` : ''}
                    </div>
                `;
            }).join('');
            bmDisp.innerHTML = html;
        } else {
            bmDisp.innerHTML = '';
        }
    }
}

function closeVillageProfile() { document.getElementById('village-profile-modal').style.display = 'none'; }
function copyToClipboard(t) { navigator.clipboard.writeText(t).then(() => showToast("નંબર કોપી થયો: " + toGujaratiDigits(t))); }

// =========================================================
// ગામની માહિતીમાં સુધારો કરો (EDIT MODE - EDIT & DELETE SUPPORT)
// =========================================================
function openEditVillageForm() {
    if (!currentActiveVillage) return;
    
    editingLandRecordIdx = null;
    editingBookmarkIdx = null;

    let subTitle = document.getElementById('edit-vil-subtitle');
    if (subTitle) subTitle.innerText = `મોજે: ${currentActiveVillage.villageName} (${currentActiveVillage.villageId || ''})`;

    let khataInp = document.getElementById('edit-vil-khata');
    let surveyInp = document.getElementById('edit-vil-survey');
    let popInp = document.getElementById('edit-vil-pop');
    let areaInp = document.getElementById('edit-vil-area');

    if (khataInp) khataInp.value = currentActiveVillage.totalKhata || "";
    if (surveyInp) surveyInp.value = currentActiveVillage.totalSurvey || "";
    if (popInp) popInp.value = currentActiveVillage.population || "";
    if (areaInp) areaInp.value = currentActiveVillage.areaSqMtr || "";

    if (!currentActiveVillage.landRecords) currentActiveVillage.landRecords = [];
    if (!currentActiveVillage.bookmarks) currentActiveVillage.bookmarks = [];

    renderEditManagers();
    document.getElementById('modal-edit-village').style.display = 'flex';
}

function renderEditManagers() {
    let cont = document.getElementById('edit-vil-land-manager-container');
    if(!cont) return;

    let isEditingLR = (editingLandRecordIdx !== null);
    let isEditingBM = (editingBookmarkIdx !== null);

    let html = `
        <!-- સરકારી જમીન રજીસ્ટર મેનેજર -->
        <div style="margin-top:20px; border-top:2px solid #e2e8f0; padding-top:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="font-size:14px; color:#0d47a1; margin:0;"><i class="fa-solid fa-tree-city"></i> સરકારી જમીન / સર્વે નંબર ઉમેરો</h4>
                ${isEditingLR ? '<span style="font-size:11px; color:#d97706; font-weight:bold;">(સુધારો મોડ ચાલુ છે)</span>' : ''}
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <select id="new-lr-cat" class="form-control" style="font-size:12px; padding:8px;">
                    <option value="ગૌચર">ગૌચર</option>
                    <option value="સરકારી પડતર">સરકારી પડતર</option>
                    <option value="ગામતળ">ગામતળ</option>
                    <option value="શ્રી સરકાર">શ્રી સરકાર</option>
                    <option value="જંગલ ખાતું">જંગલ ખાતું</option>
                    <option value="તળાવ / જળાશય">તળાવ / જળાશય</option>
                    <option value="સ્મશાન / કબ્રસ્તાન">સ્મશાન / કબ્રસ્તાન</option>
                    <option value="જાહેર હેતુ / સંસ્થા">જાહેર હેતુ / સંસ્થા</option>
                </select>
                <input type="text" id="new-lr-survey" class="form-control" placeholder="સર્વે નંબર (દા.ત. ૩૨)" style="font-size:12px; padding:8px;">
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <input type="text" id="new-lr-area" class="form-control" placeholder="ક્ષેત્રફળ (10519 કે 1-05-19)" style="font-size:12px; padding:8px;">
                <input type="text" id="new-lr-rem" class="form-control" placeholder="વિગત/નોંધ (દા.ત. જૂનો સર્વે ૧૯૪)" style="font-size:12px; padding:8px;">
            </div>
            
            <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-secondary" style="flex:1; font-size:12px; padding:8px; background:${isEditingLR ? '#2563eb' : '#eff6ff'}; color:${isEditingLR ? '#ffffff' : '#1d4ed8'}; border:1px solid #bfdbfe; font-weight:600;" onclick="saveLandRecordEntry()">
                    ${isEditingLR ? '✔ સુધારો સાચવો' : '+ રજીસ્ટરમાં ઉમેરો'}
                </button>
                ${isEditingLR ? '<button type="button" class="btn btn-secondary" style="font-size:12px; padding:8px; background:#f1f5f9; color:#475569;" onclick="cancelLandRecordEdit()">રદ કરો</button>' : ''}
            </div>
            
            <div id="edit-lr-list" style="margin-top:12px; max-height:160px; overflow-y:auto;">
                ${currentActiveVillage.landRecords.length === 0 ? '<div style="text-align:center; font-size:11px; color:#94a3b8; padding:8px;">કોઈ રેકોર્ડ નથી</div>' : ''}
                ${currentActiveVillage.landRecords.map((r, i) => {
                    let formattedArea = formatLandAreaDisplay(r.area);
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:${editingLandRecordIdx === i ? '#eff6ff' : '#f8fafc'}; padding:8px 10px; margin-bottom:6px; font-size:12px; border:1px solid ${editingLandRecordIdx === i ? '#93c5fd' : '#e2e8f0'}; border-radius:6px;">
                            <div style="flex:1;">
                                <b>${r.category}:</b> ${toGujaratiDigits(r.surveyNo)}${formattedArea ? `<span style="color:#047857; font-weight:600;">(${formattedArea})</span>` : ''}
                                ${r.remarks ? `<span style="font-size:11px; color:#64748b; display:block;">${toGujaratiDigits(r.remarks)}</span>` : ''}
                            </div>
                            <div style="display:flex; gap:8px; margin-left:8px;">
                                <button type="button" onclick="editLandRecord(${i})" style="color:#2563eb; background:none; border:none; cursor:pointer; font-size:14px;" title="સુધારો કરો">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button type="button" onclick="removeLandRecord(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:14px;" title="રદ કરો">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- બુકમાર્ક મેનેજર (ક્ષેત્રફળ ઇનપુટ સાથે) -->
        <div style="margin-top:20px; border-top:2px solid #e2e8f0; padding-top:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="font-size:14px; color:#854d0e; margin:0;"><i class="fa-solid fa-thumbtack"></i> સર્વે નંબર બુકમાર્ક કરો</h4>
                ${isEditingBM ? '<span style="font-size:11px; color:#d97706; font-weight:bold;">(સુધારો મોડ ચાલુ છે)</span>' : ''}
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <select id="new-bm-tag" class="form-control" style="font-size:12px; padding:8px;">
                    <option value="કોર્ટ કેસ / તકરારી">કોર્ટ કેસ / તકરારી</option>
                    <option value="દબાણ (Encroachment)">દબાણ (Encroachment)</option>
                    <option value="બિનખેતી (NA)">બિનખેતી (NA)</option>
                    <option value="અન્ય અગત્યના">અન્ય અગત્યના</option>
                </select>
                <input type="text" id="new-bm-survey" class="form-control" placeholder="સર્વે નંબર (દા.ત. ૧૦૫)" style="font-size:12px; padding:8px;">
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <input type="text" id="new-bm-area" class="form-control" placeholder="ક્ષેત્રફળ (10519 કે 1-05-19)" style="font-size:12px; padding:8px;">
                <input type="text" id="new-bm-note" class="form-control" placeholder="ખાસ નોંધ (દા.ત. સ્ટે ઓર્ડર છે)" style="font-size:12px; padding:8px;">
            </div>
            
            <div style="display:flex; gap:8px;">
                <button type="button" class="btn btn-secondary" style="flex:1; font-size:12px; padding:8px; background:${isEditingBM ? '#d97706' : '#fef3c7'}; color:${isEditingBM ? '#ffffff' : '#92400e'}; border:1px solid #fde68a; font-weight:600;" onclick="saveBookmarkEntry()">
                    ${isEditingBM ? '✔ બુકમાર્ક સાચવો' : '+ બુકમાર્ક ઉમેરો'}
                </button>
                ${isEditingBM ? '<button type="button" class="btn btn-secondary" style="font-size:12px; padding:8px; background:#f1f5f9; color:#475569;" onclick="cancelBookmarkEdit()">રદ કરો</button>' : ''}
            </div>
            
            <div id="edit-bm-list" style="margin-top:12px; max-height:160px; overflow-y:auto;">
                ${currentActiveVillage.bookmarks.length === 0 ? '<div style="text-align:center; font-size:11px; color:#94a3b8; padding:8px;">કોઈ બુકમાર્ક નથી</div>' : ''}
                ${currentActiveVillage.bookmarks.map((b, i) => {
                    let formattedArea = formatLandAreaDisplay(b.area);
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:${editingBookmarkIdx === i ? '#fef9c3' : '#fefce8'}; padding:8px 10px; margin-bottom:6px; font-size:12px; border:1px solid ${editingBookmarkIdx === i ? '#fde047' : '#fef08a'}; border-radius:6px;">
                            <div style="flex:1;">
                                <b>${b.tag}:</b> ${toGujaratiDigits(b.surveyNo)}
                                ${formattedArea ? `<span style="color:#047857; font-weight:600;">(${formattedArea})</span>` : ''}
                                ${b.note ? `<span style="font-size:11px; color:#64748b; display:block;">${toGujaratiDigits(b.note)}</span>` : ''}
                            </div>
                            <div style="display:flex; gap:8px; margin-left:8px;">
                                <button type="button" onclick="editBookmark(${i})" style="color:#2563eb; background:none; border:none; cursor:pointer; font-size:14px;" title="સુધારો કરો">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button type="button" onclick="removeBookmark(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:14px;" title="રદ કરો">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    cont.innerHTML = html;
}

// સરકારી જમીન: Save / Add Handler
window.saveLandRecordEntry = function() {
    let cat = document.getElementById('new-lr-cat').value;
    let sur = document.getElementById('new-lr-survey').value.trim();
    let area = document.getElementById('new-lr-area').value.trim();
    let rem = document.getElementById('new-lr-rem').value.trim();
    
    if(!sur) { showToast("કૃપા કરી સર્વે નંબર દાખલ કરો", "warning"); return; }
    
    let recordObj = {
        id: (editingLandRecordIdx !== null && currentActiveVillage.landRecords[editingLandRecordIdx].id) ? currentActiveVillage.landRecords[editingLandRecordIdx].id : Date.now().toString(),
        category: cat,
        surveyNo: sur,
        area: area,
        remarks: rem
    };

    if (editingLandRecordIdx !== null) {
        currentActiveVillage.landRecords[editingLandRecordIdx] = recordObj;
        editingLandRecordIdx = null;
        showToast("એન્ટ્રી સુધારી લેવાઈ છે!");
    } else {
        currentActiveVillage.landRecords.push(recordObj);
        showToast("નવી એન્ટ્રી ઉમેરાઈ ગઈ!");
    }

    renderEditManagers();
};

window.editLandRecord = function(idx) {
    let r = currentActiveVillage.landRecords[idx];
    if (!r) return;
    
    editingLandRecordIdx = idx;
    renderEditManagers();

    // ફોર્મમાં જૂની વેલ્યુ ભરી આપો
    safeSetValue('new-lr-cat', r.category || 'ગૌચર');
    safeSetValue('new-lr-survey', r.surveyNo || '');
    safeSetValue('new-lr-area', r.area || '');
    safeSetValue('new-lr-rem', r.remarks || '');
    
    let el = document.getElementById('new-lr-survey');
    if (el) el.focus();
};

window.cancelLandRecordEdit = function() {
    editingLandRecordIdx = null;
    renderEditManagers();
};

window.removeLandRecord = function(idx) {
    if(confirm("શું તમે ખરેખર આ સરકારી જમીન રેકોર્ડ કાઢી નાખવા માંગો છો?")) {
        currentActiveVillage.landRecords.splice(idx, 1);
        if (editingLandRecordIdx === idx) editingLandRecordIdx = null;
        renderEditManagers();
    }
};

// બુકમાર્ક: Save / Add Handler
window.saveBookmarkEntry = function() {
    let tag = document.getElementById('new-bm-tag').value;
    let sur = document.getElementById('new-bm-survey').value.trim();
    let area = document.getElementById('new-bm-area').value.trim();
    let note = document.getElementById('new-bm-note').value.trim();
    
    if(!sur) { showToast("કૃપા કરી સર્વે નંબર દાખલ કરો", "warning"); return; }
    
    let bmObj = {
        id: (editingBookmarkIdx !== null && currentActiveVillage.bookmarks[editingBookmarkIdx].id) ? currentActiveVillage.bookmarks[editingBookmarkIdx].id : Date.now().toString(),
        tag: tag,
        surveyNo: sur,
        area: area,
        note: note
    };

    if (editingBookmarkIdx !== null) {
        currentActiveVillage.bookmarks[editingBookmarkIdx] = bmObj;
        editingBookmarkIdx = null;
        showToast("બુકમાર્ક સુધારી લેવાયો છે!");
    } else {
        currentActiveVillage.bookmarks.push(bmObj);
        showToast("બુકમાર્ક ઉમેરાઈ ગયો!");
    }

    renderEditManagers();
};

window.editBookmark = function(idx) {
    let b = currentActiveVillage.bookmarks[idx];
    if (!b) return;

    editingBookmarkIdx = idx;
    renderEditManagers();

    safeSetValue('new-bm-tag', b.tag || 'કોર્ટ કેસ / તકરારી');
    safeSetValue('new-bm-survey', b.surveyNo || '');
    safeSetValue('new-bm-area', b.area || '');
    safeSetValue('new-bm-note', b.note || '');

    let el = document.getElementById('new-bm-survey');
    if (el) el.focus();
};

window.cancelBookmarkEdit = function() {
    editingBookmarkIdx = null;
    renderEditManagers();
};

window.removeBookmark = function(idx) {
    if(confirm("શું તમે આ બુકમાર્ક કાઢી નાખવા માંગો છો?")) {
        currentActiveVillage.bookmarks.splice(idx, 1);
        if (editingBookmarkIdx === idx) editingBookmarkIdx = null;
        renderEditManagers();
    }
};

function closeEditVillageModal() {
    editingLandRecordIdx = null;
    editingBookmarkIdx = null;
    document.getElementById('modal-edit-village').style.display = 'none';
}

function saveVillageEdits() {
    if (!currentActiveVillage) return;

    let btn = document.getElementById('btn-save-vil-edits');
    if (btn) { btn.disabled = true; btn.innerText = "સેવ થાય છે..."; }

    let newKhata = document.getElementById('edit-vil-khata') ? document.getElementById('edit-vil-khata').value.trim() : "";
    let newSurvey = document.getElementById('edit-vil-survey') ? document.getElementById('edit-vil-survey').value.trim() : "";
    let newPop = document.getElementById('edit-vil-pop') ? document.getElementById('edit-vil-pop').value.trim() : "";
    let newArea = document.getElementById('edit-vil-area') ? document.getElementById('edit-vil-area').value.trim() : "";

    currentActiveVillage.totalKhata = newKhata;
    currentActiveVillage.totalSurvey = newSurvey;
    if (newPop !== "") currentActiveVillage.population = Number(newPop);
    if (newArea !== "") {
        currentActiveVillage.areaSqMtr = Number(newArea);
        let totalSqm = Number(newArea);
        let ha = Math.floor(totalSqm / 10000);
        let rem = totalSqm % 10000;
        let are = Math.floor(rem / 100);
        let sqm = Math.round(rem % 100);
        currentActiveVillage.formattedArea = `${ha}-${String(are).padStart(2, '0')}-${String(sqm).padStart(2, '0')}`;
    }

    let docId = currentActiveVillage.villageId || currentActiveVillage.villageName.replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');

    db.collection("Village_Land_Records").doc(docId).set({
        villageId: docId,
        villageName: currentActiveVillage.villageName,
        sejaName: currentActiveSeja ? currentActiveSeja.sejaName : "",
        totalKhata: newKhata,
        totalSurvey: newSurvey,
        population: currentActiveVillage.population,
        areaSqMtr: currentActiveVillage.areaSqMtr,
        formattedArea: currentActiveVillage.formattedArea,
        landRecords: currentActiveVillage.landRecords,
        bookmarks: currentActiveVillage.bookmarks,
        updatedBy: (currentUser && currentUser.name) ? currentUser.name : "Talati",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> સેવ કરો'; }
        closeEditVillageModal();
        openVillageProfile(currentActiveVillage.villageId, currentActivePanchayat ? currentActivePanchayat.panchayatName : "");
        showToast("ગામની માહિતી સફળતાપૂર્વક અપડેટ થઈ!");
    }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> સેવ કરો'; }
        alert("સેવ કરવામાં એરર: " + err.message);
    });
}

async function openVillageFromHero(villageName) {
    if (!talukaDirectoryData) {
        let cached = (typeof getMasterDataCache === 'function') ? getMasterDataCache() : null;
        if (cached) {
            talukaDirectoryData = cached;
        } else {
            showToast("ડિરેક્ટરી લોડ થાય છે...");
            try {
                let doc = await db.collection("Master_Data").doc("Taluka_Directory").get();
                if (doc.exists) {
                    talukaDirectoryData = doc.data();
                    if (typeof setMasterDataCache === 'function') setMasterDataCache(talukaDirectoryData);
                }
            } catch (e) {
                alert("ડિરેક્ટરી લોડ કરવામાં સમસ્યા: " + e.message);
                return;
            }
        }
    }

    if (!talukaDirectoryData || !talukaDirectoryData.sejas) return;

    let cleanTarget = villageName.trim();
    let targetSeja = null, targetPanch = null, targetVil = null;

    for (let s of talukaDirectoryData.sejas) {
        if (s.panchayats && Array.isArray(s.panchayats)) {
            for (let p of s.panchayats) {
                if (p.villages && Array.isArray(p.villages)) {
                    for (let v of p.villages) {
                        let vName = (v.villageName || v.name || "").trim();
                        if (vName === cleanTarget || vName.includes(cleanTarget) || cleanTarget.includes(vName)) {
                            targetSeja = s;
                            targetPanch = p;
                            targetVil = v;
                            break;
                        }
                    }
                }
                if (targetVil) break;
            }
        }
        if (targetVil) break;
    }

    if (targetSeja && targetVil) {
        currentActiveSeja = targetSeja;
        openVillageProfile(targetVil.villageId, targetPanch.panchayatName);
    } else {
        showToast(`"${villageName}" ગામની વિગત મળી નથી.`);
    }
}