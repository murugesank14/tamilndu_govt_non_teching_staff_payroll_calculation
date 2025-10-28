import React, { useRef } from 'react';
import { GovernmentOrder } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { useLanguage } from './LanguageProvider';
import { ExcelIcon, FileUploadIcon, JsonIcon } from './ui/Icons';

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

// Helper to parse the simplified format from user's JSON prompt
const parseSimplifiedGo = (data: any): GovernmentOrder[] => {
    const newOrders: GovernmentOrder[] = [];
    if (data && data.goNumber && data.daSchedule && Array.isArray(data.daSchedule)) {
        data.daSchedule.forEach((daRule: any) => {
            if (daRule.date && daRule.daPercent !== undefined) {
                // date format can be DD-MM-YYYY or YYYY-MM-DD
                const dateParts = daRule.date.split(/[-/]/);
                let effectiveFrom = '';
                if (dateParts[0].length === 4) { // YYYY-MM-DD
                    effectiveFrom = daRule.date;
                } else { // DD-MM-YYYY
                    effectiveFrom = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                }

                const newOrder: GovernmentOrder = {
                    id: `user-loaded-${data.goNumber}-${daRule.date}`,
                    department: { en: 'Finance Dept', ta: 'நிதித் துறை' },
                    goNumberAndDate: { en: `${data.goNumber}, ${data.goDate}`, ta: `${data.goNumber}, ${data.goDate}` },
                    subject: { en: `${data.description} - DA Revision to ${daRule.daPercent}%`, ta: `அகவிலைப்படி ${daRule.daPercent}% ஆக உயர்வு` },
                    keyPoints: { en: `DA revised to ${daRule.daPercent}%`, ta: `அ.ப. ${daRule.daPercent}% ஆக திருத்தம்` },
                    effectiveFrom: effectiveFrom,
                    category: 'Establishment',
                    remarks: { en: `Loaded from user file. Original G.O.: ${data.description}`, ta: 'பயனர் கோப்பிலிருந்து ஏற்றப்பட்டது.' },
                    rule: { type: 'DA_REVISION', rate: daRule.daPercent, commission: 7 }
                };
                newOrders.push(newOrder);
            }
        });
    }
    // Could add more parsing logic for other rule types here
    return newOrders;
};


interface GoViewerProps {
    goData: GovernmentOrder[];
    onGoDataUpdate: (newGoData: GovernmentOrder[]) => void;
}

const GoViewer: React.FC<GoViewerProps> = ({ goData, onGoDataUpdate }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    const jsonString = JSON.stringify(goData, null, 2);
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
    const dataForExcel = goData.map(go => ({
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error('Failed to read file.');
            const jsonData = JSON.parse(text);

            const newOrders = parseSimplifiedGo(jsonData);

            if (newOrders.length > 0) {
                // Prevent duplicates by checking ID
                const existingIds = new Set(goData.map(g => g.id));
                const uniqueNewOrders = newOrders.filter(o => !existingIds.has(o.id));

                if (uniqueNewOrders.length > 0) {
                    onGoDataUpdate([...goData, ...uniqueNewOrders]);
                    alert(`${uniqueNewOrders.length} new G.O. rule(s) loaded successfully! They are now active for calculations.`);
                } else {
                    alert('No new G.O. rules found in the file, or they have already been loaded.');
                }
            } else {
               throw new Error('JSON file is not in a recognized G.O. format.');
            }

        } catch (error) {
            console.error("Error parsing G.O. file:", error);
            alert(`Failed to load G.O. file. Please ensure it's a valid JSON in the correct format. Error: ${(error as Error).message}`);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.readAsText(file);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
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
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
                    <Button onClick={handleLoadClick} variant="outline" size="sm"><FileUploadIcon /> {t('loadGoFile')}</Button>
                    <Button onClick={handleExportJson} variant="outline" size="sm"><JsonIcon /> {t('exportJson')}</Button>
                    <Button onClick={handleExportExcel} variant="outline" size="sm"><ExcelIcon /> {t('exportExcel')}</Button>
                </div>
            </CardHeader>
        </Card>

      {goData.map(go => (
        <GoCard key={go.id} go={go} />
      ))}
    </div>
  );
};

export default GoViewer;