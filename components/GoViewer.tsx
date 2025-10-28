import React from 'react';
import { GO_DATA } from '../constants';
import { GovernmentOrder } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { useLanguage } from './LanguageProvider';
import { ExcelIcon, JsonIcon } from './ui/Icons';

declare const XLSX: any;

const GoCard: React.FC<{ go: GovernmentOrder }> = ({ go }) => {
    const { t } = useLanguage();
    const categoryColors: {[key: string]: string} = {
        'Establishment': 'bg-blue-100 text-blue-800',
        'Technical': 'bg-green-100 text-green-800',
        'Service': 'bg-purple-100 text-purple-800',
    };
    
    const DetailRow: React.FC<{ label: string, en: string, ta: string }> = ({ label, en, ta }) => (
         <div className="py-2 grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
            <dt className="font-semibold text-gray-700 md:col-span-1">{label}</dt>
            <dd className="text-gray-600 md:col-span-3">
                <p>{en}</p>
                <p className="text-emerald-800">{ta}</p>
            </dd>
        </div>
    );

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="text-base font-bold text-gray-800">{go.department.en}</CardTitle>
                    <CardDescription className="text-emerald-700">{go.department.ta}</CardDescription>
                </div>
                 <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[go.category] || 'bg-gray-100 text-gray-800'}`}>
                    {go.category}
                </span>
            </CardHeader>
            <CardContent>
                <dl className="divide-y divide-gray-200">
                    <DetailRow label={t('goNumberAndDate')} en={go.goNumberAndDate.en} ta={go.goNumberAndDate.ta} />
                    <DetailRow label={t('subject')} en={go.subject.en} ta={go.subject.ta} />
                    <DetailRow label={t('keyPoints')} en={go.keyPoints.en} ta={go.keyPoints.ta} />
                    <div className="py-2 grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                        <dt className="font-semibold text-gray-700">{t('effectiveFrom')}</dt>
                        <dd className="text-gray-600 font-medium">{go.effectiveFrom}</dd>
                    </div>
                    <DetailRow label={t('remarks')} en={go.remarks.en} ta={go.remarks.ta} />
                </dl>
            </CardContent>
        </Card>
    );
};

const GoViewer: React.FC = () => {
  const { t } = useLanguage();

  const handleExportJson = () => {
    const jsonString = JSON.stringify(GO_DATA, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tn_go_summary.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const dataForExcel = GO_DATA.map(go => ({
        'Department (EN)': go.department.en,
        'Department (TA)': go.department.ta,
        'G.O. No & Date (EN)': go.goNumberAndDate.en,
        'G.O. No & Date (TA)': go.goNumberAndDate.ta,
        'Subject (EN)': go.subject.en,
        'Subject (TA)': go.subject.ta,
        'Key Points (EN)': go.keyPoints.en,
        'Key Points (TA)': go.keyPoints.ta,
        'Effective From': go.effectiveFrom,
        'Category': go.category,
        'Remarks (EN)': go.remarks.en,
        'Remarks (TA)': go.remarks.ta,
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TamilNadu_GOs');
    XLSX.writeFile(wb, 'tn_go_summary.xlsx');
  };

  return (
    <div>
        <Card className="mb-6">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>{t('goViewerTitle')}</CardTitle>
                    <CardDescription>{t('goViewerDescription')}</CardDescription>
                </div>
                 <div className="flex flex-wrap gap-2">
                    <Button onClick={handleExportJson} variant="outline" size="sm"><JsonIcon /> {t('exportJson')}</Button>
                    <Button onClick={handleExportExcel} variant="outline" size="sm"><ExcelIcon /> {t('exportExcel')}</Button>
                </div>
            </CardHeader>
        </Card>

      {GO_DATA.map(go => (
        <GoCard key={go.id} go={go} />
      ))}
    </div>
  );
};

export default GoViewer;
