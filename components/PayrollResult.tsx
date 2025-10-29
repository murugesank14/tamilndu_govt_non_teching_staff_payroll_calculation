

import React from 'react';
import { PayrollResult as PayrollResultType, PromotionFixation } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { PayProgressionChart } from './PayProgressionChart';
import { CareerTimeline } from './CareerTimeline';
import { ExcelIcon, FileCogIcon, PdfIcon, WordIcon } from './ui/Icons';
import { YearlyPayrollAccordion } from './YearlyPayrollAccordion';
import { useLanguage } from './LanguageProvider';

// Declare global variables from CDN scripts to satisfy TypeScript
declare global {
    interface Window {
        jspdf: any;
        htmlDocx: any;
        saveAs: (blob: Blob, filename: string) => void;
    }
}
declare const XLSX: any;


interface PayrollResultProps {
  result: PayrollResultType;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const formatCurrencyForExport = (amount: number) => {
    return `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0 }).format(amount)}`;
};

const PromotionFixationCard: React.FC<{ fixations: PromotionFixation[] }> = ({ fixations }) => {
    const { t } = useLanguage();
    return (
    <Card>
        <CardHeader>
            <CardTitle>{t('promotionFixation')}</CardTitle>
            <CardDescription>Pay fixation details as per Rule 22(b) of TN Revised Pay Rules, 2017.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {fixations.map((fix, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-50/80">
                <h4 className="font-semibold text-md mb-2">
                    Fixation for Promotion to: <span className="text-blue-600">{fix.newPost}</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-2 text-sm">
                    <div><p className="text-gray-500">Promotion Date</p><p className="font-medium">{fix.promotionDate}</p></div>
                    <div><p className="text-gray-500">Option Exercised</p><p className="font-medium">{fix.optionUnderRule22b}</p></div>
                    <div><p className="text-gray-500">Effective Date</p><p className="font-semibold text-green-600">{fix.effectiveDate}</p></div>
                    
                    <div><p className="text-gray-500">Old Basic (Lvl {fix.oldLevel})</p><p className="font-medium">{formatCurrency(fix.oldBasic)}</p></div>
                    
                    {fix.optionUnderRule22b === 'Date of Next Increment' && fix.payAfterAnnualIncrement &&
                        <div><p className="text-gray-500">After Annual Inc.</p><p className="font-medium">{formatCurrency(fix.payAfterAnnualIncrement)}</p></div>
                    }
                    {fix.optionUnderRule22b === 'Date of Promotion' &&
                        <div><p className="text-gray-500">After Notional Inc.</p><p className="font-medium">{formatCurrency(fix.payAfterNotionalIncrement)}</p></div>
                    }
                    
                    <div><p className="text-gray-500">New Basic (Lvl {fix.newLevel})</p><p className="font-bold text-lg text-blue-700">{formatCurrency(fix.newBasic)}</p></div>
                </div>
                 <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold">{t('promotionFixationMethodLabel')}</p>
                    <p className="text-xs text-gray-600">{fix.fixationMethod}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">Ref: {fix.goReference}</p>
            </div>
            ))}
        </CardContent>
    </Card>
)};


const PayrollResult: React.FC<PayrollResultProps> = ({ result }) => {
  const { employeeDetails, fixation5thPC, fixation6thPC, fixation7thPC, yearlyCalculations, appliedRevisions, promotionFixations } = result;
  const { t } = useLanguage();

    const handleExportFixationPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.text('PAY FIXATION STATEMENT', 105, 15, { align: 'center' });

        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        const introText = `As per the Tamil Nadu Revised Pay Rules, the pay for Thiru/Tmt. ${employeeDetails.employeeName}, ${employeeDetails.joiningPost}, is fixed as follows:`;
        const splitIntro = doc.splitTextToSize(introText, 180);
        doc.text(splitIntro, 14, 25);
        
        let lastY = 40;
        let sectionCounter = 1;

        if (fixation5thPC) {
            doc.setFont('times', 'bold');
            doc.text(`${sectionCounter}. Fixation into 5th Pay Commission (w.e.f. 01.01.1996)`, 14, lastY);
            // Fix: Explicitly type body as any[] to allow mixed types (string[] and object[] with styles) for jspdf-autotable.
            const body: any[] = [
                ['Basic Pay as on 31.12.1995', formatCurrencyForExport(fixation5thPC.basicPay1995)],
                ['Dearness Allowance @ 148%', formatCurrencyForExport(fixation5thPC.da1995)],
                ['Fitment Benefit (20% of BP, Min Rs.50)', formatCurrencyForExport(fixation5thPC.fitmentBenefit)],
                ['Total Emoluments', formatCurrencyForExport(fixation5thPC.totalPay)],
                [{ content: 'Revised Pay in the 5th PC Scale', styles: { fontStyle: 'bold' } }, { content: formatCurrencyForExport(fixation5thPC.initialRevisedPay), styles: { fontStyle: 'bold' } }],
            ];
             doc.autoTable({
                startY: lastY + 4,
                body: body,
                theme: 'striped',
                styles: { fontSize: 10, cellPadding: 2.5 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
            });
            lastY = (doc as any).lastAutoTable.finalY + 8;
            sectionCounter++;
        }

        if (fixation6thPC) {
            doc.setFont('times', 'bold');
            doc.text(`${sectionCounter}. Fixation into 6th Pay Commission (w.e.f. 01.01.2006)`, 14, lastY);
            // Fix: Explicitly type body as any[] to allow mixed types for jspdf-autotable.
            const body: any[] = [
                ['Basic Pay as on 31.12.2005', formatCurrencyForExport(fixation6thPC.basicPay2005)],
                ['Pay after multiplication by Fitment Factor of 1.86', formatCurrencyForExport(fixation6thPC.multipliedPay)],
                ['Pay in the revised Pay Band (PB)', formatCurrencyForExport(fixation6thPC.initialPayInPayBand)],
                ['Applicable Grade Pay (GP)', formatCurrencyForExport(fixation6thPC.initialGradePay)],
                [{ content: 'Revised Basic Pay (PB + GP)', styles: { fontStyle: 'bold' } }, { content: formatCurrencyForExport(fixation6thPC.initialRevisedBasicPay), styles: { fontStyle: 'bold' } }],
            ];
             doc.autoTable({
                startY: lastY + 4,
                body: body,
                theme: 'striped',
                styles: { fontSize: 10, cellPadding: 2.5 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
            });
            lastY = (doc as any).lastAutoTable.finalY + 8;
            sectionCounter++;
        }
        
        if (fixation7thPC) {
            doc.setFont('times', 'bold');
            doc.text(`${sectionCounter}. Fixation into 7th Pay Commission (w.e.f. 01.01.2016)`, 14, lastY);
            // Fix: Explicitly type body as any[] to allow mixed types for jspdf-autotable.
            const body: any[] = [
                ['Basic Pay as on 31.12.2015', formatCurrencyForExport(fixation7thPC.oldBasicPay)],
                ['Pay after multiplication by Fitment Factor of 2.57', formatCurrencyForExport(fixation7thPC.multipliedPay)],
                ['Applicable Level in Pay Matrix', `Level ${fixation7thPC.level}`],
                [{ content: 'Revised Pay in the applicable Level', styles: { fontStyle: 'bold' } }, { content: formatCurrencyForExport(fixation7thPC.initialRevisedPay), styles: { fontStyle: 'bold' } }],
            ];
            doc.autoTable({
                startY: lastY + 4,
                body: body,
                theme: 'striped',
                styles: { fontSize: 10, cellPadding: 2.5 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
            });
            lastY = (doc as any).lastAutoTable.finalY + 8;
            sectionCounter++;
        }

        if(promotionFixations) {
             doc.setFont('times', 'bold');
             doc.text(`${sectionCounter}. Promotion Fixation under Rule 22(b)`, 14, lastY);
             promotionFixations.forEach((fix, index) => {
                 // Fix: Explicitly type fixationBody as any[] to allow mixed types for jspdf-autotable.
                 let fixationBody: any[] = [
                     ['Promotion to', `${fix.newPost} (Level ${fix.newLevel})`],
                     ['Promotion Date', fix.promotionDate],
                     ['Option Exercised', fix.optionUnderRule22b],
                     ['Effective Date of Fixation', fix.effectiveDate],
                     ['Basic Pay before fixation (Lvl ' + fix.oldLevel + ')', formatCurrencyForExport(fix.oldBasic)],
                 ];
                 if(fix.optionUnderRule22b === 'Date of Next Increment' && fix.payAfterAnnualIncrement) {
                      fixationBody.push(['Pay after Annual Increment', formatCurrencyForExport(fix.payAfterAnnualIncrement)]);
                 }
                 if(fix.optionUnderRule22b === 'Date of Promotion') {
                    fixationBody.push(['Pay after Notional Increment', formatCurrencyForExport(fix.payAfterNotionalIncrement)]);
                 }
                 fixationBody.push([{ content: 'New Basic Pay (Lvl ' + fix.newLevel + ')', styles: { fontStyle: 'bold' } }, { content: formatCurrencyForExport(fix.newBasic), styles: { fontStyle: 'bold' } }]);
                 fixationBody.push([t('reference'), fix.goReference]);
                 
                 doc.autoTable({
                    startY: lastY + 4,
                    body: fixationBody,
                    theme: 'striped',
                    styles: { fontSize: 10, cellPadding: 2 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
                });
                lastY = (doc as any).lastAutoTable.finalY;
             });
        }


        doc.setFont('times', 'normal');
        doc.text('Signature of Head of Office / Department', 195, lastY + 30, { align: 'right' });

        doc.save(`PayFixation_${employeeDetails.employeeName.replace(' ', '_')}.pdf`);
    };


    const handleExportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Payroll Calculation Report', 14, 22);

        // Employee Summary
        let summaryBody = [
            ['Employee Name', employeeDetails.employeeName],
            ["Father's Name", employeeDetails.fatherName],
            ['Employee Number', employeeDetails.employeeNo],
            ['CPS / GPF No.', employeeDetails.cpsGpfNo],
            ['PAN Number', employeeDetails.panNumber],
            ['Bank Account No.', employeeDetails.bankAccountNumber],
            ['Date of Birth', employeeDetails.dateOfBirth],
            ['Date of Joining (Service)', employeeDetails.dateOfJoining],
            ['Date of Joining (Office)', employeeDetails.dateOfJoiningInOffice],
            ['Date of Relief (Transfer)', employeeDetails.dateOfRelief || 'N/A'],
            ['Post at Joining', employeeDetails.joiningPost || 'N/A'],
            ['Date of Retirement', employeeDetails.retirementDate],
        ];

        employeeDetails.promotions.forEach((promo, i) => {
            summaryBody.push([`Promotion ${i+1} Post`, promo.post || 'N/A']);
            summaryBody.push([`Promotion ${i+1} Date`, promo.date || 'N/A']);
        });

        doc.setFontSize(12);
        doc.text('Employee Summary', 14, 32);
        doc.autoTable({
            startY: 36,
            body: summaryBody,
            theme: 'striped',
            styles: { fontSize: 8 },
        });

        // Pay Fixations
        let lastTableY = (doc as any).lastAutoTable.finalY + 10;
        if (fixation5thPC || fixation6thPC || fixation7thPC) {
            doc.text('Initial Pay Fixations', 14, lastTableY);
            const fixationBody = [];
            if(fixation5thPC) {
                fixationBody.push([`5th PC (01-01-1996)`, formatCurrencyForExport(fixation5thPC.basicPay1995), 'G.O.162 Formula', formatCurrencyForExport(fixation5thPC.totalPay), formatCurrencyForExport(fixation5thPC.initialRevisedPay)]);
            }
            if(fixation6thPC) {
                fixationBody.push([`6th PC (01-01-2006)`, formatCurrencyForExport(fixation6thPC.basicPay2005), 'x 1.86', `${formatCurrencyForExport(fixation6thPC.initialPayInPayBand)} (PIPB)`, `${formatCurrencyForExport(fixation6thPC.initialRevisedBasicPay)}`]);
            }
            if(fixation7thPC) {
                 fixationBody.push([`7th PC (01-01-2016)`, formatCurrencyForExport(fixation7thPC.oldBasicPay), 'x 2.57', formatCurrencyForExport(fixation7thPC.multipliedPay), `${formatCurrencyForExport(fixation7thPC.initialRevisedPay)} (Lvl ${fixation7thPC.level})`]);
            }
            doc.autoTable({
                startY: lastTableY + 4,
                head: [['Commission', 'Old Basic Pay', 'Factor', 'Intermediate Pay', 'New Basic Pay']],
                body: fixationBody,
                theme: 'grid',
                styles: { fontSize: 8 },
            });
        }

        // Yearly Calculations
        yearlyCalculations.forEach(yearData => {
            lastTableY = (doc as any).lastAutoTable.finalY + 10;
            doc.text(`Payroll for ${yearData.year}`, 14, lastTableY);
            const tableBody = yearData.periods.flatMap(p => [
              [p.period, formatCurrencyForExport(p.basicPay), `${formatCurrencyForExport(p.daAmount)} (${p.daRate}%)`, formatCurrencyForExport(p.hra), formatCurrencyForExport(p.grossPay)],
              p.remarks.length > 0 ? [{ content: `Note: ${p.remarks.join(' ')}`, colSpan: 5, styles: { fontStyle: 'italic', fontSize: 7 } }] : []
            ]);
            doc.autoTable({
                startY: lastTableY + 4,
                head: [['Period', 'Basic Pay', 'DA', 'HRA', 'Gross Pay']],
                body: tableBody as any,
                theme: 'striped',
                styles: { fontSize: 8 },
            });
        });

        doc.save(`Payroll_Report_${employeeDetails.employeeName.replace(' ', '_')}.pdf`);
    };

    const handleExportLPC = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { festivalAdvance, carAdvance, twoWheelerAdvance, computerAdvance, otherPayables } = employeeDetails;

        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text('LAST PAY CERTIFICATE', 105, 15, { align: 'center' });
        
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        const introText = `Certified that the following are the particulars of Pay and Allowances drawn by Thiru/Tmt. ${employeeDetails.employeeName}, ${employeeDetails.joiningPost}, who has been relieved from this office on the afternoon of ${employeeDetails.dateOfRelief} to join another post.`;
        const splitIntro = doc.splitTextToSize(introText, 180);
        doc.text(splitIntro, 14, 25);
        
        let lastY = 40;

        // Pay and Allowances drawn
        const lastYear = yearlyCalculations[yearlyCalculations.length - 1];
        const lastPeriod = lastYear.periods[lastYear.periods.length - 1];
        
        doc.setFont('times', 'bold');
        doc.text('1. Rate of Pay and Allowances Drawn:', 14, lastY + 10);
        // Fix: Explicitly type payBody as any[] to allow mixed types for jspdf-autotable.
        const payBody: any[] = [
            ['Basic Pay', formatCurrencyForExport(lastPeriod.basicPay)],
            ['Dearness Allowance', `${formatCurrencyForExport(lastPeriod.daAmount)} (${lastPeriod.daRate}%)`],
            ['House Rent Allowance', formatCurrencyForExport(lastPeriod.hra)],
            [{ content: 'Gross Pay', styles: { fontStyle: 'bold' } }, { content: formatCurrencyForExport(lastPeriod.grossPay), styles: { fontStyle: 'bold' } }],
        ];
        doc.autoTable({
            startY: lastY + 14,
            body: payBody,
            theme: 'striped',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
        });
        lastY = (doc as any).lastAutoTable.finalY;
        
        // Deductions/Advances
        doc.setFont('times', 'bold');
        doc.text('2. Outstanding Long Term Advances:', 14, lastY + 10);
        const advancesBody = [];
        if (festivalAdvance) advancesBody.push(['Festival Advance', formatCurrencyForExport(festivalAdvance)]);
        if (carAdvance) advancesBody.push(['Car Advance', formatCurrencyForExport(carAdvance)]);
        if (twoWheelerAdvance) advancesBody.push(['Two-Wheeler Advance', formatCurrencyForExport(twoWheelerAdvance)]);
        if (computerAdvance) advancesBody.push(['Computer Advance', formatCurrencyForExport(computerAdvance)]);
        if (otherPayables) advancesBody.push(['Other Payables / Dues', formatCurrencyForExport(otherPayables)]);
        
        if (advancesBody.length > 0) {
            doc.autoTable({
                startY: lastY + 14,
                head: [['Advance / Payable Type', 'Outstanding Amount']],
                body: advancesBody,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 2 },
            });
            lastY = (doc as any).lastAutoTable.finalY;
        } else {
            doc.setFont('times', 'normal');
            doc.text('NIL', 20, lastY + 20);
            lastY += 20;
        }

        const conclusionText = `He/She has been paid up to ${employeeDetails.dateOfRelief}. The details of deductions towards GPF/CPS, Professional Tax, and other subscriptions are recorded in his/her Service Book.`;
        const splitConclusion = doc.splitTextToSize(conclusionText, 180);
        doc.setFont('times', 'normal');
        doc.text(splitConclusion, 14, lastY + 15);
        
        doc.text('Signature of Drawing and Disbursing Officer', 195, lastY + 45, { align: 'right' });

        doc.save(`LPC_${employeeDetails.employeeName.replace(' ', '_')}.pdf`);
    };

    const handleExportExcel = () => {
      const wb = XLSX.utils.book_new();
      
      // Summary Sheet
      let summaryData = [
        ['Employee Name', employeeDetails.employeeName],
        ["Father's Name", employeeDetails.fatherName],
        ['Employee Number', employeeDetails.employeeNo],
        ['CPS / GPF No.', employeeDetails.cpsGpfNo],
        ['PAN Number', employeeDetails.panNumber],
        ['Bank Account No.', employeeDetails.bankAccountNumber],
        ['Date of Birth', employeeDetails.dateOfBirth],
        ['Date of Joining (Service)', employeeDetails.dateOfJoining],
        ['Date of Joining (Office)', employeeDetails.dateOfJoiningInOffice],
        ['Date of Relief (Transfer)', employeeDetails.dateOfRelief || 'N/A'],
        ['Post at Joining', employeeDetails.joiningPost || 'N/A'],
        ['Date of Retirement', employeeDetails.retirementDate],
      ];
      employeeDetails.promotions.forEach((promo, i) => {
            summaryData.push([`Promotion ${i+1} Post`, promo.post || 'N/A']);
            summaryData.push([`Promotion ${i+1} Date`, promo.date || 'N/A']);
      });

      const fixationHeader = [ [], ['Pay Fixation Details'], ['Commission', 'Old Basic Pay', 'Factor', 'Intermediate Pay', 'New Basic Pay']];
      const fixationData = [];
       if(fixation5thPC) {
            fixationData.push([`5th PC (01-01-1996)`, fixation5thPC.basicPay1995, 'G.O.162 Formula', fixation5thPC.totalPay, fixation5thPC.initialRevisedPay]);
       }
       if(fixation6thPC) {
            fixationData.push([`6th PC (01-01-2006)`, fixation6thPC.basicPay2005, 'x 1.86', `${fixation6thPC.initialPayInPayBand} (PIPB)`, fixation6thPC.initialRevisedBasicPay]);
        }
        if(fixation7thPC) {
            fixationData.push([`7th PC (01-01-2016)`, fixation7thPC.oldBasicPay, 'x 2.57', fixation7thPC.multipliedPay, `${fixation7thPC.initialRevisedPay} (Lvl ${fixation7thPC.level})`]);
        }
      
      const ws_summary = XLSX.utils.aoa_to_sheet([...summaryData, ...fixationHeader, ...fixationData]);
      XLSX.utils.book_append_sheet(wb, ws_summary, 'Summary');

      // Yearly Data
      const allPeriods = yearlyCalculations.flatMap(yearData => 
        yearData.periods.map(p => ({
          'Year': yearData.year,
          'Period': p.period,
          'Basic Pay': p.basicPay,
          'DA Rate (%)': p.daRate,
          'DA Amount': p.daAmount,
          'HRA': p.hra,
          'Gross Pay': p.grossPay,
          'Remarks': p.remarks.join(' '),
        }))
      );
      const ws_details = XLSX.utils.json_to_sheet(allPeriods);
      XLSX.utils.book_append_sheet(wb, ws_details, 'Detailed Payroll');


      XLSX.writeFile(wb, `Payroll_Report_${employeeDetails.employeeName.replace(' ', '_')}.xlsx`);
    };

    const handleExportWord = async () => {
        if (!window.htmlDocx || !window.saveAs) {
            alert("A required library (html-to-docx or FileSaver) failed to load. Please check your internet connection and try again.");
            console.error("`window.htmlDocx` or `window.saveAs` is not available. The scripts might have failed to load.");
            return;
        }

        let promotionHtml = employeeDetails.promotions.map((p,i) => `
            <tr><td>Promotion ${i+1} Post</td><td>${p.post || 'N/A'}</td></tr>
            <tr><td>Promotion ${i+1} Date</td><td>${p.date || 'N/A'}</td></tr>
        `).join('');

        let fixationHtml = '';
        if (fixation5thPC || fixation6thPC || fixation7thPC) {
            fixationHtml += `<h2>Initial Pay Fixations</h2>
          <table>
            <thead><tr><th>Commission</th><th>Old Basic Pay</th><th>Factor</th><th>Intermediate Pay</th><th>New Basic Pay</th></tr></thead>
            <tbody>`;
            if (fixation5thPC) {
                 fixationHtml += `<tr><td>5th PC (01-01-1996)</td><td>${formatCurrencyForExport(fixation5thPC.basicPay1995)}</td><td>G.O.162 Formula</td><td>${formatCurrencyForExport(fixation5thPC.totalPay)}</td><td>${formatCurrencyForExport(fixation5thPC.initialRevisedPay)}</td></tr>`;
            }
            if (fixation6thPC) {
                 fixationHtml += `<tr><td>6th PC (01-01-2006)</td><td>${formatCurrencyForExport(fixation6thPC.basicPay2005)}</td><td>x 1.86</td><td>${formatCurrencyForExport(fixation6thPC.initialPayInPayBand)} (PIPB)</td><td>${formatCurrencyForExport(fixation6thPC.initialRevisedBasicPay)}</td></tr>`;
            }
            if (fixation7thPC) {
                fixationHtml += `<tr><td>7th PC (01-01-2016)</td><td>${formatCurrencyForExport(fixation7thPC.oldBasicPay)}</td><td>x 2.57</td><td>${formatCurrencyForExport(fixation7thPC.multipliedPay)}</td><td>${formatCurrencyForExport(fixation7thPC.initialRevisedPay)} (Lvl ${fixation7thPC.level})</td></tr>`;
            }
            fixationHtml += '</tbody></table>';
        }

        let htmlString = `
          <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; }
            h1 { font-size: 16pt; }
            h2 { font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px;}
            table { border-collapse: collapse; width: 100%; font-size: 9pt; }
            th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
            th { background-color: #f2f2f2; }
            .summary-table td:first-child { font-weight: bold; width: 150px; }
          </style>
          <h1>Payroll Calculation Report</h1>
          <h2>Employee Summary</h2>
          <table class="summary-table">
            <tr><td>Employee Name</td><td>${employeeDetails.employeeName}</td></tr>
            <tr><td>Father's Name</td><td>${employeeDetails.fatherName}</td></tr>
            <tr><td>Employee Number</td><td>${employeeDetails.employeeNo}</td></tr>
            <tr><td>CPS / GPF No.</td><td>${employeeDetails.cpsGpfNo}</td></tr>
            <tr><td>PAN Number</td><td>${employeeDetails.panNumber}</td></tr>
            <tr><td>Bank Account No.</td><td>${employeeDetails.bankAccountNumber}</td></tr>
            <tr><td>Date of Birth</td><td>${employeeDetails.dateOfBirth}</td></tr>
            <tr><td>Date of Joining (Service)</td><td>${employeeDetails.dateOfJoining}</td></tr>
            <tr><td>Date of Joining (Office)</td><td>${employeeDetails.dateOfJoiningInOffice}</td></tr>
            <tr><td>Date of Relief (Transfer)</td><td>${employeeDetails.dateOfRelief || 'N/A'}</td></tr>
            <tr><td>Post at Joining</td><td>${employeeDetails.joiningPost || 'N/A'}</td></tr>
            <tr><td>Date of Retirement</td><td>${employeeDetails.retirementDate}</td></tr>
            ${promotionHtml}
          </table>
          ${fixationHtml}
        `;
        
        yearlyCalculations.forEach(yearData => {
            htmlString += `<h2>Payroll for ${yearData.year}</h2><table>
                <thead><tr><th>Period</th><th>Basic Pay</th><th>DA</th><th>HRA</th><th>Gross Pay</th><th>Remarks</th></tr></thead>
                <tbody>`;
            yearData.periods.forEach(p => {
                htmlString += `<tr>
                    <td>${p.period}</td>
                    <td>${formatCurrencyForExport(p.basicPay)}</td>
                    <td>${formatCurrencyForExport(p.daAmount)} (${p.daRate}%)</td>
                    <td>${formatCurrencyForExport(p.hra)}</td>
                    <td>${formatCurrencyForExport(p.grossPay)}</td>
                    <td>${p.remarks.join(' ')}</td>
                </tr>`;
            });
            htmlString += `</tbody></table>`;
        });
        
        const blob = await window.htmlDocx.asBlob(htmlString);
        window.saveAs(blob, `Payroll_Report_${employeeDetails.employeeName.replace(' ', '_')}.docx`);
    };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>{t('employeeSummary')}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {employeeDetails.dateOfRelief && (
                <Button onClick={handleExportLPC} size="sm" className="bg-green-600 hover:bg-green-700">{t('exportLPC')}</Button>
            )}
             <Button onClick={handleExportFixationPDF} variant="outline" size="sm"><FileCogIcon />{t('exportFixation')}</Button>
             <Button onClick={handleExportPDF} variant="outline" size="sm"><PdfIcon />{t('exportReportPDF')}</Button>
             <Button onClick={handleExportExcel} variant="outline" size="sm"><ExcelIcon />{t('exportExcel')}</Button>
             <Button onClick={handleExportWord} variant="outline" size="sm"><WordIcon />{t('exportWord')}</Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-sm">
            <div><p className="text-gray-500">{t('employeeName')}</p><p className="font-semibold">{employeeDetails.employeeName || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('fatherName')}</p><p className="font-semibold">{employeeDetails.fatherName || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('employeeNo')}</p><p className="font-semibold">{employeeDetails.employeeNo || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('cpsGpfNo')}</p><p className="font-semibold">{employeeDetails.cpsGpfNo || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('panNumber')}</p><p className="font-semibold">{employeeDetails.panNumber || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('bankAccountNumber')}</p><p className="font-semibold">{employeeDetails.bankAccountNumber || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('dateOfBirth')}</p><p className="font-semibold">{employeeDetails.dateOfBirth || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('dateOfJoiningService')}</p><p className="font-semibold">{employeeDetails.dateOfJoining || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('dateOfJoiningOffice')}</p><p className="font-semibold">{employeeDetails.dateOfJoiningInOffice || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('dateOfRelief')}</p><p className="font-semibold">{employeeDetails.dateOfRelief || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('postAtJoining')}</p><p className="font-semibold">{employeeDetails.joiningPost || 'N/A'}</p></div>
            <div><p className="text-gray-500">{t('calculatedRetirementDate')}</p><p className="font-semibold">{employeeDetails.retirementDate || 'N/A'}</p></div>
            {employeeDetails.selectionGradeDate && <div><p className="text-gray-500">{t('selectionGradeDate')}</p><p className="font-semibold">{employeeDetails.selectionGradeDate}</p></div>}
            {employeeDetails.specialGradeDate && <div><p className="text-gray-500">{t('specialGradeDate')}</p><p className="font-semibold">{employeeDetails.specialGradeDate}</p></div>}
            {employeeDetails.superGradeDate && <div><p className="text-gray-500">{t('superGradeDate')}</p><p className="font-semibold">{employeeDetails.superGradeDate}</p></div>}
            {employeeDetails.probationPeriod && <div><p className="text-gray-500">{t('probationPeriod')}</p><p className="font-semibold">{employeeDetails.probationPeriod} Year(s)</p></div>}
            {employeeDetails.probationDeclarationDate && <div><p className="text-gray-500">{t('probationDeclarationDate')}</p><p className="font-semibold">{employeeDetails.probationDeclarationDate}</p></div>}
            {employeeDetails.accountTestPassDate && <div><p className="text-gray-500">{t('accountTest')}</p><p className="font-semibold">{employeeDetails.accountTestPassDate}</p></div>}
            {employeeDetails.departmentTestPassDate && <div><p className="text-gray-500">{t('departmentTest')}</p><p className="font-semibold">{employeeDetails.departmentTestPassDate}</p></div>}
            {employeeDetails.stagnationIncrementDates && employeeDetails.stagnationIncrementDates.length > 0 && 
              <div className="col-span-full"><p className="text-gray-500">{t('stagnationIncrementDate')}</p><p className="font-semibold">{employeeDetails.stagnationIncrementDates.join(', ')}</p></div>
            }
            {employeeDetails.promotions.map((promo, index) => (
                <React.Fragment key={index}>
                    <div className="col-span-1">
                        <p className="text-gray-500">{t('promotions')} {index + 1}</p>
                        <p className="font-semibold">{promo.post || 'N/A'}</p>
                    </div>
                     <div className="col-span-2">
                           <p className="text-gray-500">{t('dateOfPromotion')}</p>
                           <p className="font-semibold">{promo.date}</p>
                    </div>
                </React.Fragment>
            ))}
        </CardContent>
      </Card>
      
      {promotionFixations && promotionFixations.length > 0 && (
          <PromotionFixationCard fixations={promotionFixations} />
      )}

      {appliedRevisions && appliedRevisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('payRevisionSummary')}</CardTitle>
            <CardDescription>{t('payRevisionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
              {appliedRevisions.map((rev, index) => (
                <li key={index}>
                  <span className="font-semibold">{rev.date.toLocaleDateString('en-GB', { timeZone: 'UTC' })}:</span> {rev.description}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PayProgressionChart yearlyCalculations={yearlyCalculations} />
        <CareerTimeline result={result} />
      </div>

      <YearlyPayrollAccordion yearlyCalculations={yearlyCalculations} />

      <Card className="mt-6 bg-gray-50 border-dashed">
        <CardContent className="p-4">
            <p className="text-xs text-center text-gray-600 italic">
                {t('complianceFootnote')}
            </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollResult;