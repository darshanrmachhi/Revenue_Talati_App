// js/profile.js

var currentProfileData = null;
var isProfileEditing = false;

// =========================================================
// ૧. પ્રોફાઈલ ડેટા લોડ કરવો
// =========================================================
function loadUserProfileData() {
    if (!currentUser || !currentUser.mobile) return;

    // ૧. હેડર & હીરો કાર્ડની વિગતો સેટ કરવી
    safeSetText('prof-emp-name', currentUser.name || "તલાટી");
    safeSetValue('prof-mobile', toGujaratiDigits(currentUser.mobile));

    if (activeSeja) {
        safeSetText('prof-seja-badge', (activeSeja.sejaName || "") + " સેજો");
        let elBadge = document.getElementById('prof-charge-badge');
        if (elBadge) {
            elBadge.innerText = activeSeja.chargeType || "કાયમી";
            elBadge.className = "badge " + (activeSeja.chargeType === 'કાયમી' ? 'permanent' : 'additional');
        }
    }

    // ૨. ફાયરબેઝમાંથી યુઝરનો સંપૂર્ણ પ્રોફાઈલ ડેટા મેળવવો
    let userDocId = currentUser.docId || currentUser.mobile;
    db.collection("Users").doc(userDocId).get().then((doc) => {
        if (doc.exists) {
            currentProfileData = doc.data();
        } else {
            currentProfileData = {
                Name: currentUser.name,
                Mobile: currentUser.mobile,
                Seja_Name: currentUser.seja || ""
            };
        }
        populateProfileFields(currentProfileData);
    }).catch((err) => {
        console.warn("Profile fetch error:", err);
        // જો Firestore માં એરર આવે તો બેઝિક માહિતી ભરી આપો
        populateProfileFields({
            Name: currentUser.name,
            Mobile: currentUser.mobile,
            Seja_Name: currentUser.seja || ""
        });
    });
}

function populateProfileFields(data) {
    if (!data) return;

    // પ્રોફાઈલ ફોટો
    let imgEl = document.getElementById('prof-display-img');
    if (imgEl) {
        if (data.photoBase64 || data.profilePicUrl) {
            imgEl.src = data.photoBase64 || data.profilePicUrl;
        } else {
            let n = encodeURIComponent(currentUser.name || "Talati");
            imgEl.src = `https://ui-avatars.com/api/?name=${n}&background=0d47a1&color=fff&size=150`;
        }
    }

    // વ્યક્તિગત વિગતો
    safeSetValue('prof-email', data.email || '');
    safeSetValue('prof-dob', formatForDateInput(data.dob || ''));
    safeSetValue('prof-blood-group', data.bloodGroup || '');
    safeSetValue('prof-native', data.nativePlace || '');

    // સેવા વિગતો
    safeSetValue('prof-emp-id', data.employeeId || '');
    safeSetValue('prof-education', data.education || '');
    safeSetValue('prof-first-join', formatForDateInput(data.firstJoinDate || ''));
    safeSetValue('prof-rev-join', formatForDateInput(data.revenueJoinDate || ''));

    calculateProfileAge();
    renderPostingTimeline(data.postingHistory || []);
}

// =========================================================
// ૨. ઉંમરની ગણતરી (Auto Age Calculator)
// =========================================================
function calculateProfileAge() {
    let dobVal = safeGetValue('prof-dob');
    if (!dobVal) {
        safeSetValue('prof-age', '-');
        return;
    }
    let dob = new Date(dobVal);
    if (isNaN(dob.getTime())) {
        safeSetValue('prof-age', '-');
        return;
    }
    let today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    let m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    safeSetValue('prof-age', toGujaratiDigits(age) + " વર્ષ");
}

// =========================================================
// ૩. પ્રોફાઈલ ફોટો ઓપ્ટિમાઈઝેશન (Canvas Resizer & Compression)
// =========================================================
function handleProfilePhotoUpload(event) {
    let file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("કૃપા કરી માત્ર ફોટો (Image) ફાઈલ જ પસંદ કરો.");
        return;
    }

    showToast("ફોટો ઓપ્ટિમાઇઝ થઈ રહ્યો છે...", "info");

    let reader = new FileReader();
    reader.onload = function(e) {
        let img = new Image();
        img.onload = function() {
            // કેનવાસ દ્વારા ફોટોને મહત્તમ 300x300 પિક્સેલ અને કમ્પ્રેસ કરો
            let maxDim = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }

            let canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG ગુણવત્તા 0.8 રાખી નાની સાઇઝમાં ડેટા URL બનાવો (~25-40 KB)
            let compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

            // સ્ક્રીન પર તરત બતાવો
            let imgEl = document.getElementById('prof-display-img');
            if (imgEl) imgEl.src = compressedBase64;

            // ફાયરબેઝમાં સેવ કરો
            let userDocId = currentUser.docId || currentUser.mobile;
            db.collection("Users").doc(userDocId).set({
                photoBase64: compressedBase64,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).then(() => {
                showToast("પ્રોફાઈલ ફોટો અપડેટ થઈ ગયો!");
                if (currentProfileData) currentProfileData.photoBase64 = compressedBase64;
            }).catch(err => {
                alert("ફોટો સેવ કરવામાં એરર: " + err.message);
            });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// =========================================================
// ૪. એડિટ મોડ & પ્રોફાઈલ સેવ લોજિક
// =========================================================
function toggleProfileEditMode() {
    isProfileEditing = true;
    document.querySelectorAll('.prof-editable').forEach(el => {
        el.disabled = false;
        el.style.background = '#ffffff';
    });
    let actions = document.getElementById('prof-save-actions');
    if (actions) actions.style.display = 'block';
    let btnEdit = document.getElementById('btn-toggle-edit-prof');
    if (btnEdit) btnEdit.style.display = 'none';
}

function cancelProfileEdit() {
    isProfileEditing = false;
    document.querySelectorAll('.prof-editable').forEach(el => {
        el.disabled = true;
        el.style.background = '#f8fafc';
    });
    let actions = document.getElementById('prof-save-actions');
    if (actions) actions.style.display = 'none';
    let btnEdit = document.getElementById('btn-toggle-edit-prof');
    if (btnEdit) btnEdit.style.display = 'inline-flex';

    if (currentProfileData) populateProfileFields(currentProfileData);
}

function saveUserProfileData() {
    let btn = document.getElementById('btn-save-profile');
    if (btn) { btn.disabled = true; btn.innerText = "સેવ થાય છે..."; }

    let email = safeGetValue('prof-email');
    let dob = safeGetValue('prof-dob');
    let bloodGroup = safeGetValue('prof-blood-group');
    let nativePlace = safeGetValue('prof-native');
    let empId = safeGetValue('prof-emp-id');
    let education = safeGetValue('prof-education');
    let firstJoin = safeGetValue('prof-first-join');
    let revJoin = safeGetValue('prof-rev-join');

    let userDocId = currentUser.docId || currentUser.mobile;
    let payload = {
        email: email,
        dob: dob,
        bloodGroup: bloodGroup,
        nativePlace: nativePlace,
        employeeId: empId,
        education: education,
        firstJoinDate: firstJoin,
        revenueJoinDate: revJoin,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("Users").doc(userDocId).set(payload, { merge: true }).then(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> માહિતી સેવ કરો'; }
        if (!currentProfileData) currentProfileData = {};
        Object.assign(currentProfileData, payload);
        cancelProfileEdit();
        showToast("પ્રોફાઈલ માહિતી સફળતાપૂર્વક સાચવી લેવાઈ!");
    }).catch(err => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> માહિતી સેવ કરો'; }
        alert("સેવ કરવામાં એરર: " + err.message);
    });
}

// =========================================================
// ૫. ડિજિટલ સેવાપોથી ટાઈમલાઈન (Posting History Tracker)
// =========================================================
function renderPostingTimeline(historyList) {
    let container = document.getElementById('posting-timeline-container');
    if (!container) return;

    if (!Array.isArray(historyList) || historyList.length === 0) {
        container.innerHTML = '<p style="font-size:12px; color:#94a3b8; margin:0; padding:4px 0;">હજુ સુધી કોઈ સેવા ઇતિહાસ ઉમેરાયો નથી. "+ નવો હુકમ ઉમેરો" પર ક્લિક કરી વિગત ઉમેરો.</p>';
        return;
    }

    // તારીખ મુજબ ક્રમ ગોઠવો (નવી પોસ્ટિંગ સૌથી ઉપર)
    historyList.sort((a, b) => {
        let tA = a.from ? new Date(a.from).getTime() : 0;
        let tB = b.from ? new Date(b.from).getTime() : 0;
        return tB - tA;
    });

    container.innerHTML = historyList.map((item, idx) => {
        let isCurrent = !item.to || item.to === 'ચાલુ' || item.isCurrent;
        let fromStr = formatDisplayDateGujarati(item.from) || '-';
        let toStr = isCurrent ? '<span style="color:#059669; font-weight:700;">હાલ ચાલુ</span>' : formatDisplayDateGujarati(item.to);

        return `
            <div class="timeline-item">
                <div class="timeline-dot ${isCurrent ? 'current' : ''}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-place">${item.place || '-'}</span>
                        <span class="timeline-period">${fromStr} થી ${toStr}</span>
                    </div>
                    <div style="color:#334155; font-weight:600; margin-bottom:2px;">
                        ${item.role || 'મહેસૂલી તલાટી'}
                    </div>
                    ${item.orderNo ? `<div style="font-size:11px; color:#64748b;"><i class="fa-solid fa-file-lines"></i> ${item.orderNo}</div>` : ''}
                    <div style="text-align:right; margin-top:4px;">
                        <button type="button" onclick="deletePostingEntry(${idx})" style="background:none; border:none; color:#ef4444; font-size:11px; cursor:pointer;" title="નોંધ હટાવો">
                            <i class="fa-solid fa-trash"></i> હટાવો
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openAddPostingModal() {
    safeSetValue('post-place', '');
    safeSetValue('post-role', 'મહેસૂલી તલાટી');
    safeSetValue('post-from', '');
    safeSetValue('post-to', '');
    safeSetValue('post-order', '');
    let chk = document.getElementById('post-is-current');
    if (chk) {
        chk.checked = false;
        togglePostingToDate(chk);
    }
    let modal = document.getElementById('modal-add-posting');
    if (modal) modal.style.display = 'flex';
}

function togglePostingToDate(checkbox) {
    let toInput = document.getElementById('post-to');
    if (!toInput) return;
    if (checkbox.checked) {
        toInput.value = '';
        toInput.disabled = true;
        toInput.style.background = '#f1f5f9';
    } else {
        toInput.disabled = false;
        toInput.style.background = '#fff';
    }
}

function saveNewPostingEntry() {
    let place = safeGetValue('post-place');
    let role = safeGetValue('post-role');
    let from = safeGetValue('post-from');
    let to = safeGetValue('post-to');
    let isCurr = document.getElementById('post-is-current') && document.getElementById('post-is-current').checked;
    let orderNo = safeGetValue('post-order');

    if (!place) { alert("કૃપા કરી જગ્યા / કચેરીનું નામ દાખલ કરો."); return; }
    if (!from) { alert("કૃપા કરી હાજર તારીખ દાખલ કરો."); return; }

    let newEntry = {
        id: Date.now().toString(),
        place: place,
        role: role,
        from: from,
        to: isCurr ? 'ચાલુ' : to,
        isCurrent: isCurr,
        orderNo: orderNo
    };

    if (!currentProfileData) currentProfileData = {};
    if (!Array.isArray(currentProfileData.postingHistory)) {
        currentProfileData.postingHistory = [];
    }

    currentProfileData.postingHistory.push(newEntry);

    let userDocId = currentUser.docId || currentUser.mobile;
    db.collection("Users").doc(userDocId).set({
        postingHistory: currentProfileData.postingHistory,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        document.getElementById('modal-add-posting').style.display = 'none';
        renderPostingTimeline(currentProfileData.postingHistory);
        showToast("સેવાપોથીમાં નવી નોંધ ઉમેરાઈ ગઈ!");
    }).catch(err => {
        alert("સેવ એરર: " + err.message);
    });
}

function deletePostingEntry(index) {
    if (!confirm("શું તમે ખરેખર આ સેવા નોંધ હટાવવા માંગો છો?")) return;
    if (!currentProfileData || !Array.isArray(currentProfileData.postingHistory)) return;

    currentProfileData.postingHistory.splice(index, 1);
    let userDocId = currentUser.docId || currentUser.mobile;

    db.collection("Users").doc(userDocId).set({
        postingHistory: currentProfileData.postingHistory,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        renderPostingTimeline(currentProfileData.postingHistory);
        showToast("સેવા નોંધ હટાવાઈ ગઈ.");
    }).catch(err => alert("ડિલીટ એરર: " + err.message));
}

// =========================================================
// ૬. પાસવર્ડ બદલવાની સુવિધા (Change Password Modal)
// =========================================================
function openChangePasswordModal() {
    safeSetValue('new-user-pass', '');
    safeSetValue('confirm-user-pass', '');
    let m = document.getElementById('modal-change-password');
    if (m) m.style.display = 'flex';
}

function submitPasswordChange() {
    let p1 = safeGetValue('new-user-pass');
    let p2 = safeGetValue('confirm-user-pass');

    if (!p1 || p1.length < 6) {
        alert("નવો પાસવર્ડ ઓછામાં ઓછો ૬ અક્ષર કે આંકડાનો હોવો જોઈએ.");
        return;
    }
    if (p1 !== p2) {
        alert("બંને પાસવર્ડ સરખા નથી. કૃપા કરી ચકાસીને ફરી લખો.");
        return;
    }

    if (typeof changeUserPassword === 'function') {
        changeUserPassword(p1);
        let m = document.getElementById('modal-change-password');
        if (m) m.style.display = 'none';
    } else {
        alert("સુરક્ષા ફંક્શન ઉપલબ્ધ નથી.");
    }
}