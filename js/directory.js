// js/directory.js

var talukaDirectoryData = null;
let currentActiveSeja = null; 
let currentActivePanchayat = null;
let currentActiveVillage = null;
let editingLandRecordId = null; // સુધારો: Index ના બદલે અનન્ય ID વડે ટ્રેકિંગ
let editingBookmarkId = null;   // સુધારો: Index ના બદલે અનન્ય ID વડે ટ્રેકિંગ

// Call, WhatsApp અને Copy નું ૩-બટન ગ્રુપ બનાવતું હેલ્પર ફંક્શન
function buildContactActionButtons(rawMobile) {
    if (!rawMobile || rawMobile === "-") {
        return '<span style="font-size:11px; color:#94a3b8;">સંપર્ક ઉપલબ્ધ નથી</span>';
    }
    const clean = toEnglishDigits(String(rawMobile)).replace(/[^0-9]/g, '');
    if (clean.length < 10) {
        return '<span style="font-size:11px; color:#94a3b8;">અમાન્ય નંબર</span>';
    }
    const num10 = clean.slice(-10);
    return `
        <div class="contact-actions-wrap">
            <a href="tel:${num10}" class="btn-mini-contact btn-mini-call" title="કોલ કરો">
                <i class="fa-solid fa-phone"></i>
            </a>
            <a href="https://wa.me/91${num10}" target="_blank" class="btn-mini-contact btn-mini-wa" title="WhatsApp મેસેજ કરો">
                <i class="fa-brands fa-whatsapp"></i>
            </a>
            <button type="button" class="btn-mini-contact btn-mini-copy" onclick="copyToClipboard('${num10}')" title="નંબર કોપી કરો">
                <i class="fa-solid fa-copy"></i>
            </button>
        </div>
    `;
}

function loadDirectoryData() {
    if (talukaDirectoryData) { renderSejasGrid(talukaDirectoryData.sejas); return; }
    
    let container = document.getElementById('directory-grid-container');
    if (container) container.innerHTML = getSkeletonCardsHtml(3);
    
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
        container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:30px; color:#94a3b8;">કોઈ સેજો મળ્યો નથી.</p>`; 
        return; 
    }

    let mySejaName = (activeSeja && activeSeja.sejaName) ? activeSeja.sejaName : "";
    let myCachedPhoto = localStorage.getItem('user_profile_avatar') || '';

    container.innerHTML = list.map(seja => {
        const isMySeja = (seja.sejaName === mySejaName);
        const chargeClass = (seja.chargeType === "કાયમી") ? "permanent" : "additional";
        const cm = seja.talatiMobile && seja.talatiMobile !== "-" ? toEnglishDigits(seja.talatiMobile).replace(/[^0-9]/g, '') : '';
        
        // પ્રોફાઇલ ફોટો હેન્ડલર (પોતાનો સેજો હોય તો સિંક ફોટો, નહીંતર ડાયરેક્ટરી ફોટો કે સ્માર્ટ અવતાર)
        let photoSrc = (isMySeja && myCachedPhoto) ? myCachedPhoto : (seja.photoUrl || seja.photo || '');
        if (!photoSrc) {
            let encName = encodeURIComponent(seja.talatiName || 'તલાટી');
            photoSrc = `https://ui-avatars.com/api/?name=${encName}&background=eff6ff&color=1d4ed8&font-size=0.4&bold=true`;
        }

        return `
            <div class="seja-compact-card ${isMySeja ? 'my-seja' : ''}" onclick="renderPanchayatsView('${seja.sejaName}')">
                <div class="seja-card-avatar">
                    <img src="${photoSrc}" alt="${seja.talatiName}">
                </div>
                
                <div class="seja-card-body">
                    <div class="seja-card-top">
                        <span class="seja-title">${seja.sejaName} સેજો</span>
                        <span class="badge-charge ${chargeClass}">${seja.chargeType}</span>
                        ${isMySeja ? '<span class="my-seja-tag">મારો સેજો</span>' : ''}
                    </div>
                    
                    <div class="seja-talati-name">
                        <i class="fa-solid fa-user-tie" style="font-size:11px; opacity:0.6;"></i> ${seja.talatiName}
                    </div>
                    
                    <div class="seja-sub-stats">
                        <span><i class="fa-solid fa-building"></i> ${toGujaratiDigits(seja.panchayatsCount)} પંચાયત</span>
                        <span class="dot-sep">•</span>
                        <span><i class="fa-solid fa-location-dot"></i> ${toGujaratiDigits(seja.villagesCount)} ગામો</span>
                    </div>
                </div>

                <div class="seja-card-actions" onclick="event.stopPropagation()">
                    ${cm.length === 10 ? `
                        <a href="tel:${cm}" class="action-circle-btn call" title="કોલ કરો">
                            <i class="fa-solid fa-phone"></i>
                        </a>
                        <a href="https://wa.me/91${cm}" target="_blank" class="action-circle-btn wa" title="વોટ્સએપ">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                    ` : `
                        <span class="no-contact-dot" title="સંપર્ક ઉપલબ્ધ નથી">
                            <i class="fa-solid fa-phone-slash"></i>
                        </span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function filterDirectory(query) {
    let qStr = String(query || '').trim();
    const clearBtn = document.getElementById('clear-search'); 
    if (clearBtn) clearBtn.style.display = qStr ? "block" : "none";
    if (!talukaDirectoryData) return;
    
    if (!qStr) { renderSejasGrid(talukaDirectoryData.sejas); return; }

    const filtered = talukaDirectoryData.sejas.filter(s => {
        if (matchesSmartSearch(s.sejaName, qStr) || matchesSmartSearch(s.talatiName, qStr)) return true;
        if (s.panchayats && Array.isArray(s.panchayats)) {
            return s.panchayats.some(p => {
                if (matchesSmartSearch(p.panchayatName, qStr)) return true;
                if (p.villages && Array.isArray(p.villages)) {
                    return p.villages.some(v => {
                        let vName = typeof v === 'string' ? v : (v.villageName || v.name || "");
                        return matchesSmartSearch(vName, qStr);
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
    safeSetValue('dir-search-input', "");
    let clearBtn = document.getElementById('clear-search');
    if (clearBtn) clearBtn.style.display = "none";
    if (talukaDirectoryData) renderSejasGrid(talukaDirectoryData.sejas); 
}

function renderPanchayatsView(sejaName, pushHistory = true) {
    currentActiveSeja = talukaDirectoryData.sejas.find(s => s.sejaName === sejaName); 
    if (!currentActiveSeja) return;
    
    document.getElementById('directory-grid-container').style.display = 'none'; 
    document.getElementById('panchayat-view-container').style.display = 'block';
    document.getElementById('dir-breadcrumbs').innerHTML = `<span class="crumb-link" onclick="restoreSejasGrid()"><i class="fa-solid fa-house"></i> લુણાવાડા</span><i class="fa-solid fa-chevron-right" style="font-size:10px;"></i><span>${currentActiveSeja.sejaName} સેજો</span>`;
    
    // સુધારેલું બ્લૂ બેનર: રેવન્યુ તલાટીના કોલ, વોટ્સએપ અને કોપી બટન્સ સાથે
    document.getElementById('seja-detail-header').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div>
                <h2 style="font-size:18px; margin:0 0 2px 0;">
                    ${currentActiveSeja.sejaName} સેજો 
                    <span style="font-size:11px; background:rgba(255,255,255,0.22); padding:2px 8px; border-radius:12px; font-weight:600; vertical-align:middle; border:1px solid rgba(255,255,255,0.3);">
                        ${currentActiveSeja.chargeType}
                    </span>
                </h2>
            </div>
            <div style="text-align:right; font-size:12px; opacity:0.95; line-height:1.4;">
                <div><i class="fa-solid fa-users"></i> વસ્તી: <b>${toGujaratiDigits(currentActiveSeja.totalPopulation)}</b></div>
                <div><i class="fa-solid fa-vector-square"></i> ક્ષેત્રફળ: <b>${toGujaratiDigits(currentActiveSeja.totalAreaSqMtr)} ચો.મી.</b></div>
            </div>
        </div>

        <!-- રેવન્યુ તલાટી સંપર્ક પટ્ટી -->
        <div style="background:rgba(255,255,255,0.15); border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(255,255,255,0.22); backdrop-filter:blur(4px);">
            <div style="font-size:13.5px; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-user-tie" style="font-size:15px; opacity:0.9;"></i>
                <span>તલાટી: <b>${currentActiveSeja.talatiName}</b></span>
            </div>
            <div>
                ${buildContactActionButtons(currentActiveSeja.talatiMobile)}
            </div>
        </div>
    `;
    
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
        let v = p.villages.find(i => String(i.villageId).trim() === String(vid).trim() || i.villageName === vid); 
        if (v) { tv = v; tp = p; break; } 
    }
    if (!tv) return; 
    
    currentActiveVillage = tv;
    currentActivePanchayat = tp;

    safeSetText('vp-village-name', tv.villageName);
    safeSetText('vp-hierarchy-path', `${currentActiveSeja.sejaName} સેજો > ${tp.panchayatName} પંચાયત`);
    safeSetText('vp-area-sqm', toGujaratiDigits(Number(tv.areaSqMtr || 0).toLocaleString('en-IN')));
    safeSetText('vp-area-ha', toGujaratiDigits(tv.formattedArea || '-'));
    safeSetText('vp-population', toGujaratiDigits(Number(tv.population || 0).toLocaleString('en-IN')));
    safeSetText('vp-village-id', tv.villageId || '-');
    safeSetText('vp-total-khata', tv.totalKhata ? toGujaratiDigits(tv.totalKhata) : '-');
    safeSetText('vp-total-survey', tv.totalSurvey ? toGujaratiDigits(tv.totalSurvey) : '-');

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

    renderVillageViewExtra(tv);

    let docId = String(tv.villageId || tv.villageName).trim().replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');
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
            
            safeSetText('vp-total-khata', tv.totalKhata ? toGujaratiDigits(tv.totalKhata) : '-');
            safeSetText('vp-total-survey', tv.totalSurvey ? toGujaratiDigits(tv.totalSurvey) : '-');
            if (lData.population) safeSetText('vp-population', toGujaratiDigits(Number(tv.population).toLocaleString('en-IN')));
            if (lData.areaSqMtr) safeSetText('vp-area-sqm', toGujaratiDigits(Number(tv.areaSqMtr).toLocaleString('en-IN')));
            if (lData.formattedArea) safeSetText('vp-area-ha', toGujaratiDigits(tv.formattedArea));
            
            renderVillageViewExtra(tv);
        }
    }).catch(err => console.log("Land record fetch info:", err));
}

function renderVillageViewExtra(tv) {
    let lrDisp = document.getElementById('vp-land-records-display');
    let bmDisp = document.getElementById('vp-bookmarks-display');
    
    if (lrDisp) {
        if (tv.landRecords && tv.landRecords.length > 0) {
            let html = '<div style="font-size:13px; font-weight:700; color:#0d47a1; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:12px; margin-bottom:8px;"><i class="fa-solid fa-tree-city"></i> સરકારી જમીન / સર્વે નંબર બેંક</div>';
            
            let grouped = {};
            tv.landRecords.forEach(r => {
                let cat = r.category || 'અન્ય';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(r);
            });

            for (let cat in grouped) {
                html += `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:10px;">
                    <div style="font-weight:700; font-size:13px; color:#334155; margin-bottom:6px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
                        ${cat} <span style="float:right; font-size:10px; background:#e2e8f0; padding:2px 6px; border-radius:10px;">${toGujaratiDigits(grouped[cat].length)} એન્ટ્રી</span>
                    </div>
                    ${grouped[cat].map(r => {
                        let areaFormatted = formatLandAreaDisplay(r.area);
                        return `
                            <div style="font-size:12px; padding:5px 0; display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px dashed #f1f5f9;">
                                <span>
                                    <b style="color:#2563eb;">સર્વે નં:</b> ${toGujaratiDigits(r.surveyNo)}${areaFormatted ? `<span style="color:#047857; font-weight:600; font-size:11px; margin-left:4px;">(${areaFormatted})</span>` : ''}
                                </span>
                                <span style="color:#475569; font-size:11px; text-align:right; max-width:45%;">${toGujaratiDigits(r.remarks || '-')}</span>
                            </div>
                        `;
                    }).join('')}
                </div>`;
            }
            lrDisp.innerHTML = html;
        } else {
            lrDisp.innerHTML = '';
        }
    }

    if (bmDisp) {
        if (tv.bookmarks && tv.bookmarks.length > 0) {
            let html = '<div style="font-size:13px; font-weight:700; color:#854d0e; margin-top:15px; border-top:1px dashed #cbd5e1; padding-top:12px; margin-bottom:8px;"><i class="fa-solid fa-thumbtack"></i> અગત્યના બુકમાર્કસ</div>';
            
            html += tv.bookmarks.map(b => {
                let tag = b.tag || 'અન્ય';
                let bg = tag.includes('કોર્ટ') ? '#fee2e2' : (tag.includes('દબાણ') ? '#ffedd5' : '#fefce8');
                let tc = tag.includes('કોર્ટ') ? '#991b1b' : (tag.includes('દબાણ') ? '#9a3412' : '#854d0e');
                let brc = tag.includes('કોર્ટ') ? '#f87171' : (tag.includes('દબાણ') ? '#fb923c' : '#fde047');
                let formattedArea = formatLandAreaDisplay(b.area);

                return `
                    <div style="background:${bg}; border-left:4px solid ${brc}; padding:10px 12px; margin-bottom:8px; border-radius:6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-size:10px; font-weight:bold; color:${tc}; text-transform:uppercase; letter-spacing:0.5px;">${tag}</span>
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
// ગામની માહિતીમાં સુધારો કરો (EDIT MODE)
// =========================================================
function openEditVillageForm() {
    if (!currentActiveVillage) return;
    
    editingLandRecordId = null;
    editingBookmarkId = null;

    let subTitle = document.getElementById('edit-vil-subtitle');
    if (subTitle) subTitle.innerText = `મોજે: ${currentActiveVillage.villageName} (${currentActiveVillage.villageId || ''})`;

    safeSetValue('edit-vil-khata', currentActiveVillage.totalKhata || "");
    safeSetValue('edit-vil-survey', currentActiveVillage.totalSurvey || "");
    safeSetValue('edit-vil-pop', currentActiveVillage.population || "");
    safeSetValue('edit-vil-area', currentActiveVillage.areaSqMtr || "");

    if (!currentActiveVillage.landRecords) currentActiveVillage.landRecords = [];
    if (!currentActiveVillage.bookmarks) currentActiveVillage.bookmarks = [];

    // દરેક જૂના રેકોર્ડને અનન્ય ID આપવું (જો ન હોય તો)
    currentActiveVillage.landRecords.forEach((r, idx) => {
        if (!r.id) r.id = 'lr_' + Date.now() + '_' + idx;
    });
    currentActiveVillage.bookmarks.forEach((b, idx) => {
        if (!b.id) b.id = 'bm_' + Date.now() + '_' + idx;
    });

    renderEditManagers();
    document.getElementById('modal-edit-village').style.display = 'flex';
}

function renderEditManagers() {
    let cont = document.getElementById('edit-vil-land-manager-container');
    if (!cont) return;

    let isEditingLR = (editingLandRecordId !== null);
    let isEditingBM = (editingBookmarkId !== null);

    let html = `
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
                ${currentActiveVillage.landRecords.map((r) => {
                    let formattedArea = formatLandAreaDisplay(r.area);
                    let isEditingThis = (editingLandRecordId === r.id);
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:${isEditingThis ? '#eff6ff' : '#f8fafc'}; padding:8px 10px; margin-bottom:6px; font-size:12px; border:1px solid ${isEditingThis ? '#93c5fd' : '#e2e8f0'}; border-radius:6px;">
                            <div style="flex:1;">
                                <b>${r.category}:</b> ${toGujaratiDigits(r.surveyNo)}${formattedArea ? `<span style="color:#047857; font-weight:600;">(${formattedArea})</span>` : ''}
                                ${r.remarks ? `<span style="font-size:11px; color:#64748b; display:block;">${toGujaratiDigits(r.remarks)}</span>` : ''}
                            </div>
                            <div style="display:flex; gap:8px; margin-left:8px;">
                                <button type="button" onclick="editLandRecord('${r.id}')" style="color:#2563eb; background:none; border:none; cursor:pointer; font-size:14px;" title="સુધારો કરો"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button type="button" onclick="removeLandRecord('${r.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:14px;" title="રદ કરો"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

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
                ${currentActiveVillage.bookmarks.map((b) => {
                    let formattedArea = formatLandAreaDisplay(b.area);
                    let isEditingThis = (editingBookmarkId === b.id);
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:${isEditingThis ? '#fef9c3' : '#fefce8'}; padding:8px 10px; margin-bottom:6px; font-size:12px; border:1px solid ${isEditingThis ? '#fde047' : '#fef08a'}; border-radius:6px;">
                            <div style="flex:1;">
                                <b>${b.tag}:</b> ${toGujaratiDigits(b.surveyNo)}${formattedArea ? `<span style="color:#047857; font-weight:600;">(${formattedArea})</span>` : ''}
                                ${b.note ? `<span style="font-size:11px; color:#64748b; display:block;">${toGujaratiDigits(b.note)}</span>` : ''}
                            </div>
                            <div style="display:flex; gap:8px; margin-left:8px;">
                                <button type="button" onclick="editBookmark('${b.id}')" style="color:#2563eb; background:none; border:none; cursor:pointer; font-size:14px;" title="સુધારો કરો"><i class="fa-solid fa-pen-to-square"></i></button>
                                <button type="button" onclick="removeBookmark('${b.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:14px;" title="રદ કરો"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    cont.innerHTML = html;
}

window.saveLandRecordEntry = function() {
    let cat = safeGetValue('new-lr-cat');
    let sur = safeGetValue('new-lr-survey');
    let area = safeGetValue('new-lr-area');
    let rem = safeGetValue('new-lr-rem');
    
    if(!sur) { showToast("કૃપા કરી સર્વે નંબર દાખલ કરો", "warning"); return; }
    
    if (editingLandRecordId !== null) {
        let idx = currentActiveVillage.landRecords.findIndex(r => r.id === editingLandRecordId);
        if (idx !== -1) {
            currentActiveVillage.landRecords[idx] = {
                id: editingLandRecordId,
                category: cat,
                surveyNo: sur,
                area: area,
                remarks: rem
            };
            showToast("એન્ટ્રી સુધારી લેવાઈ છે!");
        }
        editingLandRecordId = null;
    } else {
        let recordObj = {
            id: 'lr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            category: cat,
            surveyNo: sur,
            area: area,
            remarks: rem
        };
        currentActiveVillage.landRecords.push(recordObj);
        showToast("નવી એન્ટ્રી ઉમેરાઈ ગઈ!");
    }

    safeSetValue('new-lr-survey', '');
    safeSetValue('new-lr-area', '');
    safeSetValue('new-lr-rem', '');
    renderEditManagers();
};

window.editLandRecord = function(id) {
    let r = currentActiveVillage.landRecords.find(item => item.id === id);
    if (!r) return;
    editingLandRecordId = id;
    renderEditManagers();
    safeSetValue('new-lr-cat', r.category || 'ગૌચર');
    safeSetValue('new-lr-survey', r.surveyNo || '');
    safeSetValue('new-lr-area', r.area || '');
    safeSetValue('new-lr-rem', r.remarks || '');
    let el = document.getElementById('new-lr-survey');
    if (el) el.focus();
};

window.cancelLandRecordEdit = function() {
    editingLandRecordId = null;
    safeSetValue('new-lr-survey', '');
    safeSetValue('new-lr-area', '');
    safeSetValue('new-lr-rem', '');
    renderEditManagers();
};

window.removeLandRecord = function(id) {
    if(confirm("શું તમે ખરેખર આ સરકારી જમીન રેકોર્ડ કાઢી નાખવા માંગો છો?")) {
        currentActiveVillage.landRecords = currentActiveVillage.landRecords.filter(item => item.id !== id);
        if (editingLandRecordId === id) {
            editingLandRecordId = null;
            safeSetValue('new-lr-survey', '');
            safeSetValue('new-lr-area', '');
            safeSetValue('new-lr-rem', '');
        }
        renderEditManagers();
    }
};

window.saveBookmarkEntry = function() {
    let tag = safeGetValue('new-bm-tag');
    let sur = safeGetValue('new-bm-survey');
    let area = safeGetValue('new-bm-area');
    let note = safeGetValue('new-bm-note');
    
    if(!sur) { showToast("કૃપા કરી સર્વે નંબર દાખલ કરો", "warning"); return; }
    
    if (editingBookmarkId !== null) {
        let idx = currentActiveVillage.bookmarks.findIndex(b => b.id === editingBookmarkId);
        if (idx !== -1) {
            currentActiveVillage.bookmarks[idx] = {
                id: editingBookmarkId,
                tag: tag,
                surveyNo: sur,
                area: area,
                note: note
            };
            showToast("બુકમાર્ક સુધારી લેવાયો છે!");
        }
        editingBookmarkId = null;
    } else {
        let bmObj = {
            id: 'bm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            tag: tag,
            surveyNo: sur,
            area: area,
            note: note
        };
        currentActiveVillage.bookmarks.push(bmObj);
        showToast("બુકમાર્ક ઉમેરાઈ ગયો!");
    }

    safeSetValue('new-bm-survey', '');
    safeSetValue('new-bm-area', '');
    safeSetValue('new-bm-note', '');
    renderEditManagers();
};

window.editBookmark = function(id) {
    let b = currentActiveVillage.bookmarks.find(item => item.id === id);
    if (!b) return;
    editingBookmarkId = id;
    renderEditManagers();
    safeSetValue('new-bm-tag', b.tag || 'કોર્ટ કેસ / તકરારી');
    safeSetValue('new-bm-survey', b.surveyNo || '');
    safeSetValue('new-bm-area', b.area || '');
    safeSetValue('new-bm-note', b.note || '');
    let el = document.getElementById('new-bm-survey');
    if (el) el.focus();
};

window.cancelBookmarkEdit = function() {
    editingBookmarkId = null;
    safeSetValue('new-bm-survey', '');
    safeSetValue('new-bm-area', '');
    safeSetValue('new-bm-note', '');
    renderEditManagers();
};

window.removeBookmark = function(id) {
    if(confirm("શું તમે આ બુકમાર્ક કાઢી નાખવા માંગો છો?")) {
        currentActiveVillage.bookmarks = currentActiveVillage.bookmarks.filter(item => item.id !== id);
        if (editingBookmarkId === id) {
            editingBookmarkId = null;
            safeSetValue('new-bm-survey', '');
            safeSetValue('new-bm-area', '');
            safeSetValue('new-bm-note', '');
        }
        renderEditManagers();
    }
};

function closeEditVillageModal() {
    editingLandRecordId = null;
    editingBookmarkId = null;
    document.getElementById('modal-edit-village').style.display = 'none';
}

function saveVillageEdits() {
    if (!currentActiveVillage) return;

    let btn = document.getElementById('btn-save-vil-edits');
    if (btn) { btn.disabled = true; btn.innerText = "સેવ થાય છે..."; }

    let newKhata = safeGetValue('edit-vil-khata');
    let newSurvey = safeGetValue('edit-vil-survey');
    let newPop = safeGetValue('edit-vil-pop');
    let newArea = safeGetValue('edit-vil-area');

    currentActiveVillage.totalKhata = newKhata;
    currentActiveVillage.totalSurvey = newSurvey;
    if (newPop !== "") currentActiveVillage.population = Number(newPop);
    if (newArea !== "") {
        let totalSqm = Number(newArea);
        currentActiveVillage.areaSqMtr = totalSqm;
        let converted = sqmToHaAreSqm(totalSqm);
        currentActiveVillage.formattedArea = converted.formattedEng;
    }

    let docId = String(currentActiveVillage.villageId || currentActiveVillage.villageName).trim().replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_');

    db.collection("Village_Land_Records").doc(docId).set({
        villageId: currentActiveVillage.villageId || docId,
        villageName: currentActiveVillage.villageName,
        sejaName: currentActiveSeja ? currentActiveSeja.sejaName : "",
        totalKhata: newKhata,
        totalSurvey: newSurvey,
        population: currentActiveVillage.population || 0,
        areaSqMtr: currentActiveVillage.areaSqMtr || 0,
        formattedArea: currentActiveVillage.formattedArea || "",
        landRecords: currentActiveVillage.landRecords || [],
        bookmarks: currentActiveVillage.bookmarks || [],
        updatedBy: (currentUser && currentUser.name) ? currentUser.name : "Talati",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> સેવ કરો'; }
        closeEditVillageModal();
        openVillageProfile(currentActiveVillage.villageId || docId, currentActivePanchayat ? currentActivePanchayat.panchayatName : "");
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
            showToast("ડિરેક્ટરી લોડ થાય છે...", "info");
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
        showToast(`"${villageName}" ગામની વિગત મળી નથી.`, "warning");
    }
}