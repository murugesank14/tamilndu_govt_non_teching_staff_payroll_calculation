import React, { useState, useMemo } from 'react';
import { AuditPara } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { useLanguage } from './LanguageProvider';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TrashIcon } from './ui/Icons';

interface AuditParaResultProps {
  paras: AuditPara[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const AuditParaResult: React.FC<AuditParaResultProps> = ({ paras, onEdit, onDelete }) => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState({ year: '', auditType: '', complianceStatus: '', searchQuery: '' });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredParas = useMemo(() => {
      return paras.filter(p => {
          const searchLower = filters.searchQuery.toLowerCase();
          const matchesSearch = filters.searchQuery === '' ||
              p.paraNumber.toLowerCase().includes(searchLower) ||
              p.subject.toLowerCase().includes(searchLower) ||
              p.officerResponsible.toLowerCase().includes(searchLower);
          
          return matchesSearch &&
                 (filters.year === '' || p.year === filters.year) &&
                 (filters.auditType === '' || p.auditType === filters.auditType) &&
                 (filters.complianceStatus === '' || p.complianceStatus === filters.complianceStatus);
      }).sort((a, b) => Number(a.year) - Number(b.year) || a.paraNumber.localeCompare(b.paraNumber));
  }, [paras, filters]);

  const summary = useMemo(() => {
    const totalAmount = paras.reduce((sum, p) => sum + p.recoveryAmount, 0);
    const pendingAmount = paras.reduce((sum, p) => sum + (p.recoveryAmount - p.recoveryProgress), 0);
    return { totalParas: paras.length, totalAmount, pendingAmount };
  }, [paras]);
  
  const getStatusBadgeClass = (para: AuditPara) => {
      if (para.complianceStatus === 'Dropped' || para.recoveryProgress >= para.recoveryAmount) {
          return 'bg-green-100 text-green-800'; // Green
      }
      if (para.complianceStatus === 'Submitted' || para.recoveryProgress > 0) {
          return 'bg-yellow-100 text-yellow-800'; // Yellow
      }
      return 'bg-red-100 text-red-800'; // Red
  };

  const handleSetReminder = (paraNumber: string) => {
    alert(t('reminderSet', { paraNo: paraNumber }));
  };

  const handleDelete = (para: AuditPara) => {
      if (window.confirm(t('deleteConfirmation', { paraNo: para.paraNumber }))) {
          onDelete(para.id);
      }
  };

  const uniqueYears = [...new Set(paras.map(p => p.year))].sort((a,b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
       <Card>
            <CardHeader>
                <CardTitle>{t('auditDashboardTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">{t('totalParas')}</p>
                    <p className="text-3xl font-bold text-blue-900">{summary.totalParas}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 font-medium">{t('totalRecoveryAmount')}</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">{t('totalPendingAmount')}</p>
                    <p className="text-3xl font-bold text-red-900">{formatCurrency(summary.pendingAmount)}</p>
                </div>
            </CardContent>
       </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <Input type="search" name="searchQuery" placeholder="Search para no, subject..." value={filters.searchQuery} onChange={handleFilterChange} />
              <Select name="year" value={filters.year} onChange={handleFilterChange}>
                  <option value="">{t('allYears')}</option>
                  {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
              <Select name="auditType" value={filters.auditType} onChange={handleFilterChange}>
                  <option value="">All Audit Types</option>
                  <option value="Local Fund">Local Fund</option>
                  <option value="AG">AG Audit</option>
                  <option value="Internal">Internal Audit</option>
              </Select>
              <Select name="complianceStatus" value={filters.complianceStatus} onChange={handleFilterChange}>
                  <option value="">{t('allStatus')}</option>
                  <option value="Not Submitted">Not Submitted</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Dropped">Dropped</option>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">{t('paraNumber')}</th>
                      <th scope="col" className="px-4 py-3">{t('paraSubject')}</th>
                      <th scope="col" className="px-4 py-3">{t('recoveryAmount')}</th>
                      <th scope="col" className="px-4 py-3">{t('recoveryProgress')}</th>
                      <th scope="col" className="px-4 py-3">{t('status')}</th>
                      <th scope="col" className="px-4 py-3">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParas.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">No audit paras match the current filters.</td></tr>
                    )}
                    {filteredParas.map((para) => (
                      <tr key={para.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium">{para.paraNumber} ({para.year})</td>
                        <td className="px-4 py-4 max-w-xs truncate">{para.subject}</td>
                        <td className="px-4 py-4">{formatCurrency(para.recoveryAmount)}</td>
                        <td className="px-4 py-4">{formatCurrency(para.recoveryProgress)}</td>
                        <td className="px-4 py-4">
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(para)}`}>
                                {para.complianceStatus}
                           </span>
                        </td>
                        <td className="px-4 py-4 flex items-center gap-2">
                            <Button onClick={() => onEdit(para.id)} variant="outline" size="sm">{t('edit')}</Button>
                            <Button onClick={() => handleSetReminder(para.paraNumber)} variant="ghost" size="sm">{t('setReminder')}</Button>
                            <Button onClick={() => handleDelete(para)} variant="icon" size="icon" className="text-red-600 hover:bg-red-50"><TrashIcon /></Button>
                        </td>
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

export default AuditParaResult;