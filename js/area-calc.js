// js/area-calc.js

const SQM_PER_GUNTHA = 101.17141; const GUNTHA_PER_VIGHA = 16; const SQM_PER_VIGHA = SQM_PER_GUNTHA * GUNTHA_PER_VIGHA; const SQM_PER_ACRE = 4046.85642; const SQFT_PER_SQM = 10.76391; const SQYD_PER_SQM = 1.19599;

function openAreaCalcModal() { let m = document.getElementById('modal-area-calc'); if (m) m.style.display = 'flex'; if (mathRows.length === 0) { addMathRow('+'); addMathRow('+'); } }
function closeAreaCalcModal() { let m = document.getElementById('modal-area-calc'); if (m) m.style.display = 'none'; }

function switchCalcTab(tabId) {
    document.querySelectorAll('.calc-tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.calc-pane').forEach(p => p.style.display = 'none');
    let btn = document.getElementById('tab-btn-' + tabId); let pane = document.getElementById('calc-pane-' + tabId);
    if (btn) btn.classList.add('active'); if (pane) pane.style.display = 'block';
}

let isConverting = false;
function updateConverterOutputs(totalSqM) {
    if (isConverting) return; isConverting = true; totalSqM = parseFloat(totalSqM) || 0; if (totalSqM < 0) totalSqM = 0;
    let ha = Math.floor(totalSqM / 10000); let remHa = totalSqM % 10000; let are = Math.floor(remHa / 100); let sqmPart = Math.round(remHa % 100);
    safeSetValue('calc-c-ha', ha || ''); safeSetValue('calc-c-are', are || ''); safeSetValue('calc-c-sqm-part', sqmPart || '');
    safeSetValue('calc-c-sqm', totalSqM ? Math.round(totalSqM * 100) / 100 : '');
    let totalGuntha = totalSqM / SQM_PER_GUNTHA; safeSetValue('calc-c-guntha-total', totalGuntha ? totalGuntha.toFixed(2) : '');
    let vigha = Math.floor(totalGuntha / GUNTHA_PER_VIGHA); let remVGuntha = (totalGuntha % GUNTHA_PER_VIGHA); safeSetValue('calc-c-vigha', vigha || ''); safeSetValue('calc-c-v-guntha', remVGuntha ? remVGuntha.toFixed(2) : '');
    let acre = Math.floor(totalGuntha / 40); let remAGuntha = (totalGuntha % 40); safeSetValue('calc-c-acre', acre || ''); safeSetValue('calc-c-a-guntha', remAGuntha ? remAGuntha.toFixed(2) : '');
    safeSetValue('calc-c-sqyard', totalSqM ? Math.round(totalSqM * SQYD_PER_SQM) : ''); safeSetValue('calc-c-sqft', totalSqM ? Math.round(totalSqM * SQFT_PER_SQM) : '');
    isConverting = false;
}

function convertFromTotalSqM(val) { if (isConverting) return; updateConverterOutputs(parseFloat(val) || 0); }
function convertFromHaAreSq() { if (isConverting) return; let ha = parseFloat(safeGetValue('calc-c-ha')) || 0; let are = parseFloat(safeGetValue('calc-c-are')) || 0; let sq = parseFloat(safeGetValue('calc-c-sqm-part')) || 0; updateConverterOutputs((ha * 10000) + (are * 100) + sq); }
function convertFromVighaGuntha() { if (isConverting) return; let v = parseFloat(safeGetValue('calc-c-vigha')) || 0; let g = parseFloat(safeGetValue('calc-c-v-guntha')) || 0; updateConverterOutputs(((v * GUNTHA_PER_VIGHA) + g) * SQM_PER_GUNTHA); }
function convertFromAcreGuntha() { if (isConverting) return; let a = parseFloat(safeGetValue('calc-c-acre')) || 0; let g = parseFloat(safeGetValue('calc-c-a-guntha')) || 0; updateConverterOutputs(((a * 40) + g) * SQM_PER_GUNTHA); }
function convertFromTotalGuntha(val) { if (isConverting) return; updateConverterOutputs((parseFloat(val) || 0) * SQM_PER_GUNTHA); }
function convertFromSqYard(val) { if (isConverting) return; updateConverterOutputs((parseFloat(val) || 0) / SQYD_PER_SQM); }
function convertFromSqFt(val) { if (isConverting) return; updateConverterOutputs((parseFloat(val) || 0) / SQFT_PER_SQM); }
function clearConverterFields() { const ids = ['calc-c-ha','calc-c-are','calc-c-sqm-part','calc-c-sqm','calc-c-vigha','calc-c-v-guntha','calc-c-acre','calc-c-a-guntha','calc-c-guntha-total','calc-c-sqyard','calc-c-sqft']; ids.forEach(id => safeSetValue(id, '')); }

let mathRows = [];
function preserveCurrentMathValues() { mathRows.forEach(r => { let elHa = document.getElementById('m-ha-' + r.id); let elAre = document.getElementById('m-are-' + r.id); let elSq = document.getElementById('m-sq-' + r.id); r.ha = elHa ? elHa.value : (r.ha || ''); r.are = elAre ? elAre.value : (r.are || ''); r.sq = elSq ? elSq.value : (r.sq || ''); }); }
function addMathRow(sign = '+') { preserveCurrentMathValues(); let id = 'mr_' + Date.now() + Math.floor(Math.random() * 100); mathRows.push({ id: id, sign: sign, ha: '', are: '', sq: '' }); renderMathRows(); }
function removeMathRow(id) { if (mathRows.length <= 1) return; preserveCurrentMathValues(); mathRows = mathRows.filter(r => r.id !== id); renderMathRows(); }
function toggleMathRowSign(id) { preserveCurrentMathValues(); let r = mathRows.find(x => x.id === id); if (r) { r.sign = (r.sign === '+') ? '-' : '+'; renderMathRows(); } }
function updateRowData(id, field, val) { let r = mathRows.find(x => x.id === id); if (r) { r[field] = val; } calculateMathTotal(); }

function renderMathRows() {
    let cont = document.getElementById('math-rows-container'); if (!cont) return;
    cont.innerHTML = mathRows.map((r) => { let isPlus = r.sign === '+'; return `<div class="math-row"><button type="button" class="math-badge ${isPlus ? 'math-badge-plus' : 'math-badge-minus'}" onclick="toggleMathRowSign('${r.id}')" title="ક્લિક કરી ચિહ્ન બદલો (+ / -)">${r.sign}</button><input type="number" step="any" class="form-control" style="padding:6px 8px; font-size:13px;" id="m-ha-${r.id}" placeholder="હેક્ટર" value="${r.ha || ''}" oninput="updateRowData('${r.id}', 'ha', this.value)"><input type="number" step="any" class="form-control" style="padding:6px 8px; font-size:13px;" id="m-are-${r.id}" placeholder="આરે" value="${r.are || ''}" oninput="updateRowData('${r.id}', 'are', this.value)"><input type="number" step="any" class="form-control" style="padding:6px 8px; font-size:13px;" id="m-sq-${r.id}" placeholder="ચો.મી." value="${r.sq || ''}" oninput="updateRowData('${r.id}', 'sq', this.value)"><button type="button" class="btn-delete" style="padding:6px 8px;" onclick="removeMathRow('${r.id}')" title="હટાવો"><i class="bi bi-x-lg"></i></button></div>`; }).join('');
    calculateMathTotal();
}

let lastMathFormatted = "";
function calculateMathTotal() {
    let totalSqM = 0;
    mathRows.forEach(r => { let ha = parseFloat(r.ha) || 0; let are = parseFloat(r.are) || 0; let sq = parseFloat(r.sq) || 0; let rowSqM = (ha * 10000) + (are * 100) + sq; if (r.sign === '+') { totalSqM += rowSqM; } else { totalSqM -= rowSqM; } });
    let isNegative = totalSqM < 0; let absTotal = Math.abs(totalSqM);
    let ha = Math.floor(absTotal / 10000); let remHa = absTotal % 10000; let are = Math.floor(remHa / 100); let sq = Math.round(remHa % 100);
    let prefix = isNegative ? "(-) " : ""; let haStr = prefix + toGujaratiDigits(ha); let areStr = toGujaratiDigits(('0' + are).slice(-2)); let sqStr = toGujaratiDigits(('0' + sq).slice(-2));
    let fStr = `${haStr}-${areStr}-${sqStr} હે.આરે.ચો.મી.`; lastMathFormatted = fStr; safeSetText('math-res-ha-are', fStr);
    let totalGuntha = absTotal / SQM_PER_GUNTHA; let vigha = Math.floor(totalGuntha / GUNTHA_PER_VIGHA); let remGuntha = (totalGuntha % GUNTHA_PER_VIGHA).toFixed(1);
    let finalDetail = `કુલ: ${toGujaratiDigits(Math.round(totalSqM))} ચો.મી. | ${toGujaratiDigits(vigha)} વિઘા ${toGujaratiDigits(remGuntha)} ગુંઠા`; if (isNegative) finalDetail += " (ઋણ બાકી)"; safeSetText('math-res-detail', finalDetail);
}

let lastShareFormatted = "";
function toggleShareMode() { let mode = safeGetValue('share-calc-mode'); let fRow = document.getElementById('share-fraction-row'); if (fRow) fRow.style.display = (mode === 'fraction') ? 'block' : 'none'; calculateShare(); }
function calculateShare() {
    let ha = parseFloat(safeGetValue('share-total-ha')) || 0; let are = parseFloat(safeGetValue('share-total-are')) || 0; let sq = parseFloat(safeGetValue('share-total-sqm')) || 0; let totalSqM = (ha * 10000) + (are * 100) + sq;
    if (totalSqM <= 0) { safeSetText('share-res-ha-are', '૦-૦૦-૦૦ હે.આરે.ચો.મી.'); safeSetText('share-res-detail', '૦ ચો.મી. | ૦ વિઘા ૦ ગુંઠા'); return; }
    let mode = safeGetValue('share-calc-mode'); let shareSqM = 0;
    if (mode === 'equal') { let count = parseInt(safeGetValue('share-person-count')) || 1; if (count < 1) count = 1; shareSqM = totalSqM / count; safeSetText('share-res-title', `પ્રત્યેક ખાતેદારના ભાગે આવતું ક્ષેત્રફળ (કુલ ${toGujaratiDigits(count)} ભાગીદાર):`); } 
    else { let num = parseFloat(safeGetValue('share-frac-num')) || 1; let den = parseFloat(safeGetValue('share-frac-den')) || 1; if (den <= 0) den = 1; shareSqM = totalSqM * (num / den); safeSetText('share-res-title', `નિયુક્ત હિસ્સા મુજબ ક્ષેત્રફળ (${toGujaratiDigits(num)}/${toGujaratiDigits(den)} ભાગ):`); }
    let haPart = Math.floor(shareSqM / 10000); let remHa = shareSqM % 10000; let arePart = Math.floor(remHa / 100); let sqPart = Math.round(remHa % 100);
    let haStr = toGujaratiDigits(haPart); let areStr = toGujaratiDigits(('0' + arePart).slice(-2)); let sqStr = toGujaratiDigits(('0' + sqPart).slice(-2));
    let fStr = `${haStr}-${areStr}-${sqStr} હે.આરે.ચો.મી.`; lastShareFormatted = fStr; safeSetText('share-res-ha-are', fStr);
    let totalGuntha = shareSqM / SQM_PER_GUNTHA; let vigha = Math.floor(totalGuntha / GUNTHA_PER_VIGHA); let remGuntha = (totalGuntha % GUNTHA_PER_VIGHA).toFixed(2);
    safeSetText('share-res-detail', `${toGujaratiDigits(Math.round(shareSqM))} ચો.મી. | ${toGujaratiDigits(vigha)} વિઘા ${toGujaratiDigits(remGuntha)} ગુંઠા`);
}
function copyShareResult() { if (!lastShareFormatted) return; navigator.clipboard.writeText(lastShareFormatted).then(() => { showToast("હિસ્સા ક્ષેત્રફળ કોપી થયું: " + lastShareFormatted); }); }
function copyMathResult() { if (!lastMathFormatted) return; navigator.clipboard.writeText(lastMathFormatted).then(() => { showToast("પરિણામ કોપી થયું: " + lastMathFormatted); }); }