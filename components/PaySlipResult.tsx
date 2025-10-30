import React, { useMemo } from 'react';
import { PayrollResult, PaySlipDeduction } from '../types';
import { useLanguage } from './LanguageProvider';
import { Button } from './ui/Button';
// FIX: Import TranslationKey for correct type casting.
import { TranslationKey } from '../translations';

// Declare CDN libraries for TypeScript
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

interface PaySlipResultProps {
    payrollResult: PayrollResult;
}

const numberToWords = (num: number): string => {
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    if (num === 0) return 'Zero';
    if (num > 9999999) return 'Too Large';
    const numStr = num.toString();
    const [integerPart] = numStr.split('.');

    const inWords = (n: string): string => {
        let str = '';
        if (n.length > 7) str += inWords(n.slice(0, -7)) + ' crore ';
        n = n.slice(-7);
        if (n.length > 5) str += inWords(n.slice(0, -5)) + ' lakh ';
        n = n.slice(-5);
        if (n.length > 3) str += inWords(n.slice(0, -3)) + ' thousand ';
        n = n.slice(-3);
        if (n.length > 2) str += a[parseInt(n[0])] + ' hundred ';
        n = n.slice(-2);
        if (parseInt(n) > 0) {
            str += (str ? 'and ' : '');
            if (parseInt(n) < 20) str += a[parseInt(n)];
            else str += b[parseInt(n[0])] + (n[1] && a[parseInt(n[1])] ? ' ' + a[parseInt(n[1])] : '');
        }
        return str;
    };

    let words = inWords(integerPart);
    return words.replace(/\s+/g, ' ').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const PaySlipResult: React.FC<PaySlipResultProps> = ({ payrollResult }) => {
    const { t } = useLanguage();
    const lastYear = payrollResult.yearlyCalculations[payrollResult.yearlyCalculations.length - 1];
    const lastPeriod = lastYear.periods[lastYear.periods.length - 1];
    const { employeeDetails } = payrollResult;
    const { basicPay, daAmount, hra, grossPay } = lastPeriod;

    const deductions: PaySlipDeduction[] = useMemo(() => {
        const cps = Math.round((basicPay + daAmount) * 0.10);
        return [
            { name: 'CPS', nameTa: 'CPS', amount: cps, category: 'statutory' },
            { name: 'Family Benefit Fund', nameTa: 'குடும்ப நல நிதி', amount: 110, category: 'statutory' },
            { name: 'Special Provident Fund 2000', nameTa: 'சிறப்பு வருங்கால வைப்பு நிதி 2000', amount: 70, category: 'statutory' },
        ];
    }, [basicPay, daAmount]);

    const totalStatutory = deductions.filter(d => d.category === 'statutory').reduce((sum, d) => sum + d.amount, 0);
    const totalNonStatutory = deductions.filter(d => d.category === 'non-statutory').reduce((sum, d) => sum + d.amount, 0);
    const totalDeductions = totalStatutory + totalNonStatutory;
    const netPay = grossPay - totalDeductions;
    // FIX: Explicitly cast netPay to a number to resolve the TypeScript error.
    const netPayInWords = numberToWords(Number(netPay));
    
    // FIX: Parse year string to an integer for the Date constructor to avoid potential runtime errors.
    const slipDate = new Date(parseInt(lastPeriod.period.split(' ')[1], 10), ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(lastPeriod.period.split(' ')[0]));
    
    const handleDownloadPDF = () => {
        const { jsPDF } = window.jspdf;
        const input = document.getElementById('payslip-print-area');
        if (!input) return;

        window.html2canvas(input, { scale: 2 }).then((canvas: any) => { // Increased scale for better quality
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgWidth = pdfWidth - 20; // with margin
            const imgHeight = imgWidth / ratio;
            
            let finalHeight = imgHeight;
            let y = 10; // top margin
            if (imgHeight > pdfHeight - 20) { // check with margin
                finalHeight = pdfHeight - 20;
            }

            pdf.addImage(imgData, 'PNG', 10, y, imgWidth, finalHeight);
            
            // Add footer
            const today = new Date().toLocaleString();
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text(`Exported on: ${today}`, 10, pdfHeight - 10);
            
            const fileName = `PaySlip_${employeeDetails.employeeName.replace(/\s/g, '')}_${lastPeriod.period.replace(/\s/g, '')}.pdf`;
            pdf.save(fileName);
        });
    };

    return (
        <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg">
             <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #payslip-print-area, #payslip-print-area * { visibility: visible; }
                    #payslip-print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none; }
                }
            `}</style>
             <div className="flex justify-end gap-3 mb-4 no-print">
                <Button onClick={() => window.print()} variant="outline" size="sm">{t('printPaySlip')}</Button>
                <Button onClick={handleDownloadPDF} variant="default" size="sm">{t('exportPDF')}</Button>
            </div>
            <div id="payslip-print-area">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold">GOVERNMENT OF TAMIL NADU</h1>
                    <h2 className="text-lg font-semibold">{t('paySlipTitle')} - {lastPeriod.period}</h2>
                    <p className="text-lg font-semibold">({t('paySlipMonthTa', { month: lastPeriod.period })})</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6 border-y py-4">
                    {[
                        { en: 'employeeName', ta: 'பணியாளர் பெயர்', value: employeeDetails.employeeName },
                        { en: 'employeeNo', ta: 'பணியாளர் எண்', value: employeeDetails.employeeNo },
                        { en: 'post', ta: 'பதவி', value: employeeDetails.promotions[employeeDetails.promotions.length - 1]?.post || employeeDetails.joiningPost },
                        { en: 'officeName', ta: 'அலுவலகம்', value: 'ASSISTANT DIRECTOR OF LOCAL FUND AUDIT, SIVAGANGAI' },
                        { en: 'cpsGpfNo', ta: 'பொது வருங்கால வைப்பு நிதி எண் / பங்களிப்பு ஓய்வூதிய திட்ட எண்', value: employeeDetails.cpsGpfNo },
                        { en: 'regime', ta: 'வருமான வரி புதிய / பழைய நடைமுறை', value: 'New' },
                    ].map(item => (
                        <div key={item.en} className="grid grid-cols-2">
                            {/* FIX: Cast item.en to TranslationKey to match the expected type for the t function. */}
                            <span className="font-medium">{t(item.en as TranslationKey)} ({item.ta})</span>
                            <span>: {item.value}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-sm">
                    {/* Pay Details */}
                    <div className="md:col-span-5">
                        {/* FIX: Corrected invalid t function call by removing the second argument. */}
                        <h3 className="font-bold border-b pb-1 mb-2">{`1) ${t('payDetails')}`}</h3>
                        <table className="w-full">
                            <tbody>
                                <tr><td className="py-1">{t('dutyPay')}</td><td className="text-right font-mono">{basicPay.toLocaleString('en-IN')}</td></tr>
                                <tr><td className="py-1">{t('dearnessAllowance')}</td><td className="text-right font-mono">{daAmount.toLocaleString('en-IN')}</td></tr>
                                <tr><td className="py-1">{t('houseRentAllowance')}</td><td className="text-right font-mono">{hra.toLocaleString('en-IN')}</td></tr>
                                <tr><td className="py-1">{t('medicalAllowance')}</td><td className="text-right font-mono">300</td></tr>
                            </tbody>
                        </table>
                    </div>
                    {/* Statutory Deductions */}
                    <div className="md:col-span-4">
                         {/* FIX: Corrected invalid t function call by removing the second argument. */}
                         <h3 className="font-bold border-b pb-1 mb-2">{`2) ${t('statutoryDeductions')}`}</h3>
                         <table className="w-full">
                            <tbody>
                                {deductions.filter(d => d.category === 'statutory').map(d => (
                                     <tr key={d.name}><td className="py-1">{d.name}</td><td className="text-right font-mono">{d.amount.toLocaleString('en-IN')}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Non-Statutory Deductions */}
                     <div className="md:col-span-3">
                         {/* FIX: Corrected invalid t function call by removing the second argument. */}
                         <h3 className="font-bold border-b pb-1 mb-2">{`3) ${t('nonStatutoryDeductions')}`}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-sm font-bold mt-4 border-t pt-4">
                    {/* FIX: Corrected invalid t function call by removing the second argument. */}
                    <div className="md:col-span-5 flex justify-between"><span>{t('grossPay')}</span><span className="font-mono">{grossPay.toLocaleString('en-IN')}</span></div>
                    {/* FIX: Corrected invalid t function call by removing the second argument. */}
                    <div className="md:col-span-4 flex justify-between"><span>{t('totalSD')}</span><span className="font-mono">{totalStatutory.toLocaleString('en-IN')}</span></div>
                    {/* FIX: Corrected invalid t function call by removing the second argument. */}
                    <div className="md:col-span-3 flex justify-between"><span>{t('totalNSD')}</span><span className="font-mono">{totalNonStatutory.toLocaleString('en-IN')}</span></div>
                </div>

                 <div className="mt-4 border-t pt-4 text-sm">
                    <div className="grid grid-cols-3">
                         {/* FIX: Corrected invalid t function call by removing the second argument. */}
                         <div className="col-span-1 font-bold">{t('netPayCredited')} (1-2-3)</div>
                         <div className="col-span-2 text-right font-bold text-lg font-mono">{netPay.toLocaleString('en-IN')} ({netPayInWords} Only)</div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm my-6 border-y py-4">
                    {[
                        { en: 'panNumber', ta: '', value: employeeDetails.panNumber },
                        { en: 'tokenNumber', ta: '', value: '1301005225090003 / ' + new Date(slipDate.getFullYear(), slipDate.getMonth(), 24).toLocaleDateString('en-GB') },
                        { en: 'bankName', ta: '', value: 'STATE BANK OF INDIA' },
                        { en: 'settlementDate', ta: '', value: new Date(slipDate.getFullYear(), slipDate.getMonth() + 1, 0).toLocaleDateString('en-GB') },
                        { en: 'ifsc', ta: '', value: 'SBIN0000855' },
                        { en: 'accountNumber', ta: '', value: employeeDetails.bankAccountNumber },
                    ].map(item => (
                        <div key={item.en} className="grid grid-cols-2">
                            <span className="font-medium">{t(item.en as TranslationKey)}</span>
                            <span>: {item.value}</span>
                        </div>
                    ))}
                </div>

                <div className="text-center text-xs text-gray-500 mt-6">
                    <p>ASSISTANT DIRECTOR OF LOCAL FUND AUDIT, SIVAGANGAI</p>
                    <p className="italic mt-2">{t('systemGenerated')}</p>
                </div>
            </div>
        </div>
    );
};

export default PaySlipResult;