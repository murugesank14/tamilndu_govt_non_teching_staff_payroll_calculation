import React, { useMemo } from 'react';
import { LeaveResult as LeaveResultType, LeaveTransaction } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { useLanguage } from './LanguageProvider';
import { Button } from './ui/Button';
import { ExcelIcon, PdfIcon } from './ui/Icons';

declare global {
    interface Window {
        jspdf: any;
    }
}
declare const XLSX: any;

interface LeaveBalanceResultProps {
  leaveResult: LeaveResultType;
}

const LeaveBalanceResult: React.FC<LeaveBalanceResultProps> = ({ leaveResult }) => {
  const { inputs, finalBalances, transactionLog } = leaveResult;
  const { t } = useLanguage();

  const yearlySummary = useMemo(() => {
    const elCredited = transactionLog.filter(t => t.type === 'credit').length * 15;
    const hplCredited = transactionLog.filter(t => t.type === 'credit').length * 10;
    
    const elAvailed = transactionLog.filter(t => t.type === 'avail' && t.leaveType === 'el').reduce((sum, t) => sum + (t.days ?? 0), 0);
    const elSurrendered = transactionLog.filter(t => t.type === 'surrender').reduce((sum, t) => sum + (t.days ?? 0), 0);
    
    const hplAvailed = transactionLog.filter(t => t.type === 'avail' && t.leaveType === 'hpl').reduce((sum, t) => sum + (t.days ?? 0), 0);
    const commutedAvailedHpl = transactionLog.filter(t => t.type === 'avail' && t.leaveType === 'commuted').reduce((sum, t) => sum + ((t.days ?? 0) * 2), 0);
    
    return [
      {
        category: t('earnedLeave'),
        opening: inputs.initialEl,
        credited: elCredited,
        availed: elAvailed + elSurrendered,
        closing: finalBalances.finalEl,
      },
      {
        category: t('halfPayLeave'),
        opening: inputs.initialHpl,
        credited: hplCredited,
        availed: hplAvailed + commutedAvailedHpl,
        closing: finalBalances.finalHpl,
      },
       { category: t('unearnedLeavePrivate'), opening: 0, credited: 0, availed: 0, closing: 0 },
       { category: t('unearnedLeaveMedical'), opening: 0, credited: 0, availed: 0, closing: 0 },
       { category: t('specialCasualLeave'), opening: 0, credited: 0, availed: 0, closing: 0 },
       { category: t('compensatoryLeave'), opening: 0, credited: 0, availed: 0, closing: 0 },
    ];
  }, [leaveResult, t]);
  
  const handleExport = (format: 'pdf' | 'xlsx') => {
      // FIX: Use the new, non-conflicting translation key 'leaveOpeningBalance'.
      const headers = [t('leaveCategory'), t('leaveOpeningBalance'), t('credited'), t('availedDuringYear'), t('balanceAtYearEnd')];
      const body = yearlySummary.map(row => Object.values(row));

      if (format === 'pdf') {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text(t('yearlyLeaveBalanceTitle'), 14, 22);

          doc.autoTable({ startY: 30, head: [headers], body, theme: 'grid' });
          doc.save(`Yearly_Leave_Balance.pdf`);
      } else { // XLSX
          const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Leave Balance');
          XLSX.writeFile(wb, `Yearly_Leave_Balance.xlsx`);
      }
  }


  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>{t('yearlyLeaveBalanceTitle')}</CardTitle>
            <CardDescription>{t('yearlyLeaveBalanceDesc')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleExport('pdf')} variant="outline" size="sm"><PdfIcon />{t('exportLeaveBalance')} (PDF)</Button>
            <Button onClick={() => handleExport('xlsx')} variant="outline" size="sm"><ExcelIcon />{t('exportLeaveBalance')} (Excel)</Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">{t('leaveCategory')}</th>
                      <th scope="col" className="px-4 py-3 text-center">{t('leaveOpeningBalance')}</th>
                      <th scope="col" className="px-4 py-3 text-center">{t('credited')}</th>
                      <th scope="col" className="px-4 py-3 text-center">{t('availedDuringYear')}</th>
                      <th scope="col" className="px-4 py-3 text-center">{t('balanceAtYearEnd')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlySummary.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium">{row.category}</td>
                        <td className="px-4 py-4 text-center font-mono">{row.opening}</td>
                        <td className="px-4 py-4 text-center font-mono text-green-600">+{row.credited}</td>
                        <td className="px-4 py-4 text-center font-mono text-red-600">-{row.availed}</td>
                        <td className="px-4 py-4 text-center font-mono text-lg font-bold text-blue-700">{row.closing}</td>
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

export default LeaveBalanceResult;