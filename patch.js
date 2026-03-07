// ============================================================
// patch.js - Override generateReport with projections table
// Loaded AFTER script.js to override the original function
// ============================================================

function generateReport() {
    const plan = getCurrentPlan();
    
    if (!plan || !plan.investments) {
        alert('שגיאה: לא נמצאה תוכנית או השקעות');
        return;
    }
    
    if (plan.investments.length === 0) {
        alert('⚠️ אין מסלולי השקעה להציג בדוח.\nאנא הוסף השקעות תחילה.');
        return;
    }
    
    const years = parseInt(document.getElementById('sumYears') && document.getElementById('sumYears').value) || 20;
    const interval = parseInt(document.getElementById('projInterval')?.value) || 5;
    
    const totalToday = plan.investments
        .filter(inv => inv.include && inv.type !== 'פנסיה')
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    const projection = calculateProjectionWithWithdrawals(plan.investments, years, plan.withdrawals || []);
    
    const equityInvs = plan.investments.filter(inv => inv.include && inv.type !== 'פנסיה');
    const totalAmount = equityInvs.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const avgFeeAnnual = totalAmount > 0 ? equityInvs.reduce((sum, inv) => sum + ((inv.amount || 0) * (inv.feeAnnual || 0)), 0) / totalAmount : 0;
    const avgFeeDeposit = totalAmount > 0 ? equityInvs.reduce((sum, inv) => sum + ((inv.amount || 0) * (inv.feeDeposit || 0)), 0) / totalAmount : 0;
    const avgReturn = totalAmount > 0 ? equityInvs.reduce((sum, inv) => sum + ((inv.amount || 0) * (inv.returnRate || 0)), 0) / totalAmount : 0;
    
    const totalReal = calculateRealValue(projection.finalNominal, years);
    
    const breakdown = plan.investments.filter(inv => inv.include && inv.type !== 'פנסיה').map(inv => {
        const nominal = calculateFV(inv.amount, inv.monthly, inv.returnRate, years, inv.feeDeposit || 0, inv.feeAnnual || 0, inv.subTracks);
        const principal = calculatePrincipal(inv.amount, inv.monthly, years);
        return {
            name: inv.name,
            house: inv.house,
            today: inv.amount,
            monthly: inv.monthly,
            future: nominal,
            profit: nominal - principal
        };
    });
    
    // Build projections data using user-selected interval
    const currentYear = new Date().getFullYear();
    let projectionsRows = '';
    for (let y = 0; y <= years; y += interval) {
        const year = currentYear + y;
        const proj = calculateProjectionWithWithdrawals(plan.investments, y, plan.withdrawals);
        const totalNominal = proj.finalNominal;
        const totalPrincipal = proj.finalPrincipal;
        const totalTax = calculateTax(totalPrincipal, totalNominal, 25, y);
        const real = calculateRealValue(totalNominal, y);
        const netAfterTax = totalNominal - totalTax;
        
        projectionsRows += '<tr>';
        projectionsRows += '<td style="font-weight: 600;">' + year + '</td>';
        projectionsRows += '<td>' + formatCurrency(totalNominal) + '</td>';
        projectionsRows += '<td style="color: #3b82f6;">' + formatCurrency(real) + '</td>';
        projectionsRows += '<td style="color: #ef4444;">' + formatCurrency(totalTax) + '</td>';
        projectionsRows += '<td style="color: #10b981; font-weight: 600;">' + formatCurrency(netAfterTax) + '</td>';
        projectionsRows += '</tr>';
    }
    
    // Build HTML report
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>דוח פיננסי</title>');
    reportWindow.document.write('<style>body{font-family:Arial;padding:40px;background:#f9fafb}');
    reportWindow.document.write('.container{max-width:1200px;margin:0 auto;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.08)}');
    reportWindow.document.write('h1{color:#1f2937;font-size:2.5em;border-bottom:4px solid #3b82f6;padding-bottom:16px;margin-bottom:24px}');
    reportWindow.document.write('h2{color:#3b82f6;font-size:1.8em;margin:32px 0 16px;padding-right:12px;border-right:4px solid #3b82f6}');
    reportWindow.document.write('.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:24px 0}');
    reportWindow.document.write('.summary-card{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:12px}');
    reportWindow.document.write('.summary-card-title{font-size:0.9em;opacity:0.9;margin-bottom:8px}');
    reportWindow.document.write('.summary-card-value{font-size:1.8em;font-weight:bold}');
    reportWindow.document.write('table{width:100%;border-collapse:collapse;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1)}');
    reportWindow.document.write('th{background:#3b82f6;color:white;padding:14px;text-align:right;font-weight:600}');
    reportWindow.document.write('td{padding:12px 14px;border-bottom:1px solid #e5e7eb}');
    reportWindow.document.write('tr:hover{background:#f3f4f6}.profit{color:#10b981;font-weight:bold}');
    reportWindow.document.write('.print-btn{position:fixed;bottom:30px;left:30px;background:#3b82f6;color:white;border:none;padding:16px 24px;border-radius:12px;font-size:1.1em;cursor:pointer;box-shadow:0 4px 12px rgba(59,130,246,0.4);z-index:1000}');
    reportWindow.document.write('.print-btn:hover{background:#2563eb}@media print{.print-btn{display:none}}</style></head><body>');
    
    reportWindow.document.write('<div class="container">');
    reportWindow.document.write('<h1>📊 דוח פיננסי מסכם</h1>');
    reportWindow.document.write('<p style="color:#6b7280;margin-bottom:32px">תוכנית: ' + plan.name + ' | תאריך: ' + new Date().toLocaleDateString('he-IL') + '</p>');
    
    // Section: Current state
    reportWindow.document.write('<h2>💰 מצב נוכחי</h2>');
    reportWindow.document.write('<div class="summary-grid">');
    reportWindow.document.write('<div class="summary-card"><div class="summary-card-title">הון עצמי היום</div><div class="summary-card-value">' + formatCurrency(totalToday) + '</div></div>');
    reportWindow.document.write('<div class="summary-card"><div class="summary-card-title">תחזית בעוד ' + years + ' שנים (נומינלי)</div><div class="summary-card-value">' + formatCurrency(projection.finalNominal) + '</div></div>');
    reportWindow.document.write('<div class="summary-card"><div class="summary-card-title">תחזית (ריאלי - כוח קנייה)</div><div class="summary-card-value">' + formatCurrency(totalReal) + '</div></div>');
    reportWindow.document.write('</div>');
    
    // Section: Averages
    reportWindow.document.write('<h2>📈 ממוצעים משוקללים</h2>');
    reportWindow.document.write('<div class="summary-grid">');
    reportWindow.document.write('<div class="summary-card"><div class="summary-card-title">ממוצע תשואה שנתית</div><div class="summary-card-value">' + avgReturn.toFixed(2) + '%</div></div>');
    reportWindow.document.write('<div class="summary-card"><div class="summary-card-title">ממוצע דמי ניהול - צבירה</div><div class="summary-card-value">' + avgFeeAnnual.toFixed(2) + '%</div></div>');
    reportWindow.document.write('<div class="summary-card"><div class="summary-card-title">ממוצע דמי ניהול - הפקדה</div><div class="summary-card-value">' + avgFeeDeposit.toFixed(2) + '%</div></div>');
    reportWindow.document.write('</div>');
    
    // Section: Investment breakdown
    reportWindow.document.write('<h2>📋 פירוט מסלולי השקעה</h2>');
    reportWindow.document.write('<table><thead><tr><th>שם</th><th>בית השקעות</th><th>סכום היום</th><th>הפקדה חודשית</th><th>תחזית (' + years + ' שנים)</th><th>רווח צפוי</th></tr></thead><tbody>');
    
    breakdown.forEach(item => {
        reportWindow.document.write('<tr>');
        reportWindow.document.write('<td><strong>' + item.name + '</strong></td>');
        reportWindow.document.write('<td>' + item.house + '</td>');
        reportWindow.document.write('<td>' + formatCurrency(item.today) + '</td>');
        reportWindow.document.write('<td>' + formatCurrency(item.monthly) + '/חודש</td>');
        reportWindow.document.write('<td>' + formatCurrency(item.future) + '</td>');
        reportWindow.document.write('<td class="profit">' + formatCurrency(item.profit) + '</td>');
        reportWindow.document.write('</tr>');
    });
    
    const totalMonthly = equityInvs.reduce((s, i) => s + (i.monthly || 0), 0);
    reportWindow.document.write('<tr style="background:#f3f4f6;font-weight:bold">');
    reportWindow.document.write('<td colspan="2">סה"כ</td>');
    reportWindow.document.write('<td>' + formatCurrency(totalToday) + '</td>');
    reportWindow.document.write('<td>' + formatCurrency(totalMonthly) + '/חודש</td>');
    reportWindow.document.write('<td>' + formatCurrency(projection.finalNominal) + '</td>');
    reportWindow.document.write('<td class="profit">' + formatCurrency(projection.finalNominal - projection.finalPrincipal) + '</td>');
    reportWindow.document.write('</tr></tbody></table>');
    
    // Section: Projections table (NEW - uses user-selected interval)
    const intervalLabel = interval === 1 ? 'שנה' : interval === 2 ? 'שנתיים' : interval + ' שנים';
    reportWindow.document.write('<h2>📈 תחזית צמיחה (כל ' + intervalLabel + ')</h2>');
    reportWindow.document.write('<table><thead><tr><th>שנה</th><th>ערך נומינלי</th><th>ערך ריאלי</th><th>מס במשיכה</th><th>נטו לאחר מס</th></tr></thead><tbody>');
    reportWindow.document.write(projectionsRows);
    reportWindow.document.write('</tbody></table>');
    
    // Section: Roadmap
    if (plan.withdrawals && plan.withdrawals.length > 0) {
        const activeWithdrawals = plan.withdrawals.filter(w => w.active !== false).sort((a, b) => a.year - b.year);
        if (activeWithdrawals.length > 0) {
            reportWindow.document.write('<h2>🗓️ מפת דרכים - משיכות מתוכננות</h2>');
            reportWindow.document.write('<table><thead><tr><th>שנה</th><th>מטרה</th><th>סכום</th><th>סטטוס</th></tr></thead><tbody>');
            activeWithdrawals.forEach(w => {
                reportWindow.document.write('<tr>');
                reportWindow.document.write('<td><strong>' + w.year + '</strong></td>');
                reportWindow.document.write('<td>' + (w.goalId ? '🎯 ' : '') + w.goal + '</td>');
                reportWindow.document.write('<td style="color:#f59e0b;font-weight:bold">' + formatCurrency(w.amount) + '</td>');
                reportWindow.document.write('<td>' + (w.goalId ? 'מקושר ליעד' : 'משיכה ידנית') + '</td>');
                reportWindow.document.write('</tr>');
            });
            reportWindow.document.write('</tbody></table>');
        }
    }
    
    // Footer
    reportWindow.document.write('<p style="margin-top:40px;padding-top:20px;border-top:2px solid #e5e7eb;color:#6b7280;text-align:center">');
    reportWindow.document.write('נוצר באמצעות מתכנן פיננסי v40 | ' + new Date().toLocaleDateString('he-IL') + ' ' + new Date().toLocaleTimeString('he-IL'));
    reportWindow.document.write('</p></div>');
    reportWindow.document.write('<button class="print-btn" onclick="window.print()">🖨️ הדפס / שמור PDF</button>');
    reportWindow.document.write('</body></html>');
    reportWindow.document.close();
}

console.log('✅ patch.js loaded - generateReport updated with projections table');
