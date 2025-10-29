import React, { useState, useEffect } from 'react';
import { AuditPara } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { useLanguage } from './LanguageProvider';

interface AuditParaFormProps {
  onSave: (data: AuditPara) => void;
  editingPara: AuditPara | null;
  onClearEditing: () => void;
}

const currentYear = new Date().getFullYear();
const auditYears = Array.from({ length: 15 }, (_, i) => (currentYear - i).toString());

const getInitialFormData = (): AuditPara => ({
    id: Date.now().toString(),
    year: currentYear.toString(),
    auditType: 'Local Fund',
    paraNumber: '',
    subject: '',
    officerResponsible: '',
    recoveryAmount: 0,
    irregularityNature: 'Establishment',
    recoveryProgress: 0,
    complianceStatus: 'Not Submitted',
    remarks: '',
});

const AuditParaForm: React.FC<AuditParaFormProps> = ({ onSave, editingPara, onClearEditing }) => {
  const [formData, setFormData] = useState<AuditPara>(getInitialFormData());
  const { t } = useLanguage();
  
  useEffect(() => {
      if (editingPara) {
          setFormData(editingPara);
      } else {
          setFormData(getInitialFormData());
      }
  }, [editingPara]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumberInput = ['recoveryAmount', 'recoveryProgress'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberInput && value ? Number(value) : value }));
  };
  
  const handleReset = () => {
      onClearEditing();
      setFormData(getInitialFormData());
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(getInitialFormData()); // Reset form for next entry
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('auditParaFormTitle')}</CardTitle>
          <CardDescription>{t('auditParaFormDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="year">{t('yearOfAudit')}</Label>
                    <Select name="year" id="year" value={formData.year} onChange={handleChange}>
                        {auditYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="auditType">{t('auditType')}</Label>
                    <Select name="auditType" id="auditType" value={formData.auditType} onChange={handleChange}>
                        <option value="Local Fund">Local Fund</option>
                        <option value="AG">AG Audit</option>
                        <option value="Internal">Internal Audit</option>
                    </Select>
                </div>
            </div>
            <div>
                <Label htmlFor="paraNumber">{t('paraNumber')}</Label>
                <Input type="text" name="paraNumber" id="paraNumber" value={formData.paraNumber} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="subject">{t('paraSubject')}</Label>
                <Input type="text" name="subject" id="subject" value={formData.subject} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="officerResponsible">{t('officerResponsible')}</Label>
                <Input type="text" name="officerResponsible" id="officerResponsible" value={formData.officerResponsible} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="irregularityNature">{t('irregularityNature')}</Label>
                <Select name="irregularityNature" id="irregularityNature" value={formData.irregularityNature} onChange={handleChange}>
                    <option value="Establishment">Establishment</option>
                    <option value="Works">Works</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Others">Others</option>
                </Select>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="recoveryAmount">{t('recoveryAmount')}</Label>
                    <Input type="number" name="recoveryAmount" id="recoveryAmount" value={formData.recoveryAmount} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="recoveryProgress">{t('recoveryProgress')}</Label>
                    <Input type="number" name="recoveryProgress" id="recoveryProgress" value={formData.recoveryProgress} onChange={handleChange} />
                </div>
            </div>
            <div>
                <Label htmlFor="complianceStatus">{t('complianceStatus')}</Label>
                <Select name="complianceStatus" id="complianceStatus" value={formData.complianceStatus} onChange={handleChange}>
                    <option value="Not Submitted">Not Submitted / சமர்ப்பிக்கப்படவில்லை</option>
                    <option value="Submitted">Submitted / சமர்ப்பிக்கப்பட்டது</option>
                    <option value="Dropped">Dropped / கைவிடப்பட்டது</option>
                </Select>
            </div>
            <div>
                <Label htmlFor="remarks">{t('actionTakenReport')}</Label>
                <textarea name="remarks" id="remarks" value={formData.remarks} onChange={handleChange} rows={4}
                    className="mt-1 block w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                ></textarea>
            </div>
        </CardContent>
      </Card>
      

      <div className="pt-4 grid grid-cols-2 gap-4">
        <Button type="button" onClick={handleReset} variant="outline">
          {t('newParaEntry')}
        </Button>
        <Button type="submit">
          {editingPara ? 'Update Para' : t('savePara')}
        </Button>
      </div>
    </form>
  );
};

export default AuditParaForm;