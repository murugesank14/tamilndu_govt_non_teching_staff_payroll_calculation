import React from 'react';
import { GPFResult as GPFResultType } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { useLanguage } from './LanguageProvider';
import { ExcelIcon, PdfIcon } from './ui/Icons';

declare global {
    interface Window {
        jspdf: any;
    }
}
declare const XLSX: any;

interface GPFResultProps {
  result: GPFResultType;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const GPFResult: React.FC<GPFResultProps> = ({ result }) => {
  const { inputs, yearlyBreakdown, totals, closingBalance } = result;
  const { t } = useLanguage();
  
  const handleExport = (format: 'pdf' | 'xlsx') => {
      const dataForExport = yearlyBreakdown.map(row => ({
          'Month': row.month,
          'Opening Balance': row.opening,
          'Subscription': row.subscription,
          'Withdrawals': row.withdrawals,
          'Refunds': row.refunds,
          'Closing Balance (for Interest)': row.closingForInterest
      }));
      
      const summaryData = [
          ["Opening Balance", inputs.openingBalance],
          ["Total Subscriptions", totals.totalSubscriptions],
          ["Total Withdrawals", totals.totalWithdrawals],
          ["Total Refunds", totals.totalRefunds],
          ["Interest Earned", totals.totalInterest],
          ["Closing Balance", closingBalance]
      ];

      if (format === 'pdf') {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text(t('gpfStatementForYear', { year: inputs.financialYear }), 14, 22);

          doc.autoTable({
              startY: 30,
              head: [['Description', 'Amount']],
              body: summaryData.map(([label, value]) => [label, formatCurrency(value as number)]),
              theme: 'striped',
          });

          const lastTableY = (doc as any).lastAutoTable.finalY + 10;
          doc.autoTable({
              startY: lastTableY,
              head: [['Month', 'Opening', 'Subscription', 'Withdrawal', 'Refund', 'Closing']],
              body: dataForExport.map(d => Object.values(d)),
              theme: 'grid',
          });
          doc.save(`GPF_Statement_${inputs.financialYear}.pdf`);

      } else { // XLSX
          const ws_summary = XLSX.utils.aoa_to_sheet([["GPF Summary for", inputs.financialYear], [], ...summaryData]);
          const ws_details = XLSX.utils.json_to_sheet(dataForExport);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws_summary, 'Summary');
          XLSX.utils.book_append_sheet(wb, ws_details, 'Monthly Breakdown');
          XLSX.writeFile(wb, `GPF_Statement_${inputs.financialYear}.xlsx`);
      }
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{t('gpfStatementForYear', {year: inputs.financialYear})}</CardTitle>
            <CardDescription>{t('gpfStatementDesc')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleExport('pdf')} variant="outline" size="sm"><PdfIcon />{t('exportGpfStatement')} (PDF)</Button>
            <Button onClick={() => handleExport('xlsx')} variant="outline" size="sm"><ExcelIcon />{t('exportGpfStatement')} (Excel)</Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-sm">
            {/* FIX: Corrected translation key from 'openingBalance' to 'gpfOpeningBalance' */}
            <div><p className="text-gray-500">{t('gpfOpeningBalance')}</p><p className="font-semibold">{formatCurrency(inputs.openingBalance)}</p></div>
            <div><p className="text-gray-500">{t('totalSubscriptions')}</p><p className="font-semibold text-green-600">{formatCurrency(totals.totalSubscriptions)}</p></div>
            <div><p className="text-gray-500">{t('interestRate')}</p><p className="font-semibold">{inputs.interestRate}%</p></div>
            <div><p className="text-gray-500">{t('totalWithdrawals')}</p><p className="font-semibold text-red-600">{formatCurrency(totals.totalWithdrawals)}</p></div>
            <div><p className="text-gray-500">{t('totalRefunds')}</p><p className="font-semibold text-blue-600">{formatCurrency(totals.totalRefunds)}</p></div>
            <div><p className="text-gray-500">{t('interestEarned')}</p><p className="font-semibold text-purple-600">{formatCurrency(totals.totalInterest)}</p></div>
             <div className="col-span-full pt-4 border-t mt-2">
                 <p className="text-gray-600 font-semibold">{t('closingBalance')}</p>
                 <p className="font-extrabold text-2xl text-emerald-700">{formatCurrency(closingBalance)}</p>
             </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('gpfMonthlyBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">{t('month')}</th>
                      <th scope="col" className="px-4 py-3">{t('opening')}</th>
                      <th scope="col" className="px-4 py-3">{t('subscription')}</th>
                      <th scope="col" className="px-4 py-3">{t('withdrawal')}</th>
                      <th scope="col" className="px-4 py-3">{t('refund')}</th>
                      <th scope="col" className="px-4 py-3">{t('closing')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyBreakdown.map((row) => (
                      <tr key={row.month} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium">{row.month}</td>
                        <td className="px-4 py-4">{formatCurrency(row.opening)}</td>
                        <td className="px-4 py-4 text-green-600">{formatCurrency(row.subscription)}</td>
                        <td className="px-4 py-4 text-red-600">{formatCurrency(row.withdrawals)}</td>
                        <td className="px-4 py-4 text-blue-600">{formatCurrency(row.refunds)}</td>
                        <td className="px-4 py-4 font-bold">{formatCurrency(row.closingForInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-gray-50 border-dashed">
        <CardContent className="p-4">
            <p className="text-xs text-center text-gray-600 italic">
               Calculations as per GPF (TN) Rules. Interest is calculated on the sum of monthly closing balances. For official use, please verify all figures.
            </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GPFResult;