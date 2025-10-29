import React, { useState, useEffect } from 'react';
import { PensionInput, LastTenMonthsPay } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { useLanguage } from './LanguageProvider';

interface PensionFormProps {
  onCalculate: (data: PensionInput) => void;
  isLoading: boolean;
}

const initialFormData: Omit<PensionInput, 'lastTenMonthsPay'> = {
    employeeName: '',
    dateOfBirth: '',
    dateOfJoining: '',
    retirementDate: '',
    commutationPercentage: '33.33',
    qualifyingServiceYears: undefined,
    qualifyingServiceMonths: undefined,
};

const PensionForm: React.FC<PensionFormProps> = ({ onCalculate, isLoading }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [lastTenMonthsPay, setLastTenMonthsPay] = useState<LastTenMonthsPay[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    if (formData.retirementDate) {
      const retirementDate = new Date(formData.retirementDate + 'T00:00:00Z');
      if (isNaN(retirementDate.getTime())) return;

      const newMonths: LastTenMonthsPay[] = [];
      for (let i = 9; i >= 0; i--) {
        const monthDate = new Date(retirementDate);
        monthDate.setUTCMonth(monthDate.getUTCMonth() - i -1);
        const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        const monthValue = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
        
        const existingEntry = lastTenMonthsPay.find(p => p.month.startsWith(monthValue));

        newMonths.push({
          id: monthValue,
          month: monthLabel,
          basicPay: existingEntry?.basicPay || undefined,
        });
      }
      setLastTenMonthsPay(newMonths);
    }
  }, [formData.retirementDate]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumberInput = ['qualifyingServiceYears', 'qualifyingServiceMonths'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberInput && value ? Number(value) : value }));
  };

  const handlePayChange = (id: string, value: string) => {
    setLastTenMonthsPay(prev => 
      prev.map(p => p.id === id ? { ...p, basicPay: value ? Number(value) : undefined } : p)
    );
  };
  
  const handleReset = () => {
      setFormData(initialFormData);
      setLastTenMonthsPay([]);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({ ...formData, lastTenMonthsPay });
  };
  
  return (
    <form onSubmit={handleSubmit} onReset={handleReset} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('pensionCalculatorTitle')}</CardTitle>
           <CardDescription>{t('pensionCalculatorDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="employeeName">{t('employeeName')}</Label>
                <Input type="text" name="employeeName" id="employeeName" value={formData.employeeName} onChange={handleChange} placeholder={t('enterFullName')} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">{t('dateOfBirth')}</Label>
                <Input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="dateOfJoiningService">{t('dateOfJoiningService')}</Label>
                <Input type="date" name="dateOfJoining" id="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required />
              </div>
            </div>
            <div>
              <Label htmlFor="retirementDate">{t('retirementDate')}</Label>
              <Input type="date" name="retirementDate" id="retirementDate" value={formData.retirementDate} onChange={handleChange} required />
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>{t('last10MonthsPay')}</CardTitle>
              <CardDescription>{t('last10MonthsPayDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
              {lastTenMonthsPay.length === 0 && <p className="text-sm text-center text-gray-500 py-4">Enter a retirement date to see month fields.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                 {lastTenMonthsPay.map(pay => (
                    <div key={pay.id}>
                        <Label htmlFor={`pay_${pay.id}`}>{pay.month}</Label>
                        <Input type="number" id={`pay_${pay.id}`} value={pay.basicPay ?? ''} onChange={e => handlePayChange(pay.id, e.target.value)} required />
                    </div>
                ))}
              </div>
          </CardContent>
      </Card>
      
       <Card>
          <CardHeader>
              <CardTitle>{t('commutation')}</CardTitle>
          </CardHeader>
          <CardContent>
              <Select name="commutationPercentage" value={formData.commutationPercentage} onChange={handleChange}>
                  <option value="33.33">{t('commuteOneThird')}</option>
                  <option value="0">{t('noCommutation')}</option>
              </Select>
          </CardContent>
      </Card>
      
       <Card>
          <CardHeader>
              <CardTitle>{t('qualifyingService')}</CardTitle>
              <CardDescription>{t('qualifyingServiceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="qualifyingServiceYears">{t('years')}</Label>
                      <Input type="number" name="qualifyingServiceYears" id="qualifyingServiceYears" value={formData.qualifyingServiceYears ?? ''} onChange={handleChange} />
                  </div>
                   <div>
                      <Label htmlFor="qualifyingServiceMonths">{t('months')}</Label>
                      <Input type="number" name="qualifyingServiceMonths" id="qualifyingServiceMonths" value={formData.qualifyingServiceMonths ?? ''} onChange={handleChange} />
                  </div>
              </div>
          </CardContent>
      </Card>

      <div className="pt-4 grid grid-cols-2 gap-4">
        <Button type="reset" variant="outline">
          {t('resetForm')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('calculating') : t('calculatePension')}
        </Button>
      </div>
    </form>
  );
};

export default PensionForm;
