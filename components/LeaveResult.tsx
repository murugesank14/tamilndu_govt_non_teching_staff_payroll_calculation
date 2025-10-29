import React from 'react';
import { LeaveResult as LeaveResultType } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { useLanguage } from './LanguageProvider';
import { Button } from './ui/Button';
import { ExcelIcon, PdfIcon } from './ui/Icons';

declare global {
    interface Window {
        jspdf: any;
    }
}
declare const XLSX: any;

interface LeaveResultProps {
  result: LeaveResultType;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const LeaveResult: React.FC<LeaveResultProps> = ({ result }) => {
  const { inputs, finalBalances, transactionLog } = result;
  const { t } = useLanguage();
  
  const handleExport = (format: 'pdf' | 'xlsx') => {
      const dataForExport = transactionLog.map(log => ({
          'Action': log.type.charAt(0).toUpperCase() + log.type.slice(1),
          'Details': log.description,
          'Amount': log.amount ? formatCurrency(log.amount) : 'N/A',
          'EL Balance': 0, // Will be filled progressively
          'HPL Balance': 0, // Will be filled progressively
      }));

      // Calculate running balance for export
      let runningEl = inputs.initialEl;
      let runningHpl = inputs.initialHpl;
      transactionLog.forEach((log, index) => {
          switch (log.type) {
              case 'avail':
                  if (log.leaveType === 'el') runningEl -= log.days ?? 0;
                  if (log.leaveType === 'hpl') runningHpl -= log.days ?? 0;
                  if (log.leaveType === 'commuted') runningHpl -= (log.days ?? 0) * 2;
                  break;
              case 'surrender':
                  runningEl -= log.days ?? 0;
                  break;
              case 'credit':
                  runningEl = Math.min(runningEl + 15, 300);
                  runningHpl += 10;
                  break;
          }
          dataForExport[index]['EL Balance'] = runningEl;
          dataForExport[index]['HPL Balance'] = runningHpl;
      });
      
      const summaryData = [
          ["", "EL", "HPL"],
          ["Initial Balance", inputs.initialEl, inputs.initialHpl],
          ["Final Balance", finalBalances.finalEl, finalBalances.finalHpl],
      ];

      if (format === 'pdf') {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text(t('leaveAccountSummary'), 14, 22);

          doc.autoTable({ startY: 30, head: [['', 'EL', 'HPL']], body: summaryData.slice(1), theme: 'striped' });
          const lastTableY = (doc as any).lastAutoTable.finalY + 10;
          doc.autoTable({ startY: lastTableY, head: [['Action', 'Details', 'Amount', 'EL Balance', 'HPL Balance']], body: dataForExport.map(Object.values), theme: 'grid' });
          
          doc.save(`Leave_Account_Summary.pdf`);
      } else { // XLSX
          const ws_summary = XLSX.utils.aoa_to_sheet([["Leave Balance Summary"], [], ...summaryData]);
          const ws_details = XLSX.utils.json_to_sheet(dataForExport);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws_summary, 'Summary');
          XLSX.utils.book_append_sheet(wb, ws_details, 'Transaction Log');
          XLSX.writeFile(wb, `Leave_Account_Summary.xlsx`);
      }
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>{t('leaveAccountSummary')}</CardTitle>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleExport('pdf')} variant="outline" size="sm"><PdfIcon />{t('exportLeaveSummary')} (PDF)</Button>
                <Button onClick={() => handleExport('xlsx')} variant="outline" size="sm"><ExcelIcon />{t('exportLeaveSummary')} (Excel)</Button>
            </div>
        </CardHeader>
        <CardContent>
            <table className="w-full text-sm text-center">
                <thead>
                    <tr className="border-b">
                        <th className="py-2"></th>
                        <th className="py-2 font-semibold text-gray-700">{t('el')}</th>
                        <th className="py-2 font-semibold text-gray-700">{t('hpl')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b">
                        <td className="py-2 text-left font-medium text-gray-600">{t('initialBalance')}</td>
                        <td className="py-2 text-lg font-medium">{inputs.initialEl}</td>
                        <td className="py-2 text-lg font-medium">{inputs.initialHpl}</td>
                    </tr>
                    <tr>
                        <td className="py-3 text-left font-bold text-lg text-emerald-700">{t('finalBalance')}</td>
                        <td className="py-3 text-2xl font-bold text-emerald-700">{finalBalances.finalEl}</td>
                        <td className="py-3 text-2xl font-bold text-emerald-700">{finalBalances.finalHpl}</td>
                    </tr>
                </tbody>
            </table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('leaveTransactionLog')}</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">{t('action')}</th>
                      <th scope="col" className="px-4 py-3">{t('details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionLog.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium capitalize w-1/4">{t(log.type === 'avail' ? 'availLeave' : log.type === 'surrender' ? 'surrenderLeave' : 'creditLeave')}</td>
                        <td className="px-4 py-4">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default LeaveResult;