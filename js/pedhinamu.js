// js/pedhinamu.js

function loadPedhinamuList() {
    let container = document.getElementById('pedhinamu-history-container');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> લોડ થાય છે...</p>';
    
    let currentVillages = (activeSeja && activeSeja.villages) ? activeSeja.villages : [];
    
    db.collection("Pedhinamu_Register").get().then((querySnapshot) => {
        let data = [];
        querySnapshot.forEach((doc) => {
            let r = doc.data();
            r.Pedhinamu_ID = doc.id;
            if (currentVillages.length === 0 || currentVillages.includes(r.Village_Name) || !r.Village_Name) { data.push(r); }
        });
        data.sort((a, b) => {
            let t1 = a.timestamp ? a.timestamp.toMillis() : 0;
            let t2 = b.timestamp ? b.timestamp.toMillis() : 0;
            return t2 - t1;
        });
        allPedhinamuList = data;
        renderPedhinamuList();
    }).catch((error) => { container.innerHTML = `<p style="color:red; text-align:center;">ભૂલ: ${error.message}</p>`; });
}

function filterPedhinamuList(query) {
    pedhinamuSearchQuery = query.trim().toLowerCase();
    let clearBtn = document.getElementById('clear-pedhinamu-search');
    if (clearBtn) clearBtn.style.display = pedhinamuSearchQuery ? "block" : "none";
    renderPedhinamuList();
}

function clearPedhinamuSearch() {
    let sInp = document.getElementById('pedhinamu-search-input');
    if (sInp) sInp.value = "";
    let clearBtn = document.getElementById('clear-pedhinamu-search');
    if (clearBtn) clearBtn.style.display = "none";
    pedhinamuSearchQuery = "";
    renderPedhinamuList();
}

function renderPedhinamuList() {
    let container = document.getElementById('pedhinamu-history-container');
    if (!container) return;

    let filtered = allPedhinamuList.filter(r => {
        if (!pedhinamuSearchQuery) return true;
        let dec = String(r.Deceased_Name || '').toLowerCase();
        let app = String(r.Applicant_Name || '').toLowerCase();
        let vill = String(r.Village_Name || '').toLowerCase();
        let id = String(r.Pedhinamu_ID || '').toLowerCase();
        return dec.includes(pedhinamuSearchQuery) || app.includes(pedhinamuSearchQuery) || vill.includes(pedhinamuSearchQuery) || id.includes(pedhinamuSearchQuery);
    });

    if (filtered.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#64748b; margin-top:20px;'>કોઈ પેઢીનામું મળ્યું નથી.</p>"; return;
    }

    container.innerHTML = filtered.map(r => {
        return `
        <div class="list-card" style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:10px;">
            <div style="flex:1; cursor:pointer;" onclick="viewAndPrintExisting('${r.Pedhinamu_ID}')">
                <div style="display:flex; justify-content:space-between; align-items:baseline;">
                    <h3 style="font-size:15px; color:var(--primary-blue); margin:0;">${r.Deceased_Name || 'વારસાઈ'}</h3>
                    <span style="font-size:11px; font-weight:bold; color:var(--primary);">${formatDisplayDateGujarati(r.Issued_Date) || '-'}</span>
                </div>
                <p style="font-size:12px; color:#334155; margin-top:3px;"><b>અરજદાર:</b> ${r.Applicant_Name || '-'} (${r.Applicant_Relation || '-'})</p>
                <p style="font-size:11px; color:#64748b;"><b>ગામ:</b> ${r.Village_Name} | <b>હેતુ:</b> ${r.Remarks || 'વારસાઈ'}</p>
            </div>
            <div style="margin-left:12px; display:flex; gap:6px;">
                <button class="btn btn-primary" style="padding:6px 10px; font-size:12px; display:flex; align-items:center; gap:4px;" onclick="viewAndPrintExisting('${r.Pedhinamu_ID}')" title="પેઢીનામું જુઓ અને પ્રિન્ટ કરો"><i class="bi bi-printer-fill"></i> પ્રિન્ટ</button>
                <button class="btn btn-secondary" style="padding:6px 10px; font-size:12px; background:#f1f5f9; color:#1e293b; display:flex; align-items:center; gap:4px;" onclick="loadPedhinamuForEditing('${r.Pedhinamu_ID}')" title="ફોર્મમાં લોડ કરી સુધારો કરો"><i class="bi bi-pencil-square"></i> સુધારો</button>
                <button class="btn btn-secondary" style="padding:6px 10px; font-size:12px; background:#fee2e2; color:#b91c1c; display:flex; align-items:center; gap:4px;" onclick="deletePedhinamuAction('${r.Pedhinamu_ID}', '${r.Deceased_Name || ''}')" title="રદ કરો"><i class="bi bi-trash-fill"></i></button>
            </div>
        </div>`;
    }).join('');
}

function openPedhinamuModal(isEdit = false) {
    let vSelect = document.getElementById('inp-village');
    let pSelect = document.getElementById('panch-vill');
    let vList = (activeSeja && activeSeja.villages && activeSeja.villages.length > 0) ? activeSeja.villages : ["સાલાવાડા"];
    
    if (vSelect) { vSelect.innerHTML = ''; vList.forEach(v => vSelect.innerHTML += `<option value="${v}">${v}</option>`); }
    if (pSelect) { pSelect.innerHTML = ''; vList.forEach(v => pSelect.innerHTML += `<option value="${v}">${v}</option>`); }

    if (!isEdit) {
        currentEditingPedhinamuId = null;
        safeSetValue('inp-applicant', ''); safeSetValue('inp-age', ''); safeSetValue('inp-deceased', ''); safeSetValue('inp-deathdate', '');
        safeSetValue('inp-date', new Date().toISOString().split('T')[0]); safeSetValue('inp-advocate-name', ''); safeSetValue('inp-affidavit-no', '');
        safeSetValue('inp-affidavit-date', new Date().toISOString().split('T')[0]);
        heirsArray = []; panchArray = [];
        updateParentDropdown(); updateHeirListDisplay(); updatePanchListDisplay(); changeStep(1);
    }
    let modal = document.getElementById('modal-pedhinamu-form'); if (modal) modal.style.display = 'flex';
}

function closePedhinamuModal() { let modal = document.getElementById('modal-pedhinamu-form'); if (modal) modal.style.display = 'none'; }

function onParentChange() {
    let pId = document.getElementById('heir-parent').value;
    if (pId === 'root') { document.getElementById('heir-gender').value = 'સ્ત્રી'; updateRelationDropdown(); document.getElementById('heir-relation').value = 'પત્ની'; } 
    else { document.getElementById('heir-gender').value = 'પુરુષ'; updateRelationDropdown(); }
}

function proceedToStep2() {
    let app = safeGetValue('inp-applicant'); if (!app) return alert('કૃપા કરીને અરજદારનું નામ દાખલ કરો.');
    let type = safeGetValue('inp-type');
    if (type !== 'હયાત' && !safeGetValue('inp-deceased')) { return alert('કૃપા કરીને મુખ્ય ગુજરનાર વ્યક્તિનું નામ દાખલ કરો.'); }
    updateRootName(); changeStep(2);
}

function proceedToStep3() {
    let deceasedHeirsWithoutKids = heirsArray.filter(h => {
        if (h.status === 'મરણ') { let hasKids = heirsArray.some(c => c.parentId === h.id); if (!hasKids && !h.nirvansh) return true; }
        return false;
    });
    if (deceasedHeirsWithoutKids.length > 0) {
        let names = deceasedHeirsWithoutKids.map(h => h.name).join(', ');
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title: 'ધ્યાન આપો', text: `${names} મરણ પામેલ છે પણ વારસદાર દર્શાવેલ નથી કે નિર્વંશ નથી. આગળ વધવું છે?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'હા, આગળ વધો', cancelButtonText: 'સુધારો કરવો છે' }).then(res => { if (res.isConfirmed) changeStep(3); }); return;
        } else { if (!confirm(`${names} મરણ પામેલ છે પણ વારસદાર કે નિર્વંશ નથી. આગળ વધવું છે?`)) return; }
    }
    changeStep(3);
}

let editHeirId = null;
function addOrUpdateHeir() {
    let name = document.getElementById('heir-name').value.trim(); if (!name) return alert('વારસદારનું નામ લખો.');
    let pId = document.getElementById('heir-parent').value; let age = parseInt(document.getElementById('heir-age').value) || 0;
    let status = document.getElementById('heir-status').value;

    if (pId !== 'root' && status === 'હયાત') {
        let parentHeir = heirsArray.find(h => h.id === pId);
        if (parentHeir && parentHeir.age) {
            let parentAge = parseInt(parentHeir.age);
            if (age >= parentAge) return alert(`અમાન્ય ઉંમર: વારસદારની ઉંમર (${age}) પિતા/માતા (${parentAge}) કરતાં વધારે કે સરખી હોઈ શકે નહીં.`);
        }
    }

    let hData = { parentId: pId, name, gender: document.getElementById('heir-gender').value, relation: document.getElementById('heir-relation').value, status: status, age: document.getElementById('heir-age').value, deathDate: document.getElementById('heir-death-date').value, wrap: document.getElementById('heir-wrap').checked, nirvansh: document.getElementById('heir-nirvansh').checked };

    if (editHeirId !== null) { let idx = heirsArray.findIndex(h => h.id === editHeirId); if (idx !== -1) { heirsArray[idx] = { id: editHeirId, ...hData }; } editHeirId = null; document.getElementById('add-btn').innerText = '+ વારસદાર ઉમેરો'; showToast("સુધારી લેવાઈ છે."); } 
    else { hData.id = 'h_' + Date.now(); heirsArray.push(hData); showToast("વારસદાર ઉમેરાઈ ગયા."); }

    document.getElementById('heir-name').value = ''; document.getElementById('heir-age').value = ''; document.getElementById('heir-death-date').value = ''; document.getElementById('heir-wrap').checked = false; document.getElementById('heir-nirvansh').checked = false;
    updateParentDropdown(); updateHeirListDisplay(); generatePDF();
}

function editHeir(id) {
    let h = heirsArray.find(item => item.id === id); if (!h) return;
    editHeirId = h.id; document.getElementById('heir-parent').value = h.parentId; document.getElementById('heir-name').value = h.name; document.getElementById('heir-gender').value = h.gender; updateRelationDropdown(); document.getElementById('heir-relation').value = h.relation; document.getElementById('heir-status').value = h.status; toggleStatusInputs(); document.getElementById('heir-age').value = h.age || ''; document.getElementById('heir-death-date').value = h.deathDate || ''; document.getElementById('heir-wrap').checked = !!h.wrap; document.getElementById('heir-nirvansh').checked = !!h.nirvansh; document.getElementById('add-btn').innerText = '✔ સુધારો સેવ કરો'; document.getElementById('heir-name').focus();
}

function deleteHeir(id) { 
    if (!confirm('આ વારસદારને રદ કરવા માંગો છો?')) return;
    heirsArray = heirsArray.filter(h => h.id !== id && h.parentId !== id); if (editHeirId === id) { editHeirId = null; document.getElementById('add-btn').innerText = '+ વારસદાર ઉમેરો'; }
    updateParentDropdown(); updateHeirListDisplay(); generatePDF(); 
}

function updateParentDropdown() { 
    let s = document.getElementById('heir-parent'); let rootText = s.options.length > 0 ? s.options[0].text : "મુખ્ય ગુજરનાર";
    s.innerHTML = `<option value="root">${rootText}</option>` + heirsArray.map(h => `<option value="${h.id}">${h.name} (${h.relation})</option>`).join(''); 
}

function updateHeirListDisplay() { 
    let container = document.getElementById('heir-list-display'); if (!container) return;
    container.innerHTML = heirsArray.length === 0 ? "<span style='color:#777;'>ઉમેરાયેલા વારસદારો અહીં દેખાશે...</span>" : heirsArray.map(h => {
        let statText = h.status === 'હયાત' ? `ઉ.વ. ${toGujaratiDigits(h.age)}` : `મરણ (${formatDisplayDateGujarati(h.deathDate)}) ${h.nirvansh ? '[નિર્વંશ]' : ''}`;
        return `<div class="list-item" style="display:flex; justify-content:space-between; align-items:center;"><div><b>${h.name}</b> (${h.relation}) - <span style="font-size:12px; color:#475569;">${statText}</span></div><div style="display:flex; gap:6px;"><button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="editHeir('${h.id}')"><i class="bi bi-pencil"></i> સુધારો</button><button class="btn-delete" style="padding:4px 8px; font-size:11px;" onclick="deleteHeir('${h.id}')"><i class="bi bi-trash"></i> રદ</button></div></div>`;
    }).join(''); 
}

let editPanchId = null;
function addOrUpdatePanch() { 
    let name = document.getElementById('panch-name').value.trim(); if (!name) return alert('પંચનું નામ લખો.'); 
    let pData = { name, age: document.getElementById('panch-age').value, occ: document.getElementById('panch-occ').value || 'ખેતી', vill: document.getElementById('panch-vill').value, aadhar: document.getElementById('panch-aadhar').value };
    if (editPanchId !== null) { let idx = panchArray.findIndex(p => p.id === editPanchId); if (idx !== -1) { panchArray[idx] = { id: editPanchId, ...pData }; } editPanchId = null; document.getElementById('add-panch-btn').innerText = '+ પંચ ઉમેરો'; } 
    else { pData.id = 'p_' + Date.now(); panchArray.push(pData); }
    document.getElementById('panch-name').value = ''; document.getElementById('panch-age').value = ''; document.getElementById('panch-aadhar').value = ''; updatePanchListDisplay(); generatePDF(); 
}

function editPanch(id) {
    let p = panchArray.find(item => item.id === id); if (!p) return; editPanchId = p.id; document.getElementById('panch-name').value = p.name; document.getElementById('panch-age').value = p.age || ''; document.getElementById('panch-occ').value = p.occ || 'ખેતી'; document.getElementById('panch-vill').value = p.vill || ''; document.getElementById('panch-aadhar').value = p.aadhar || ''; document.getElementById('add-panch-btn').innerText = '✔ સુધારો સેવ કરો'; document.getElementById('panch-name').focus();
}

function deletePanch(id) { 
    if (!confirm('આ પંચને રદ કરવા માંગો છો?')) return; panchArray = panchArray.filter(p => p.id !== id); if (editPanchId === id) { editPanchId = null; document.getElementById('add-panch-btn').innerText = '+ પંચ ઉમેરો'; } updatePanchListDisplay(); generatePDF(); 
}

function updatePanchListDisplay() { 
    let container = document.getElementById('panch-list-display'); if (!container) return;
    container.innerHTML = panchArray.length === 0 ? "<span style='color:#777;'>ઉમેરાયેલા પંચો અહીં દેખાશે...</span>" : panchArray.map(p => `<div class="list-item" style="display:flex; justify-content:space-between; align-items:center;"><div><b>${p.name}</b> (${p.vill})</div><div style="display:flex; gap:6px;"><button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="editPanch('${p.id}')"><i class="bi bi-pencil"></i></button><button class="btn-delete" style="padding:4px 8px; font-size:11px;" onclick="deletePanch('${p.id}')"><i class="bi bi-trash"></i></button></div></div>`).join(''); 
}

function buildTreeHTML(pId) {
    let ch = heirsArray.filter(h => h.parentId === pId); if (ch.length === 0 && pId !== 'root') return ''; 
    let html = `<ul>`;
    ch.forEach(c => {
        let boxClass = c.gender === 'સ્ત્રી' ? 'female-box' : 'male-box'; 
        if (c.status === 'મરણ') { boxClass += ' deceased-box'; }
        let ageNum = parseInt(c.age) || 0; if (c.status === 'હયાત' && ageNum < 18 && ageNum > 0) { boxClass += ' minor-box'; }
        if (c.wrap) boxClass += ' wrapped-box';
        let stat = c.status === 'મરણ' ? `<br><span style="font-size:12px;">(મરણ તા. ${formatDisplayDateGujarati(c.deathDate)})</span>` : `<br><span>ઉ.વ. ${toGujaratiDigits(c.age)}</span>`;
        html += `<li><div class="heir-box ${boxClass}"><span class="bold">${c.name}</span><br>(${c.relation})${stat}</div>`;
        let childHTML = buildTreeHTML(c.id); if (c.nirvansh && childHTML === '') { childHTML = `<ul><li><div class="heir-box male-box" style="border:none;background:transparent;"><span class="bold" style="font-size:13px;color:#555;">નિર્વંશ</span></div></li></ul>`; }
        html += childHTML + `</li>`;
    });
    html += `<li><div class="heir-box male-box" style="border:none;background:transparent;"><span class="bold underline" style="font-size:12px;">આ સિવાય અન્ય<br>કોઈ વારસ નથી.</span></div></li></ul>`; return html;
}

function generatePDF() {
    let type = safeGetValue('inp-type') || 'મરણ'; let app = safeGetValue('inp-applicant') || "__________"; let dec = type === 'હયાત' ? app : (safeGetValue('inp-deceased') || "__________"); let age = toGujaratiDigits(safeGetValue('inp-age')) || "____"; let vill = safeGetValue('inp-village') || "__________";
    let formattedDate = formatDisplayDateGujarati(safeGetValue('inp-date'));
    safeSetText('out-applicant', app); safeSetText('out-applicant2', app); safeSetText('out-age', age); safeSetText('out-village', vill); safeSetText('out-place', vill); safeSetText('out-place2', vill); safeSetText('out-date', formattedDate); safeSetText('out-date2', formattedDate); safeSetText('out-date4', formattedDate); safeSetText('tree-deceased-name', dec);
    safeSetHTML('out-purpose-str', `<span class="bold underline">${getVal('inp-purpose', 'inp-purpose-custom') || "જમીન વારસાઈ"}</span>`);
    
    let curDate = new Date(); let yStr = toGujaratiDigits(curDate.getFullYear()); let mStr = toGujaratiDigits(('0' + (curDate.getMonth() + 1)).slice(-2)); let srNo = toGujaratiDigits(allPedhinamuList ? allPedhinamuList.length + 1 : 1);
    safeSetText('out-javak-no', `જાવક નં. : ${yStr}/${mStr}/${srNo}`);

    let dPara = document.getElementById('out-dynamic-para'); let rBox = document.getElementById('root-box-display'); let rStat = document.getElementById('tree-root-status');
    if (type === 'હયાત') { 
        if (dPara) dPara.innerHTML = `તે સંદર્ભે આજરોજ લખાવું છું કે, હું પોતે હાલ હયાત છું અને મારા કાયદેસરના વારસદારોની વિગત નીચે મુજબ છે.`; 
        if (rBox) rBox.className = "heir-box root-box male-box"; if (rStat) rStat.innerHTML = `<span class='bold'>ઉ.વ. ${age}</span><br>(હયાત)`; 
    } else { 
        let formattedDDate = formatDisplayDateGujarati(safeGetValue('inp-deathdate')); let rel = getVal('inp-applicant-relation', 'inp-app-rel-custom') || "પિતા";
        if (dPara) dPara.innerHTML = `તે સંદર્ભે આજરોજ લખાવું છું કે, મારા <span class="bold">${rel}</span> શ્રી <span class="bold">${dec}</span> નું તા. <span class="bold">${formattedDDate}</span> ના રોજ અવસાન થયેલ છે અને તેમના વારસદારોની વિગત નીચે મુજબ છે.`; 
        if (rBox) rBox.className = "heir-box root-box male-box deceased-box"; if (rStat) rStat.innerHTML = `<span class="bold" style="font-size:13px;">(મરણ તા. ${formattedDDate})</span>`; 
    }
    safeSetHTML('dynamic-tree-children', buildTreeHTML('root'));

    function formatNameThreeRows(fullName) {
        if (!fullName) return '-'; let parts = String(fullName).trim().split(/\s+/);
        if (parts.length >= 3) { return `${parts[0]}<br>${parts[1]}<br>${parts.slice(2).join(' ')}`; } else if (parts.length === 2) { return `${parts[0]}<br>${parts[1]}`; }
        return fullName;
    }
    let tBody = document.getElementById('pdf-panch-table'); 
    if (tBody) {
        tBody.innerHTML = '';
        panchArray.forEach((p, i) => { 
            tBody.innerHTML += `<tr style="height: 34mm;"><td class="bold">${toGujaratiDigits(i + 1)}.</td><td class="bold" style="line-height: 1.35; padding: 4px 2px;">${formatNameThreeRows(p.name)}</td><td>${toGujaratiDigits(p.age) || '-'}</td><td>${p.occ || 'ખેતી'}</td><td style="line-height: 1.3; font-size: 11.5px;">${p.vill || vill}</td><td style="line-height: 1.25; font-weight: 600; letter-spacing: 0.5px;">${formatAadharThreeRows(p.aadhar)}</td><td style="height: 34mm;"></td><td style="height: 34mm; vertical-align: middle;"><div class="photo-box panch-photo">ફોટો</div></td></tr>`; 
        });
    }

    let rawAdv = safeGetValue('inp-advocate-name'); let advName = rawAdv ? (rawAdv.startsWith('શ્રી') ? rawAdv : 'શ્રી ' + rawAdv) : 'શ્રી નોટરીશ્રી';
    let affNo = safeGetValue('inp-affidavit-no') ? toGujaratiDigits(safeGetValue('inp-affidavit-no')) : '____'; let affDate = safeGetValue('inp-affidavit-date') ? formatDisplayDateGujarati(safeGetValue('inp-affidavit-date')) : formattedDate;
    safeSetHTML('out-talati-shero-para', `ઉપર પ્રમાણેનું પેઢીનામું આ કામના અરજદારના રૂબરૂ જવાબ તા. <span class="bold">${formattedDate}</span> ના ${advName} ની રૂબરૂ કરેલા સોગંદનામા ક્રમાંક: <span class="bold">${affNo}</span>, તારીખ: <span class="bold">${affDate}</span> માં રજૂ કરેલ સાધનિક કાગળો તથા પંચોના લખાવ્યા મુજબનું તૈયાર કરી આપેલ છે. જેમાં તલાટીશ્રી જવાબદાર નથી. સદર પેઢીનામું વારસાઈ પ્રમાણપત્ર કે પ્રોબેટ નથી અને કોઈપણ કોર્ટના કામમાં ઉપયોગ કરી શકાશે નહીં.`);
}

function viewAndPrintExisting(pid) {
    let rec = allPedhinamuList.find(i => String(i.Pedhinamu_ID).trim() === String(pid).trim()); if (!rec) return alert('પેઢીનામું રેકોર્ડ મળ્યો નથી.');
    let loadedFromJson = false;
    if (rec.Full_JSON_Data && rec.Full_JSON_Data.trim() !== "") {
        try {
            let full = JSON.parse(rec.Full_JSON_Data);
            if (full && full.form) {
                safeSetValue('inp-type', full.form.type || "મરણ"); safeSetValue('inp-purpose', full.form.purpose || "જમીન વારસાઈ"); safeSetValue('inp-date', formatForDateInput(full.form.date || rec.Issued_Date)); safeSetValue('inp-advocate-name', full.form.advocateName || ""); safeSetValue('inp-affidavit-no', full.form.affidavitNo || ""); safeSetValue('inp-affidavit-date', formatForDateInput(full.form.affidavitDate || rec.Issued_Date)); safeSetValue('inp-applicant', full.form.applicant || rec.Applicant_Name || ""); safeSetValue('inp-age', full.form.age || "");
                let vSel = document.getElementById('inp-village'); let targetVill = full.form.village || rec.Village_Name || "સાલાવાડા";
                if (vSel && ![...vSel.options].some(o => o.value === targetVill)) { vSel.innerHTML += `<option value="${targetVill}">${targetVill}</option>`; }
                safeSetValue('inp-village', targetVill); safeSetValue('inp-deceased', full.form.deceased || rec.Deceased_Name || ""); safeSetValue('inp-applicant-relation', full.form.applicantRelation || rec.Applicant_Relation || "પિતા"); safeSetValue('inp-deathdate', formatForDateInput(full.form.deathdate || rec.Death_Date)); heirsArray = Array.isArray(full.heirs) ? full.heirs : []; panchArray = Array.isArray(full.panch) ? full.panch : []; loadedFromJson = true;
            }
        } catch(err) {}
    }
    if (!loadedFromJson) {
        safeSetValue('inp-type', "મરણ"); safeSetValue('inp-purpose', rec.Remarks || "જમીન વારસાઈ"); safeSetValue('inp-date', formatForDateInput(rec.Issued_Date)); safeSetValue('inp-advocate-name', ""); safeSetValue('inp-affidavit-no', ""); safeSetValue('inp-affidavit-date', formatForDateInput(rec.Issued_Date)); safeSetValue('inp-applicant', rec.Applicant_Name || ""); safeSetValue('inp-age', "");
        let vSel = document.getElementById('inp-village'); let targetVill = rec.Village_Name || "સાલાવાડા";
        if (vSel && ![...vSel.options].some(o => o.value === targetVill)) { vSel.innerHTML += `<option value="${targetVill}">${targetVill}</option>`; }
        safeSetValue('inp-village', targetVill); safeSetValue('inp-deceased', rec.Deceased_Name || ""); safeSetValue('inp-applicant-relation', rec.Applicant_Relation || "પિતા"); safeSetValue('inp-deathdate', formatForDateInput(rec.Death_Date)); heirsArray = []; panchArray = [];
        if (rec.Panch_1_Name && rec.Panch_1_Name !== "-") { panchArray.push({ id: 'p_1', name: rec.Panch_1_Name, age: '-', occ: 'ખેતી', vill: rec.Village_Name, aadhar: '-' }); }
        if (rec.Panch_2_Name && rec.Panch_2_Name !== "-") { panchArray.push({ id: 'p_2', name: rec.Panch_2_Name, age: '-', occ: 'ખેતી', vill: rec.Village_Name, aadhar: '-' }); }
    }
    updateRootName(); generatePDF(); let page = document.getElementById('pedhinamu-page'); if (page) page.style.display = 'block'; setTimeout(() => { window.print(); setTimeout(() => { if (page) page.style.display = 'none'; }, 500); }, 250);
}

function loadPedhinamuForEditing(pid) {
    let rec = allPedhinamuList.find(i => String(i.Pedhinamu_ID).trim() === String(pid).trim()); if (!rec) return alert('પેઢીનામું રેકોર્ડ મળ્યો નથી.');
    currentEditingPedhinamuId = pid; openPedhinamuModal(true);
    let loadedFromJson = false;
    if (rec.Full_JSON_Data && rec.Full_JSON_Data.trim() !== "") {
        try {
            let full = JSON.parse(rec.Full_JSON_Data);
            if (full && full.form) {
                safeSetValue('inp-type', full.form.type || "મરણ"); safeSetValue('inp-purpose', full.form.purpose || "જમીન વારસાઈ"); safeSetValue('inp-date', formatForDateInput(full.form.date || rec.Issued_Date)); safeSetValue('inp-advocate-name', full.form.advocateName || ""); safeSetValue('inp-affidavit-no', full.form.affidavitNo || ""); safeSetValue('inp-affidavit-date', formatForDateInput(full.form.affidavitDate || rec.Issued_Date)); safeSetValue('inp-applicant', full.form.applicant || rec.Applicant_Name || ""); safeSetValue('inp-age', full.form.age || "");
                let vSel = document.getElementById('inp-village'); let targetVill = full.form.village || rec.Village_Name || "સાલાવાડા";
                if (vSel && ![...vSel.options].some(o => o.value === targetVill)) { vSel.innerHTML += `<option value="${targetVill}">${targetVill}</option>`; }
                safeSetValue('inp-village', targetVill); safeSetValue('inp-deceased', full.form.deceased || rec.Deceased_Name || ""); safeSetValue('inp-applicant-relation', full.form.applicantRelation || rec.Applicant_Relation || "પિતા"); safeSetValue('inp-deathdate', formatForDateInput(full.form.deathdate || rec.Death_Date)); heirsArray = Array.isArray(full.heirs) ? full.heirs : []; panchArray = Array.isArray(full.panch) ? full.panch : []; loadedFromJson = true;
            }
        } catch(err) {}
    }
    if (!loadedFromJson) {
        safeSetValue('inp-type', "મરણ"); safeSetValue('inp-purpose', rec.Remarks || "જમીન વારસાઈ"); safeSetValue('inp-date', formatForDateInput(rec.Issued_Date)); safeSetValue('inp-advocate-name', ""); safeSetValue('inp-affidavit-no', ""); safeSetValue('inp-affidavit-date', formatForDateInput(rec.Issued_Date)); safeSetValue('inp-applicant', rec.Applicant_Name || ""); safeSetValue('inp-age', "");
        let vSel = document.getElementById('inp-village'); let targetVill = rec.Village_Name || "સાલાવાડા";
        if (vSel && ![...vSel.options].some(o => o.value === targetVill)) { vSel.innerHTML += `<option value="${targetVill}">${targetVill}</option>`; }
        safeSetValue('inp-village', targetVill); safeSetValue('inp-deceased', rec.Deceased_Name || ""); safeSetValue('inp-applicant-relation', rec.Applicant_Relation || "પિતા"); safeSetValue('inp-deathdate', formatForDateInput(rec.Death_Date)); heirsArray = []; panchArray = [];
        if (rec.Panch_1_Name && rec.Panch_1_Name !== "-") { panchArray.push({ id: 'p_1', name: rec.Panch_1_Name, age: '', occ: 'ખેતી', vill: rec.Village_Name, aadhar: '' }); }
        if (rec.Panch_2_Name && rec.Panch_2_Name !== "-") { panchArray.push({ id: 'p_2', name: rec.Panch_2_Name, age: '', occ: 'ખેતી', vill: rec.Village_Name, aadhar: '' }); }
    }
    updateParentDropdown(); updateHeirListDisplay(); updatePanchListDisplay(); toggleTypeSpecificInputs(); updateRootName(); changeStep(1); showToast("✏️ વિગતો ફોર્મમાં લોડ થઈ ગઈ છે.");
}

function saveAndPrint() {
    let btn = document.getElementById('print-btn'); if (btn) { btn.innerHTML = "⏳ સેવ થાય છે..."; btn.disabled = true; }
    let type = safeGetValue('inp-type') || "મરણ"; let app = safeGetValue('inp-applicant') || "-"; let dec = type === 'હયાત' ? app + " (હયાતીમાં)" : (safeGetValue('inp-deceased') || "-"); let p1 = panchArray.length > 0 ? panchArray[0].name : "-"; let p2 = panchArray.length > 1 ? panchArray[1].name : "-";
    let isEditing = currentEditingPedhinamuId !== null;
    let fullSnapshot = { form: { type: type, purpose: getVal('inp-purpose', 'inp-purpose-custom') || "વારસાઈ", date: safeGetValue('inp-date'), advocateName: safeGetValue('inp-advocate-name'), affidavitNo: safeGetValue('inp-affidavit-no'), affidavitDate: safeGetValue('inp-affidavit-date'), applicant: app, age: safeGetValue('inp-age'), village: safeGetValue('inp-village') || "-", deceased: safeGetValue('inp-deceased'), applicantRelation: getVal('inp-applicant-relation', 'inp-app-rel-custom') || "-", deathdate: safeGetValue('inp-deathdate') }, heirs: heirsArray, panch: panchArray };
    let payload = { Village_Name: safeGetValue('inp-village') || "-", Deceased_Name: dec, Death_Date: safeGetValue('inp-deathdate') || "-", Applicant_Name: app, Applicant_Relation: getVal('inp-applicant-relation', 'inp-app-rel-custom') || "-", Applicant_Mobile: "-", Issued_Date: safeGetValue('inp-date') ? formatDisplayDateGujarati(safeGetValue('inp-date')) : new Date().toLocaleDateString('en-GB'), Panch_1_Name: p1, Panch_2_Name: p2, Remarks: getVal('inp-purpose', 'inp-purpose-custom') || "વારસાઈ", Full_JSON_Data: JSON.stringify(fullSnapshot) };
    updateRootName(); generatePDF();
    let afterSuccess = function() {
        if (btn) { btn.innerHTML = "<i class='bi bi-printer-fill'></i> પ્રિન્ટ અને સેવ કરો"; btn.disabled = false; }
        let page = document.getElementById('pedhinamu-page'); if (page) page.style.display = 'block';
        setTimeout(() => { window.print(); setTimeout(() => { if (page) page.style.display = 'none'; currentEditingPedhinamuId = null; closePedhinamuModal(); loadPedhinamuList(); loadDashboardData(); showToast(isEditing ? "✅ પેઢીનામું સુધારી લેવાયું છે!" : "✅ નવું પેઢીનામું સેવ થઈ ગયું!"); }, 500); }, 250);
    };
    let afterFailure = function(error) { if (btn) { btn.innerHTML = "<i class='bi bi-printer-fill'></i> પ્રિન્ટ અને સેવ કરો"; btn.disabled = false; } alert("ફાયરબેઝ એરર: " + error.message); };
    if (isEditing) { db.collection("Pedhinamu_Register").doc(currentEditingPedhinamuId).update(payload).then(afterSuccess).catch(afterFailure); } 
    else { payload.timestamp = firebase.firestore.FieldValue.serverTimestamp(); db.collection("Pedhinamu_Register").add(payload).then(afterSuccess).catch(afterFailure); }
}

function deletePedhinamuAction(pid, decName) {
    let proceed = () => { showToast("રદ થાય છે...", "info"); db.collection("Pedhinamu_Register").doc(pid).delete().then(() => { showToast("🗑️ પેઢીનામું રજીસ્ટરમાંથી રદ થયું!"); loadPedhinamuList(); loadDashboardData(); }).catch((error) => alert("ફાયરબેઝ એરર: " + error.message)); };
    if (typeof Swal !== 'undefined') { Swal.fire({ title: 'પેઢીનામું રદ કરવું છે?', text: `${decName ? decName + ' નું ' : ''}પેઢીનામું રજીસ્ટરમાંથી નીકળી જશે.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'હા, રદ કરો', cancelButtonText: 'ના' }).then((result) => { if (result.isConfirmed) proceed(); }); } 
    else { if (confirm(`શું તમે આ પેઢીનામું રજીસ્ટરમાંથી રદ કરવા માંગો છો?`)) proceed(); }
}

function checkCustom(sel, cid) { let el = document.getElementById(cid); if (el) el.style.display = (sel.value === 'custom') ? 'block' : 'none'; generatePDF(); }

function setupLivePreview() {
    document.querySelectorAll('input, select').forEach(el => {
        if(!['heir-name', 'heir-age', 'panch-name', 'panch-age', 'panch-aadhar', 'heir-death-date', 'dir-search-input'].includes(el.id)) {
            el.addEventListener('input', function() { updateRootName(); generatePDF(); }); el.addEventListener('change', function() { updateRootName(); generatePDF(); });
        }
    });
}

function changeStep(step) {
    document.querySelectorAll('.step-indicator, .step-content').forEach(el => el.classList.remove('active'));
    let ind = document.getElementById('step-ind-' + step); let cnt = document.getElementById('step-content-' + step);
    if (ind) ind.classList.add('active'); if (cnt) cnt.classList.add('active');
    if(step === 2) updateRootName(); generatePDF(); 
}

function toggleTypeSpecificInputs() {
    let type = safeGetValue('inp-type'); let titleMain = document.getElementById('title-main-person'); let labelDec = document.getElementById('label-deceased');
    if(type === 'હયાત') {
        if (titleMain) titleMain.innerText = 'મુખ્ય વ્યક્તિની વિગત'; if (labelDec) labelDec.innerText = 'મુખ્ય વ્યક્તિ (અરજદાર):';
        document.getElementById('grp-deceased').style.display = 'none'; document.getElementById('grp-relation').style.display = 'none'; document.getElementById('grp-deathdate').style.display = 'none';
    } else {
        if (titleMain) titleMain.innerText = 'મુખ્ય ગુજરનારની વિગત'; if (labelDec) labelDec.innerText = 'ગુજરનારનું નામ:';
        document.getElementById('grp-deceased').style.display = 'flex'; document.getElementById('grp-relation').style.display = 'flex'; document.getElementById('grp-deathdate').style.display = 'flex';
    }
    updateRootName(); generatePDF();
}

function updateRootName() {
    let type = safeGetValue('inp-type'); let rName = type === 'હયાત' ? (safeGetValue('inp-applicant') || "____") : (safeGetValue('inp-deceased') || "____");
    let pSelect = document.getElementById('heir-parent'); if(pSelect && pSelect.options.length > 0) pSelect.options[0].text = (type === 'મરણ' ? "ગુજરનાર (" : "વ્યક્તિ (") + rName + ")";
}

function updateRelationDropdown() { 
    let gender = document.getElementById('heir-gender').value; let pId = document.getElementById('heir-parent').value; let relSelect = document.getElementById('heir-relation');
    if (gender === 'પુરુષ') { relSelect.innerHTML = (pId === 'root') ? '<option value="પુત્ર">પુત્ર</option><option value="પતિ">પતિ</option>' : '<option value="પુત્ર">પુત્ર</option>'; } 
    else { relSelect.innerHTML = (pId === 'root') ? '<option value="પત્ની">પત્ની</option><option value="પુત્રી">પુત્રી</option>' : '<option value="પુત્રી">પુત્રી</option>'; }
}

function toggleStatusInputs() { let s = document.getElementById('heir-status').value; document.getElementById('age-group').style.display = s === 'હયાત' ? 'flex' : 'none'; document.getElementById('deathdate-group').style.display = s === 'મરણ' ? 'flex' : 'none'; }
