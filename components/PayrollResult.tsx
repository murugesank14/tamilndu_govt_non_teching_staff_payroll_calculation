import React from 'react';
import { PayrollResult as PayrollResultType } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { PayProgressionChart } from './PayProgressionChart';
import { CareerTimeline } from './CareerTimeline';

// Declare global variables from CDN scripts to satisfy TypeScript
declare global {
    interface Window {
        jspdf: any;
        htmlDocx: any;
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


const PayrollResult: React.FC<PayrollResultProps> = ({ result }) => {
  const { employeeDetails, fixation6thPC, fixation7thPC, yearlyCalculations } = result;

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
            ['Date of Birth', employeeDetails.dateOfBirth],
            ['Date of Joining (Service)', employeeDetails.dateOfJoining],
            ['Date of Joining (Office)', employeeDetails.dateOfJoiningInOffice],
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
        if (fixation6thPC || fixation7thPC) {
            doc.text('Initial Pay Fixations', 14, lastTableY);
            const fixationBody = [];
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
                body: tableBody,
                theme: 'striped',
                styles: { fontSize: 8 },
            });
        });

        doc.save(`Payroll_Report_${employeeDetails.employeeName.replace(' ', '_')}.pdf`);
    };

    const handleExportExcel = () => {
      const wb = XLSX.utils.book_new();
      
      // Summary Sheet
      let summaryData = [
        ['Employee Name', employeeDetails.employeeName],
        ["Father's Name", employeeDetails.fatherName],
        ['Employee Number', employeeDetails.employeeNo],
        ['CPS / GPF No.', employeeDetails.cpsGpfNo],
        ['Date of Birth', employeeDetails.dateOfBirth],
        ['Date of Joining (Service)', employeeDetails.dateOfJoining],
        ['Date of Joining (Office)', employeeDetails.dateOfJoiningInOffice],
        ['Post at Joining', employeeDetails.joiningPost || 'N/A'],
        ['Date of Retirement', employeeDetails.retirementDate],
      ];
      employeeDetails.promotions.forEach((promo, i) => {
            summaryData.push([`Promotion ${i+1} Post`, promo.post || 'N/A']);
            summaryData.push([`Promotion ${i+1} Date`, promo.date || 'N/A']);
      });

      const fixationHeader = [ [], ['Pay Fixation Details'], ['Commission', 'Old Basic Pay', 'Factor', 'Intermediate Pay', 'New Basic Pay']];
      const fixationData = [];
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
        if (!window.htmlDocx) {
            alert("The Word export library failed to load. Please check your internet connection and try again.");
            console.error("`window.htmlDocx` is not available. The html-to-docx script might have failed to load.");
            return;
        }

        let promotionHtml = employeeDetails.promotions.map((p,i) => `
            <tr><td>Promotion ${i+1} Post</td><td>${p.post || 'N/A'}</td></tr>
            <tr><td>Promotion ${i+1} Date</td><td>${p.date || 'N/A'}</td></tr>
        `).join('');

        let fixationHtml = '';
        if (fixation6thPC || fixation7thPC) {
            fixationHtml += `<h2>Initial Pay Fixations</h2>
          <table>
            <thead><tr><th>Commission</th><th>Old Basic Pay</th><th>Factor</th><th>Intermediate Pay</th><th>New Basic Pay</th></tr></thead>
            <tbody>`;
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
            <tr><td>Date of Birth</td><td>${employeeDetails.dateOfBirth}</td></tr>
            <tr><td>Date of Joining (Service)</td><td>${employeeDetails.dateOfJoining}</td></tr>
            <tr><td>Date of Joining (Office)</td><td>${employeeDetails.dateOfJoiningInOffice}</td></tr>
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
                    <td>${formatCurrencyForExport(p.basic_pay)}</td>
                    <td>${formatCurrencyForExport(p.daAmount)} (${p.daRate}%)</td>
                    <td>${formatCurrencyForExport(p.hra)}</td>
                    <td>${formatCurrencyForExport(p.grossPay)}</td>
                    <td>${p.remarks.join(' ')}</td>
                </tr>`;
            });
            htmlString += `</tbody></table>`;
        });
        
        const blob = await window.htmlDocx.asBlob(htmlString);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Payroll_Report_${employeeDetails.employeeName.replace(' ', '_')}.docx`;
        a.click();
        URL.revokeObjectURL(url);
    };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employee Summary</CardTitle>
          <div className="flex space-x-2">
            <Button onClick={handleExportPDF} className="text-xs py-1 px-2">PDF</Button>
            <Button onClick={handleExportExcel} className="text-xs py-1 px-2">Excel</Button>
            <Button onClick={handleExportWord} className="text-xs py-1 px-2">Word</Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-sm">
            <div><p className="text-gray-500">Employee Name</p><p className="font-semibold">{employeeDetails.employeeName || 'N/A'}</p></div>
            <div><p className="text-gray-500">Father's Name</p><p className="font-semibold">{employeeDetails.fatherName || 'N/A'}</p></div>
            <div><p className="text-gray-500">Employee Number</p><p className="font-semibold">{employeeDetails.employeeNo || 'N/A'}</p></div>
            <div><p className="text-gray-500">CPS / GPF No.</p><p className="font-semibold">{employeeDetails.cpsGpfNo || 'N/A'}</p></div>
            <div><p className="text-gray-500">Date of Birth</p><p className="font-semibold">{employeeDetails.dateOfBirth || 'N/A'}</p></div>
            <div><p className="text-gray-500">Date of Joining (Service)</p><p className="font-semibold">{employeeDetails.dateOfJoining || 'N/A'}</p></div>
            <div><p className="text-gray-500">Date of Joining (Office)</p><p className="font-semibold">{employeeDetails.dateOfJoiningInOffice || 'N/A'}</p></div>
            <div><p className="text-gray-500">Post at Joining</p><p className="font-semibold">{employeeDetails.joiningPost || 'N/A'}</p></div>
            <div><p className="text-gray-500">Date of Retirement</p><p className="font-semibold">{employeeDetails.retirementDate || 'N/A'}</p></div>
            {employeeDetails.promotions.map((promo, index) => (
                <React.Fragment key={index}>
                    <div className="col-span-1">
                        <p className="text-gray-500">Promotion {index + 1} Post</p>
                        <p className="font-semibold">{promo.post || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-gray-500">Promotion {index + 1} Date</p>
                        <p className="font-semibold">{promo.date}</p>
                    </div>
                </React.Fragment>
            ))}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PayProgressionChart yearlyCalculations={yearlyCalculations} />
        <CareerTimeline result={result} />
      </div>

      {(fixation6thPC || fixation7thPC) && (
        <Card>
          <CardHeader><CardTitle>Initial Pay Fixations</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {fixation6thPC && (
              <div>
                  <h4 className="font-semibold text-md text-gray-600 mb-3 border-b pb-2">6th Pay Commission Fixation</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-gray-500">Old Basic Pay</p><p className="font-semibold text-lg">{formatCurrency(fixation6thPC.basicPay2005)}</p></div>
                    <div><p className="text-gray-500">x 1.86 Factor</p><p className="font-semibold text-lg">{formatCurrency(fixation6thPC.multipliedPay)}</p></div>
                    <div><p className="text-gray-500">Pay in Pay Band</p><p className="font-semibold text-lg">{formatCurrency(fixation6thPC.initialPayInPayBand)}</p></div>
                    <div><p className="text-gray-500">Revised Basic Pay</p><p className="font-semibold text-lg text-green-600">{formatCurrency(fixation6thPC.initialRevisedBasicPay)}</p><p className="text-xs text-gray-500"> (PIPB + {formatCurrency(fixation6thPC.initialGradePay)} GP)</p></div>
                  </div>
              </div>
            )}
            {fixation7thPC && (
              <div>
                  <h4 className="font-semibold text-md text-gray-600 mb-3 border-b pb-2">7th Pay Commission Fixation</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-gray-500">Old Basic Pay</p><p className="font-semibold text-lg">{formatCurrency(fixation7thPC.oldBasicPay)}</p></div>
                    <div><p className="text-gray-500">x 2.57 Fitment</p><p className="font-semibold text-lg">{formatCurrency(fixation7thPC.multipliedPay)}</p></div>
                    <div><p className="text-gray-500">New Pay Level</p><p className="font-semibold text-lg">{fixation7thPC.level}</p></div>
                    <div><p className="text-gray-500">Revised Basic Pay</p><p className="font-semibold text-lg text-green-600">{formatCurrency(fixation7thPC.initialRevisedPay)}</p></div>
                  </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {yearlyCalculations.map(yearData => (
          <Card key={yearData.year}>
            <CardHeader><CardTitle>Payroll for {yearData.year}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Period</th>
                      <th scope="col" className="px-4 py-3">Basic Pay</th>
                      <th scope="col" className="px-4 py-3">DA</th>
                      <th scope="col" className="px-4 py-3">HRA</th>
                      <th scope="col" className="px-4 py-3">Gross Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearData.periods.map((period, index) => (
                      <React.Fragment key={index}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium">{period.period}</td>
                        <td className="px-4 py-4">
                          {formatCurrency(period.basicPay)}
                           {period.payInPayBand != null && <p className="text-xs text-gray-500">({formatCurrency(period.payInPayBand)} + {formatCurrency(period.gradePay || 0)} GP)</p>}
                        </td>
                        <td className="px-4 py-4">{formatCurrency(period.daAmount)} ({period.daRate}%)</td>
                        <td className="px-4 py-4">{formatCurrency(period.hra)}</td>
                        <td className="px-4 py-4 font-bold text-blue-600">{formatCurrency(period.grossPay)}</td>
                      </tr>
                      {period.remarks && period.remarks.length > 0 && (
                        <tr className="bg-blue-50/70 text-blue-800 text-xs">
                           <td colSpan={5} className="px-4 py-1 italic">
                               <span className="font-semibold">Note:</span> {period.remarks.join(' ')}
                           </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PayrollResult;