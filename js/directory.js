// js/directory.js
var talukaDirectoryData = null;

function loadDirectoryData() {
    if (talukaDirectoryData) { renderSejasGrid(talukaDirectoryData.sejas); return; }
    
    let container = document.getElementById('directory-grid-container');
    if (container) container.innerHTML = '<p style="text-align:center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> ડિરેક્ટરી લોડ થાય છે...</p>';
    
    let mySejaName = (activeSeja && activeSeja.sejaName) ? activeSeja.sejaName : "";
    
    // ૧. પહેલા LocalStorage Cache માં ચેક કરો
    let cachedData = getMasterDataCache();
    if (cachedData) {
        processDirectoryData(cachedData, mySejaName, container);
        return;
    }

    // ૨. જો Cache ખાલી હોય કે એક્સપાયર થયો હોય તો જ Firebase માંથી લાવો
    db.collection("Master_Data").doc("Taluka_Directory").get().then((doc) => {
        if (doc.exists) {
            let response = doc.data();
            setMasterDataCache(response); // નવો ડેટા Cache માં સેવ કરો
            processDirectoryData(response, mySejaName, container);
        } else { 
            if (container) container.innerHTML = `<p style="color:red; text-align:center;">ડિરેક્ટરી ડેટા હજુ સેટ થયો નથી.</p>`; 
        }
    }).catch((err) => { 
        if (container) container.innerHTML = `<p style="color:red; text-align:center;">ડિરેક્ટરી એરર: ${err.message}</p>`; 
    });
}

// રિપીટ થતો કોડ બચાવવા માટે એક નાનું Helper Function
function processDirectoryData(response, mySejaName, container) {
    talukaDirectoryData = response;
    let statTotal = document.getElementById('stat-total-sejas');
    if (statTotal) statTotal.innerText = toGujaratiDigits(response.totalSejas || (response.sejas ? response.sejas.length : 0));
    
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
    document.getElementById('dir-breadcrumbs').innerHTML = `<span class="crumb-link" onclick="renderSejasGrid()"><i class="fa-solid fa-house"></i> લુણાવાડા</span>`;
    if (!list || list.length === 0) { container.innerHTML = `<p style="grid-column: 1/-1; text-align:center;">કોઈ સેજો મળ્યો નથી.</p>`; return; }

    let mySejaName = (activeSeja && activeSeja.sejaName) ? activeSeja.sejaName : "";
    container.innerHTML = list.map(seja => {
        const isMySeja = (seja.sejaName === mySejaName);
        const chargeClass = (seja.chargeType === "કાયમી") ? "permanent" : "additional";
        const cm = seja.talatiMobile && seja.talatiMobile !== "-" ? seja.talatiMobile.replace(/[^0-9]/g, '') : '';
        return `<div class="seja-grid-card ${isMySeja ? 'my-seja' : ''}" onclick="renderPanchayatsView('${seja.sejaName}')"><div><div class="seja-card-header"><div class="seja-card-title">${seja.sejaName} સેજો ${isMySeja?'<span style="font-size:10px; color:#2563eb; display:block;">(મારો સેજો)</span>':''}</div><span class="badge-charge ${chargeClass}">${seja.chargeType}</span></div><div class="talati-info"><i class="fa-solid fa-user-tie" style="color:var(--text-muted); font-size:12px;"></i><span>${seja.talatiName}</span></div><div class="seja-counts-bar"><span><i class="fa-solid fa-building"></i> ${toGujaratiDigits(seja.panchayatsCount)} પંચાયત</span><span><i class="fa-solid fa-location-dot"></i> ${toGujaratiDigits(seja.villagesCount)} ગામો</span></div></div><div class="seja-quick-actions" onclick="event.stopPropagation()">${cm.length===10 ? `<a href="tel:${cm}" class="btn-contact btn-call"><i class="fa-solid fa-phone"></i> કોલ</a><a href="https://wa.me/91${cm}" target="_blank" class="btn-contact btn-wa"><i class="fa-brands fa-whatsapp"></i> વોટ્સએપ</a>` : `<span style="font-size:11px; color:#999; text-align:center; width:100%;">સંપર્ક ઉપલબ્ધ નથી</span>`}</div></div>`;
    }).join('');
}

function filterDirectory(query) {
    const clearBtn = document.getElementById('clear-search'); clearBtn.style.display = query ? "block" : "none";
    if (!talukaDirectoryData) return;
    const q = query.trim().toLowerCase();
    if (!q) { renderSejasGrid(talukaDirectoryData.sejas); return; }
    const filtered = talukaDirectoryData.sejas.filter(s => s.sejaName.toLowerCase().includes(q) || s.talatiName.toLowerCase().includes(q) || s.panchayats.some(p => p.panchayatName.toLowerCase().includes(q) || p.villages.some(v => v.villageName.toLowerCase().includes(q))));
    renderSejasGrid(filtered);
}

function clearSearchInput() { document.getElementById('dir-search-input').value = ""; document.getElementById('clear-search').style.display = "none"; if (talukaDirectoryData) renderSejasGrid(talukaDirectoryData.sejas); }

let currentActiveSeja = null; let currentActiveVillage = null;
function renderPanchayatsView(sejaName, pushHistory = true) {
    currentActiveSeja = talukaDirectoryData.sejas.find(s => s.sejaName === sejaName); if (!currentActiveSeja) return;
    document.getElementById('directory-grid-container').style.display = 'none'; document.getElementById('panchayat-view-container').style.display = 'block';
    document.getElementById('dir-breadcrumbs').innerHTML = `<span class="crumb-link" onclick="restoreSejasGrid()"><i class="fa-solid fa-house"></i> લુણાવાડા</span><i class="fa-solid fa-chevron-right" style="font-size:10px;"></i><span>${currentActiveSeja.sejaName} સેજો</span>`;
    document.getElementById('seja-detail-header').innerHTML = `<div style="display:flex; justify-content:space-between; align-items:flex-start;"><div><h2>${currentActiveSeja.sejaName} સેજો (${currentActiveSeja.chargeType})</h2><p><i class="fa-solid fa-user-tie"></i> તલાટી: <b>${currentActiveSeja.talatiName}</b></p></div><div style="text-align:right;"><p style="font-size:12px;"><i class="fa-solid fa-users"></i> વસ્તી: <b>${toGujaratiDigits(currentActiveSeja.totalPopulation)}</b></p><p style="font-size:12px;"><i class="fa-solid fa-vector-square"></i> ક્ષેત્રફળ: <b>${toGujaratiDigits(currentActiveSeja.totalAreaSqMtr)} ચો.મી.</b></p></div></div>`;
    
    document.getElementById('panchayats-list').innerHTML = currentActiveSeja.panchayats.map(p => {
        const tm = p.tcmMobile ? p.tcmMobile.replace(/[^0-9]/g, '') : ''; const sm = p.sarpanchMobile ? p.sarpanchMobile.replace(/[^0-9]/g, '') : '';
        return `<div class="panchayat-card"><div class="panchayat-header"><h3><i class="fa-solid fa-landmark"></i> ${p.panchayatName} પંચાયત</h3><span style="font-size:11px;">${toGujaratiDigits(p.villages.length)} ગામો</span></div><div class="contact-row"><div><span class="contact-badge">TCM</span><b>${p.tcmName}</b></div><div>${tm.length===10?`<a href="tel:${tm}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a><button onclick="copyToClipboard('${tm}')" class="btn-mini-contact" style="background:#64748b; border:none;"><i class="fa-solid fa-copy"></i></button>`:`-`}</div></div><div class="contact-row" style="border-top:1px dashed #f1f5f9; margin-top:4px;"><div><span class="contact-badge" style="background:#fef3c7; color:#92400e;">સરપંચ</span><b>${p.sarpanchName}</b></div><div>${sm.length===10?`<a href="tel:${sm}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a><button onclick="copyToClipboard('${sm}')" class="btn-mini-contact" style="background:#64748b; border:none;"><i class="fa-solid fa-copy"></i></button>`:`-`}</div></div><div class="panchayat-villages-list"><span style="font-size:11px; font-weight:bold; color:var(--text-muted); display:block; margin-bottom:4px;">મહેસૂલી ગામો:</span>${p.villages.map(v => `<button class="village-chip-btn" onclick="openVillageProfile('${v.villageId}', '${p.panchayatName}')"><i class="fa-solid fa-location-dot" style="font-size:10px;"></i> ${v.villageName}</button>`).join('')}</div></div>`;
    }).join('');

    if (pushHistory) { window.history.pushState({ view: 'directory-panchayat', seja: sejaName }, '', '#panchayat'); }
}

function restoreSejasGrid() { window.history.back(); }

function openVillageProfile(vid, pname) {
    if (!currentActiveSeja) return;
    let tv = null; let tp = null;
    for (let p of currentActiveSeja.panchayats) { let v = p.villages.find(i => i.villageId === vid); if (v) { tv = v; tp = p; break; } }
    if (!tv) return; currentActiveVillage = tv;

    document.getElementById('vp-village-name').innerText = tv.villageName; document.getElementById('vp-hierarchy-path').innerText = `${currentActiveSeja.sejaName} સેજો > ${tp.panchayatName} પંચાયત`; document.getElementById('vp-area-sqm').innerText = toGujaratiDigits(Number(tv.areaSqMtr).toLocaleString('en-IN')); document.getElementById('vp-area-ha').innerText = toGujaratiDigits(tv.formattedArea); document.getElementById('vp-population').innerText = toGujaratiDigits(Number(tv.population).toLocaleString('en-IN')); document.getElementById('vp-village-id').innerText = tv.villageId;

    document.getElementById('vp-contacts-list').innerHTML = `<div class="contact-row"><div><span class="contact-badge">મહે. તલાટી</span><b>${currentActiveSeja.talatiName}</b></div><div><a href="tel:${currentActiveSeja.talatiMobile}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a></div></div><div class="contact-row"><div><span class="contact-badge">TCM</span><b>${tp.tcmName}</b></div><div><a href="tel:${tp.tcmMobile}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a></div></div><div class="contact-row"><div><span class="contact-badge" style="background:#fef3c7; color:#92400e;">સરપંચ</span><b>${tp.sarpanchName}</b></div><div><a href="tel:${tp.sarpanchMobile}" class="btn-mini-contact" style="background:#2563eb;"><i class="fa-solid fa-phone"></i></a></div></div>`;
    
    let isAuthorized = false; if (userSejas && userSejas.length > 0) { isAuthorized = userSejas.some(s => s.sejaName === currentActiveSeja.sejaName); }
    document.getElementById('vp-edit-container').style.display = isAuthorized ? 'block' : 'none';
    document.getElementById('village-profile-modal').style.display = 'flex'; window.history.pushState({ view: 'modal' }, '', '#village');
}

function closeVillageProfile() { window.history.back(); }
function copyToClipboard(t) { navigator.clipboard.writeText(t).then(() => showToast("નંબર કોપી થયો: " + t)); }

function openEditVillageForm() {
    if (!currentActiveVillage) return;
    const newPop = prompt(`${currentActiveVillage.villageName} ની નવી વસ્તી દાખલ કરો:`, currentActiveVillage.population);
    if (newPop !== null && newPop.trim() !== "") {
        showToast("વસ્તી અપડેટ થઈ ગઈ (Local)!"); currentActiveVillage.population = Number(newPop); document.getElementById('vp-population').innerText = toGujaratiDigits(Number(newPop).toLocaleString('en-IN'));
    }
}
