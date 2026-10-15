// js/directory.js
var talukaDirectoryData = null;
let currentActiveSeja = null; 
let currentActivePanchayat = null;
let currentActiveVillage = null;

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
        const tm = p.tcmMobile ? p.tcmMobile.replace(/[^0-9]/g, '') : ''; 
        const sm = p.sarpanchMobile ? p.sarpanchMobile.replace(/[^0-9]/g, '') : '';
        return `<div class="panchayat-card"><div class="panchayat-header"><h3><i class="fa-solid fa-landmark"></i> ${p.panchayatName} પંચાયત</h3><span style="font-size:11px;">${toGujaratiDigits(p.villages.length)} ગામો</span></div><div class="contact-row"><div><span class="contact-badge">TCM</span><b>${p.tcmName}</b></div><div>${tm.length===10?`<a href="tel:${tm}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a><button onclick="copyToClipboard('${tm}')" class="btn-mini-contact" style="background:#64748b; border:none;"><i class="fa-solid fa-copy"></i></button>`:`-`}</div></div><div class="contact-row" style="border-top:1px dashed #f1f5f9; margin-top:4px;"><div><span class="contact-badge" style="background:#fef3c7; color:#92400e;">સરપંચ</span><b>${p.sarpanchName}</b></div><div>${sm.length===10?`<a href="tel:${sm}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a><button onclick="copyToClipboard('${sm}')" class="btn-mini-contact" style="background:#64748b; border:none;"><i class="fa-solid fa-copy"></i></button>`:`-`}</div></div><div class="panchayat-villages-list"><span style="font-size:11px; font-weight:bold; color:var(--text-muted); display:block; margin-bottom:4px;">મહેસૂલી ગામો:</span>${p.villages.map(v => `<button class="village-chip-btn" onclick="openVillageProfile('${v.villageId}', '${p.panchayatName}')"><i class="fa-solid fa-location-dot" style="font-size:10px;"></i> ${v.villageName}</button>`).join('')}</div></div>`;
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

    // પ્રાથમિક માહિતી
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

    // સંપર્ક યાદી
    document.getElementById('vp-contacts-list').innerHTML = `
        <div class="contact-row"><div><span class="contact-badge">મહે. તલાટી</span><b>${currentActiveSeja.talatiName}</b></div><div><a href="tel:${currentActiveSeja.talatiMobile}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a></div></div>
        <div class="contact-row"><div><span class="contact-badge">TCM</span><b>${tp.tcmName}</b></div><div><a href="tel:${tp.tcmMobile}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a></div></div>
        <div class="contact-row"><div><span class="contact-badge" style="background:#fef3c7; color:#92400e;">સરપંચ</span><b>${tp.sarpanchName}</b></div><div><a href="tel:${tp.sarpanchMobile}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a></div></div>
    `;
    
    // પાવર ચેક (શું આ યુઝરનો પોતાનો સેજો છે?)
    let isAuthorized = false; 
    if (typeof userSejas !== 'undefined' && userSejas && userSejas.length > 0) { 
        isAuthorized = userSejas.some(s => s.sejaName === currentActiveSeja.sejaName); 
    }
    let editCont = document.getElementById('vp-edit-container');
    if (editCont) editCont.style.display = isAuthorized ? 'block' : 'none';

    document.getElementById('village-profile-modal').style.display = 'flex'; 
    window.history.pushState({ view: 'modal' }, '', '#village');

    // Firestore ના Village_Land_Records માંથી ડેટા લાવો
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
        }
    }).catch(err => console.log("Land record fetch info:", err));
}

function renderVillageViewExtra(tv) {
    let lrDisp = document.getElementById('vp-land-records-display');
    let bmDisp = document.getElementById('vp-bookmarks-display');
    
    // સરકારી જમીન રજીસ્ટર રેન્ડર (Grouped)
    if (lrDisp) {
        if (tv.landRecords && tv.landRecords.length > 0) {
            let html = '<div style="font-size:13px; font-weight:700; color:#0d47a1; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:12px; margin-bottom:8px;"><i class="fa-solid fa-tree-city"></i> સરકારી જમીન / સર્વે નંબર બેંક</div>';
            
            let grouped = {};
            tv.landRecords.forEach(r => {
                if(!grouped[r.category]) grouped[r.category] = [];
                grouped[r.category].push(r);
            });

            for(let cat in grouped) {
                html += `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:10px;">
                    <div style="font-weight:700; font-size:13px; color:#334155; margin-bottom:6px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">${cat} <span style="float:right; font-size:10px; background:#e2e8f0; padding:2px 6px; border-radius:10px;">${toGujaratiDigits(grouped[cat].length)} એન્ટ્રી</span></div>
                    ${grouped[cat].map(r => `<div style="font-size:12px; padding:4px 0; display:flex; justify-content:space-between;">
                        <span><b style="color:#2563eb;">સર્વે નં:</b> ${toGujaratiDigits(r.surveyNo)}${r.area ? `<span style="color:#64748b; font-size:11px;">(${toGujaratiDigits(r.area)})</span>` : ''}</span>
                        <span style="color:#475569; font-size:11px; text-align:right;">${r.remarks}</span>
                    </div>`).join('')}
                </div>`;
            }
            lrDisp.innerHTML = html;
        } else {
            lrDisp.innerHTML = '';
        }
    }

    // બુકમાર્ક્સ રેન્ડર
    if (bmDisp) {
        if (tv.bookmarks && tv.bookmarks.length > 0) {
            let html = '<div style="font-size:13px; font-weight:700; color:#854d0e; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:12px; margin-bottom:8px;"><i class="fa-solid fa-thumbtack"></i> અગત્યના બુકમાર્કસ</div>';
            
            html += tv.bookmarks.map(b => {
                let bg = b.tag.includes('કોર્ટ') ? '#fee2e2' : (b.tag.includes('દબાણ') ? '#ffedd5' : '#fefce8');
                let tc = b.tag.includes('કોર્ટ') ? '#991b1b' : (b.tag.includes('દબાણ') ? '#9a3412' : '#854d0e');
                let brc = b.tag.includes('કોર્ટ') ? '#f87171' : (b.tag.includes('દબાણ') ? '#fb923c' : '#fde047');
                
                return `<div style="background:${bg}; border-left:4px solid ${brc}; padding:10px; margin-bottom:8px; border-radius:4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    <div style="font-size:10px; font-weight:bold; color:${tc}; margin-bottom:2px; text-transform:uppercase;">${b.tag}</div>
                    <div style="font-size:13px; font-weight:bold; color:#1e293b;">સર્વે નં: ${toGujaratiDigits(b.surveyNo)}</div>
                    ${b.note ? `<div style="font-size:11px; color:#475569; margin-top:3px;"><i class="bi bi-info-circle"></i> ${b.note}</div>` : ''}
                </div>`;
            }).join('');
            bmDisp.innerHTML = html;
        } else {
            bmDisp.innerHTML = '';
        }
    }
}

function closeVillageProfile() { document.getElementById('village-profile-modal').style.display = 'none'; }
function copyToClipboard(t) { navigator.clipboard.writeText(t).then(() => showToast("નંબર કોપી થયો: " + t)); }


// =========================================================
// ગામની માહિતીમાં સુધારો કરો (EDIT MODE - Step 2 Manager)
// =========================================================
function openEditVillageForm() {
    if (!currentActiveVillage) return;
    
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

    // Arrays ખાતરી કરો
    if(!currentActiveVillage.landRecords) currentActiveVillage.landRecords = [];
    if(!currentActiveVillage.bookmarks) currentActiveVillage.bookmarks = [];

    renderEditManagers(); // ડાયનેમિક ફોર્મ બનાવો
    document.getElementById('modal-edit-village').style.display = 'flex';
}

function renderEditManagers() {
    let cont = document.getElementById('edit-vil-land-manager-container');
    if(!cont) return;

    let html = `
        <div style="margin-top:20px; border-top:2px solid #e2e8f0; padding-top:15px;">
            <h4 style="font-size:14px; color:#0d47a1; margin-bottom:10px;"><i class="fa-solid fa-tree-city"></i> સરકારી જમીન / સર્વે નંબર ઉમેરો</h4>
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
                <input type="text" id="new-lr-survey" class="form-control" placeholder="સર્વે નંબર (દા.ત. ૧૦૫/૧)" style="font-size:12px; padding:8px;">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <input type="text" id="new-lr-area" class="form-control" placeholder="ક્ષેત્રફળ (હે-આ-ચો)" style="font-size:12px; padding:8px;">
                <input type="text" id="new-lr-rem" class="form-control" placeholder="વિગત/નોંધ" style="font-size:12px; padding:8px;">
            </div>
            <button class="btn btn-secondary" style="width:100%; font-size:12px; padding:8px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;" onclick="addLandRecord()">+ રજીસ્ટરમાં ઉમેરો</button>
            
            <div id="edit-lr-list" style="margin-top:12px; max-height:160px; overflow-y:auto;">
                ${currentActiveVillage.landRecords.length === 0 ? '<div style="text-align:center; font-size:11px; color:#94a3b8;">કોઈ રેકોર્ડ નથી</div>' : ''}
                ${currentActiveVillage.landRecords.map((r, i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px; margin-bottom:6px; font-size:12px; border:1px solid #e2e8f0; border-radius:4px;">
                        <div style="flex:1;"><b>${r.category}:</b>${toGujaratiDigits(r.surveyNo)}</div>
                        <button onclick="removeLandRecord(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:14px;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `).join('')}
            </div>
        </div>

        <div style="margin-top:20px; border-top:2px solid #e2e8f0; padding-top:15px;">
            <h4 style="font-size:14px; color:#854d0e; margin-bottom:10px;"><i class="fa-solid fa-thumbtack"></i> સર્વે નંબર બુકમાર્ક કરો</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <select id="new-bm-tag" class="form-control" style="font-size:12px; padding:8px;">
                    <option value="કોર્ટ કેસ / તકરારી">કોર્ટ કેસ / તકરારી</option>
                    <option value="દબાણ (Encroachment)">દબાણ (Encroachment)</option>
                    <option value="બિનખેતી (NA)">બિનખેતી (NA)</option>
                    <option value="અન્ય અગત્યના">અન્ય અગત્યના</option>
                </select>
                <input type="text" id="new-bm-survey" class="form-control" placeholder="સર્વે નંબર" style="font-size:12px; padding:8px;">
            </div>
            <input type="text" id="new-bm-note" class="form-control" placeholder="ખાસ નોંધ (દા.ત. સ્ટે છે)" style="margin-bottom:8px; font-size:12px; padding:8px;">
            <button class="btn btn-secondary" style="width:100%; font-size:12px; padding:8px; background:#fef3c7; color:#92400e; border:1px solid #fde68a;" onclick="addBookmark()">+ બુકમાર્ક ઉમેરો</button>
            
            <div id="edit-bm-list" style="margin-top:12px; max-height:160px; overflow-y:auto;">
                ${currentActiveVillage.bookmarks.length === 0 ? '<div style="text-align:center; font-size:11px; color:#94a3b8;">કોઈ બુકમાર્ક નથી</div>' : ''}
                ${currentActiveVillage.bookmarks.map((b, i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fefce8; padding:8px; margin-bottom:6px; font-size:12px; border:1px solid #fef08a; border-radius:4px;">
                        <div style="flex:1;"><b>${b.tag}:</b>${toGujaratiDigits(b.surveyNo)}</div>
                        <button onclick="removeBookmark(${i})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:14px;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    cont.innerHTML = html;
}

// Global functions for inline HTML onclick
window.addLandRecord = function() {
    let cat = document.getElementById('new-lr-cat').value;
    let sur = document.getElementById('new-lr-survey').value.trim();
    let area = document.getElementById('new-lr-area').value.trim();
    let rem = document.getElementById('new-lr-rem').value.trim();
    if(!sur) { showToast("કૃપા કરી સર્વે નંબર દાખલ કરો", "warning"); return; }
    
    currentActiveVillage.landRecords.push({ id: Date.now().toString(), category: cat, surveyNo: sur, area: area, remarks: rem });
    renderEditManagers(); // Refresh list
};

window.removeLandRecord = function(idx) {
    if(confirm("શું તમે ખરેખર આ રેકોર્ડ કાઢી નાખવા માંગો છો?")) {
        currentActiveVillage.landRecords.splice(idx, 1);
        renderEditManagers();
    }
};

window.addBookmark = function() {
    let tag = document.getElementById('new-bm-tag').value;
    let sur = document.getElementById('new-bm-survey').value.trim();
    let note = document.getElementById('new-bm-note').value.trim();
    if(!sur) { showToast("કૃપા કરી સર્વે નંબર દાખલ કરો", "warning"); return; }
    
    currentActiveVillage.bookmarks.push({ id: Date.now().toString(), tag: tag, surveyNo: sur, note: note });
    renderEditManagers();
};

window.removeBookmark = function(idx) {
    if(confirm("શું તમે આ બુકમાર્ક કાઢી નાખવા માંગો છો?")) {
        currentActiveVillage.bookmarks.splice(idx, 1);
        renderEditManagers();
    }
};

function closeEditVillageModal() {
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

    // ફાઇનલ સેવ (Step 1 + Step 2)
    db.collection("Village_Land_Records").doc(docId).set({
        villageId: docId,
        villageName: currentActiveVillage.villageName,
        sejaName: currentActiveSeja ? currentActiveSeja.sejaName : "",
        totalKhata: newKhata,
        totalSurvey: newSurvey,
        population: currentActiveVillage.population,
        areaSqMtr: currentActiveVillage.areaSqMtr,
        formattedArea: currentActiveVillage.formattedArea,
        landRecords: currentActiveVillage.landRecords, // સેવ રજીસ્ટર
        bookmarks: currentActiveVillage.bookmarks, // સેવ બુકમાર્ક
        updatedBy: (currentUser && currentUser.name) ? currentUser.name : "Talati",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> સેવ કરો'; }
        closeEditVillageModal();
        
        // મોડલ તાત્કાલિક અપડેટ કરો
        openVillageProfile(currentActiveVillage.villageId, currentActivePanchayat ? currentActivePanchayat.panchayatName : "");
        showToast("ગામની માહિતી સફળતાપૂર્વક અપડેટ થઈ!");
    }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> સેવ કરો'; }
        alert("સેવ કરવામાં એરર: " + err.message);
    });
}

// =========================================================
// ડેશબોર્ડના Hero Card પરથી ગામ ખોલવા
// =========================================================
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