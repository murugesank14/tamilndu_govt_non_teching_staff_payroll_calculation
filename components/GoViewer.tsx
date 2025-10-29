import React, { useRef, useState, useMemo } from 'react';
import { GovernmentOrder } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { useLanguage } from './LanguageProvider';
import { CsvIcon, ExcelIcon, FileUploadIcon, JsonIcon, PdfIcon } from './ui/Icons';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { HeroIcon } from './ui/HeroIcon';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/Accordion';
import { Notification } from './ui/Notification';


declare const XLSX: any;
declare global {
    interface Window {
        jspdf: any;
    }
}

type ViewMode = 'bilingual' | 'en' | 'ta';

const GoCard: React.FC<{ go: GovernmentOrder; viewMode: ViewMode }> = ({ go, viewMode }) => {
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
                {viewMode !== 'ta' && <p>{en}</p>}
                {viewMode !== 'en' && <p className="text-emerald-800">{ta}</p>}
            </dd>
        </div>
    );

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row justify-between items-start">
                 <div className="flex items-center space-x-3">
                    <HeroIcon />
                    <div>
                        <CardTitle className="text-base font-bold text-gray-800">
                           {viewMode !== 'ta' && go.department.en}
                           {viewMode === 'ta' && go.department.ta}
                        </CardTitle>
                        {viewMode === 'bilingual' && <CardDescription className="text-emerald-700">{go.department.ta}</CardDescription>}
                    </div>
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

// Helper to parse simplified/varied formats from user's JSON prompt
const parseGoFile = (data: any): GovernmentOrder[] => {
    const newOrders: GovernmentOrder[] = [];

    const normalizeDate = (dateStr: string): string => {
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts[0].length === 4) return dateStr; // YYYY-MM-DD
        return `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY -> YYYY-MM-DD
    };

    if (data && data.goNumber) {
        // Type 1: DA Schedule
        if (data.daSchedule && Array.isArray(data.daSchedule)) {
            data.daSchedule.forEach((daRule: any) => {
                if (daRule.date && daRule.daPercent !== undefined) {
                    const id = `user-loaded-${data.goNumber}-${daRule.date}`;
                    const effectiveFrom = normalizeDate(daRule.date);
                    newOrders.push({
                        id, department: { en: 'Finance Dept', ta: 'நிதித் துறை' },
                        goNumberAndDate: { en: `${data.goNumber}, ${data.goDate}`, ta: `${data.goNumber}, ${data.goDate}` },
                        subject: { en: `${data.description} - DA Revision to ${daRule.daPercent}%`, ta: `அகவிலைப்படி ${daRule.daPercent}% ஆக உயர்வு` },
                        keyPoints: { en: `DA revised to ${daRule.daPercent}%`, ta: `அ.ப. ${daRule.daPercent}% ஆக திருத்தம்` },
                        effectiveFrom, category: 'Establishment',
                        remarks: { en: `Loaded from user file.`, ta: 'பயனர் கோப்பிலிருந்து ஏற்றப்பட்டது.' },
                        rule: { type: 'DA_REVISION', rate: daRule.daPercent, commission: 7 }
                    });
                }
            });
        }
        // Type 2: Pay Commission
        else if (data.fitmentFactor) {
             const id = `user-loaded-${data.goNumber}-${data.effectiveFrom}`;
             newOrders.push({
                id, department: { en: 'Finance Dept', ta: 'நிதித் துறை' },
                goNumberAndDate: { en: `${data.goNumber}, ${data.goDate}`, ta: `${data.goNumber}, ${data.goDate}` },
                subject: { en: data.description, ta: 'ஊதிய விகித திருத்தம்' },
                keyPoints: { en: `Pay fixed using fitment factor ${data.fitmentFactor}`, ta: `பொருத்துதல் காரணி ${data.fitmentFactor} மூலம் ஊதியம் நிர்ணயிக்கப்பட்டது` },
                effectiveFrom: normalizeDate(data.effectiveFrom),
                category: data.category || 'Establishment',
                remarks: { en: 'Pay Commission implementation loaded from user file.', ta: 'ஊதியக் குழு அமலாக்கம் பயனர் கோப்பிலிருந்து ஏற்றப்பட்டது.'},
                rule: { type: 'PAY_COMMISSION_FIXATION', fitmentFactor: data.fitmentFactor }
             });
        }
        // Type 3: Promotion Rule
        else if (data.promotionRule) {
             const id = `user-loaded-${data.goNumber}-${data.effectiveFrom}`;
             newOrders.push({
                id, department: { en: 'P & AR Dept', ta: 'பணியாளர் & நிர்வாக சீர்திருத்தத் துறை' },
                goNumberAndDate: { en: `${data.goNumber}, ${data.goDate}`, ta: `${data.goNumber}, ${data.goDate}` },
                subject: { en: data.description, ta: 'பதவி உயர்வு விதி திருத்தம்' },
                keyPoints: { en: data.promotionRule.description || `Rule ${data.promotionRule.rule} updated.`, ta: `விதி ${data.promotionRule.rule} திருத்தப்பட்டது.` },
                effectiveFrom: normalizeDate(data.effectiveFrom),
                category: data.category || 'Establishment + Service',
                remarks: { en: 'Promotion rule G.O. loaded from user file.', ta: 'பதவி உயர்வு விதி அரசாணை பயனர் கோப்பிலிருந்து ஏற்றப்பட்டது.'},
                rule: { type: 'PROMOTION_RULE', rule: data.promotionRule.rule, details: data.promotionRule }
             });
        }
    }
    
    // Also handle if the file is just an array of standard GovernmentOrder objects
    if (Array.isArray(data)) {
        data.forEach(item => {
            if(item.id && item.goNumberAndDate) {
                newOrders.push(item as GovernmentOrder);
            }
        });
    }

    return newOrders;
};

interface GoViewerProps {
    goData: GovernmentOrder[];
    onGoDataUpdate: (newGoData: GovernmentOrder[]) => void;
}

const GoViewer: React.FC<GoViewerProps> = ({ goData, onGoDataUpdate }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({ year: '', category: '', department: '', searchQuery: '' });
  const [viewMode, setViewMode] = useState<ViewMode>('bilingual');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const { years, departments, categories } = useMemo(() => {
    const yearSet = new Set<string>();
    const deptSet = new Set<string>();
    const catSet = new Set<string>();
    goData.forEach(go => {
        yearSet.add(go.effectiveFrom.substring(0, 4));
        deptSet.add(go.department.en);
        catSet.add(go.category);
    });
    return {
        years: Array.from(yearSet).sort((a,b) => b.localeCompare(a)),
        departments: Array.from(deptSet).sort(),
        categories: Array.from(catSet).sort(),
    };
  }, [goData]);

  const filteredGoData = useMemo(() => {
      return goData.filter(go => {
          const searchLower = filters.searchQuery.toLowerCase();
          const matchesSearch = filters.searchQuery === '' ||
              go.subject.en.toLowerCase().includes(searchLower) ||
              go.subject.ta.toLowerCase().includes(searchLower) ||
              go.goNumberAndDate.en.toLowerCase().includes(searchLower) ||
              go.keyPoints.en.toLowerCase().includes(searchLower);

          const matchesYear = filters.year === '' || go.effectiveFrom.startsWith(filters.year);
          const matchesCategory = filters.category === '' || go.category === filters.category;
          const matchesDept = filters.department === '' || go.department.en === filters.department;

          return matchesSearch && matchesYear && matchesCategory && matchesDept;
      });
  }, [goData, filters]);

  const handleExportJson = () => {
    const jsonString = JSON.stringify(filteredGoData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tn_go_summary.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  
  const createSheetAndExport = (data: any[], filename: string, format: 'xlsx' | 'csv') => {
      const ws = XLSX.utils.json_to_sheet(data);
      if (format === 'csv') {
          const csvString = XLSX.utils.sheet_to_csv(ws);
          // Add BOM for UTF-8 Excel support
          const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else {
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'TamilNadu_GOs');
          XLSX.writeFile(wb, filename);
      }
  }

  const handleExportExcelOrCsv = (format: 'xlsx' | 'csv') => {
    const dataForExport = filteredGoData.map(go => ({
        'id': go.id,
        'Department (EN)': go.department.en, 'Department (TA)': go.department.ta,
        'G.O. No & Date (EN)': go.goNumberAndDate.en, 'G.O. No & Date (TA)': go.goNumberAndDate.ta,
        'Subject (EN)': go.subject.en, 'Subject (TA)': go.subject.ta,
        'Key Points (EN)': go.keyPoints.en, 'Key Points (TA)': go.keyPoints.ta,
        'Effective From': go.effectiveFrom, 'Category': go.category,
        'Remarks (EN)': go.remarks.en, 'Remarks (TA)': go.remarks.ta,
        'Rule Type': go.rule?.type,
    }));
    createSheetAndExport(dataForExport, `tn_go_summary.${format}`, format);
  };
  
  const handleExportPdf = () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFont('times', 'bold');
      doc.text(t('goViewerTitle'), 10, 10);
      doc.autoTable({
          head: [['G.O. No', 'Department', 'Subject', 'Effective From']],
          body: filteredGoData.map(go => [go.goNumberAndDate.en, go.department.en, go.subject.en, go.effectiveFrom]),
          styles: { font: 'times' } // Use a font that supports more characters
      });
      doc.save('tn_go_summary.pdf');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotification(null);
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error('Failed to read file.');
            const jsonData = JSON.parse(text);

            const newOrders = parseGoFile(jsonData);

            if (newOrders.length > 0) {
                const existingIds = new Set(goData.map(g => g.id));
                const uniqueNewOrders = newOrders.filter(o => !existingIds.has(o.id));

                if (uniqueNewOrders.length > 0) {
                    onGoDataUpdate([...goData, ...uniqueNewOrders]);
                    setNotification({ type: 'success', message: t('goLoadSuccess', {count: uniqueNewOrders.length}) });
                } else {
                    setNotification({ type: 'info', message: t('goLoadNoNew') });
                }
            } else {
               throw new Error(t('unrecognizedFormat'));
            }
        } catch (error) {
            console.error("Error parsing G.O. file:", error);
            setNotification({ type: 'error', message: t('goLoadError', {error: (error as Error).message}) });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handleLoadClick = () => fileInputRef.current?.click();

  return (
    <div className="space-y-6">
        {notification && <Notification type={notification.type} message={notification.message} onDismiss={() => setNotification(null)} />}
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="controls">
                <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4 text-left">
                        <span className="text-lg font-semibold">{t('controls')}</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                     <div className="p-4 bg-white border-t rounded-b-lg space-y-6">
                        {/* Filters */}
                        <div>
                             <h4 className="font-semibold mb-2">{t('filters')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input type="search" name="searchQuery" placeholder={t('searchGOs')} value={filters.searchQuery} onChange={handleFilterChange} />
                                <Select name="year" value={filters.year} onChange={handleFilterChange}>
                                    <option value="">{t('allYears')}</option>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </Select>
                                <Select name="category" value={filters.category} onChange={handleFilterChange}>
                                     <option value="">{t('allCategories')}</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                                <Select name="department" value={filters.department} onChange={handleFilterChange}>
                                     <option value="">{t('allDepartments')}</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </Select>
                            </div>
                        </div>

                         {/* View Mode */}
                        <div>
                            <h4 className="font-semibold mb-2">{t('viewMode')}</h4>
                            <div className="flex space-x-2">
                                {/* FIX: Map view modes to their correct translation keys */}
                                {([
                                    { mode: 'bilingual', labelKey: 'bilingual' },
                                    { mode: 'en', labelKey: 'englishOnly' },
                                    { mode: 'ta', labelKey: 'tamilOnly' }
                                ] as const).map(({ mode, labelKey }) => (
                                    <Button key={mode} variant={viewMode === mode ? 'default' : 'outline'} size="sm" onClick={() => setViewMode(mode)}>
                                        {t(labelKey)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                         {/* Exports & Imports */}
                        <div>
                            <h4 className="font-semibold mb-2">{t('exports')}</h4>
                             <div className="flex flex-wrap gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
                                <Button onClick={handleLoadClick} variant="outline" size="sm"><FileUploadIcon /> {t('loadGoFile')}</Button>
                                <Button onClick={handleExportJson} variant="outline" size="sm"><JsonIcon /> {t('exportJson')}</Button>
                                <Button onClick={() => handleExportExcelOrCsv('xlsx')} variant="outline" size="sm"><ExcelIcon /> {t('exportExcel')}</Button>
                                <Button onClick={() => handleExportExcelOrCsv('csv')} variant="outline" size="sm"><CsvIcon /> {t('exportGoCsv')}</Button>
                                <Button onClick={handleExportPdf} variant="outline" size="sm"><PdfIcon /> {t('exportGoPdf')}</Button>
                            </div>
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

      {filteredGoData.map(go => (
        <GoCard key={go.id} go={go} viewMode={viewMode} />
      ))}

      {filteredGoData.length === 0 && (
          <div className="text-center py-10">
              <p className="text-gray-500">No Government Orders match the current filters.</p>
          </div>
      )}
    </div>
  );
};

export default GoViewer;
