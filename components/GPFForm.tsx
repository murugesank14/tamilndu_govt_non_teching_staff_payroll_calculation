import React, { useState } from 'react';
import { GPFInput, GPFTransaction } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { TrashIcon } from './ui/Icons';
import { useLanguage } from './LanguageProvider';

interface GPFFormProps {
  onCalculate: (data: GPFInput) => void;
  isLoading: boolean;
}

const currentYear = new Date().getFullYear();
const financialYears = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

const initialFormData: Omit<GPFInput, 'transactions'> = {
    employeeName: '',
    basicPay: undefined,
    openingBalance: undefined,
    subscription: undefined,
    isSubscriptionPercentage: false,
    interestRate: 7.1,
    calculationYear: currentYear.toString(),
};

const GPFForm: React.FC<GPFFormProps> = ({ onCalculate, isLoading }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [transactions, setTransactions] = useState<GPFTransaction[]>([]);
  const { t } = useLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
     if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        const isNumberInput = ['basicPay', 'openingBalance', 'subscription', 'interestRate'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumberInput && value ? Number(value) : value }));
    }
  };

  const handleTransactionChange = (id: string, field: keyof GPFTransaction, value: string | number) => {
    setTransactions(prev => prev.map(transaction => transaction.id === id ? { ...transaction, [field]: value } : transaction));
  };

  const addTransaction = () => {
    setTransactions(prev => [...prev, {
      id: Date.now().toString(),
      type: 'advance',
      date: '',
      amount: undefined,
      installments: undefined
    }]);
  };

  const removeTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  
  const handleReset = () => {
      setFormData(initialFormData);
      setTransactions([]);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({ ...formData, transactions });
  };
  
  return (
    <form onSubmit={handleSubmit} onReset={handleReset} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('gpfCalculatorTitle')}</CardTitle>
           <CardDescription>{t('gpfCalculatorDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="employeeName">{t('employeeName')}</Label>
                <Input type="text" name="employeeName" id="employeeName" value={formData.employeeName} onChange={handleChange} placeholder={t('enterFullName')} required />
            </div>
            <div>
                 <Label htmlFor="calculationYear">{t('financialYear')}</Label>
                 <Select name="calculationYear" id="calculationYear" value={formData.calculationYear} onChange={handleChange}>
                    {financialYears.map(year => (
                        <option key={year} value={year}>{`${year} - ${parseInt(year, 10) + 1}`}</option>
                    ))}
                 </Select>
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>{t('gpfAccountDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div>
                  {/* FIX: Use the new, non-conflicting translation key 'gpfOpeningBalance'. */}
                  <Label htmlFor="openingBalance">{t('gpfOpeningBalance')}</Label>
                  <Input type="number" name="openingBalance" id="openingBalance" value={formData.openingBalance ?? ''} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="currentBasicPay">{t('currentBasicPay')}</Label>
                    <Input type="number" name="basicPay" id="currentBasicPay" value={formData.basicPay ?? ''} onChange={handleChange} required />
                 </div>
                 <div>
                    <Label htmlFor="interestRate">{t('interestRate')}</Label>
                    <Input type="number" step="0.1" name="interestRate" id="interestRate" value={formData.interestRate} onChange={handleChange} required />
                 </div>
              </div>
              <div>
                <Label>{t('monthlySubscription')}</Label>
                <div className="mt-2 flex items-center gap-4">
                    <div className="flex-1">
                       <Input type="number" name="subscription" value={formData.subscription ?? ''} onChange={handleChange} required />
                    </div>
                     <label className="flex items-center text-sm">
                        <input type="checkbox" name="isSubscriptionPercentage" checked={formData.isSubscriptionPercentage} onChange={handleChange} className="form-checkbox" />
                        <span className="ml-2">{t('subscriptionPercentage')}</span>
                    </label>
                </div>
              </div>
          </CardContent>
      </Card>
      
       <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>{t('gpfTransactions')}</CardTitle>
                <CardDescription>{t('gpfTransactionsDesc')}</CardDescription>
              </div>
              <Button type="button" onClick={addTransaction} variant="ghost" size="sm">{t('addTransaction')}</Button>
          </CardHeader>
          <CardContent className="space-y-4">
             {transactions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No transactions added for this financial year.</p>}
              {transactions.map(transaction => (
                  <div key={transaction.id} className="p-3 border rounded-md bg-gray-50/80 space-y-3">
                      <div className="flex justify-between items-start">
                         <div className="flex-1 space-y-1">
                            <Label htmlFor={`trans_type_${transaction.id}`}>{t('transactionType')}</Label>
                            <Select id={`trans_type_${transaction.id}`} value={transaction.type} onChange={e => handleTransactionChange(transaction.id, 'type', e.target.value)}>
                                <option value="advance">{t('temporaryAdvance')}</option>
                                <option value="withdrawal">{t('partialWithdrawal')}</option>
                                <option value="refund">{t('refundOfAdvance')}</option>
                            </Select>
                         </div>
                         <Button type="button" onClick={() => removeTransaction(transaction.id)} variant="destructive" size="icon" className="ml-2 mt-5"><TrashIcon /></Button>
                      </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                              <Label htmlFor={`trans_date_${transaction.id}`}>{t('transactionDate')}</Label>
                              <Input type="date" id={`trans_date_${transaction.id}`} value={transaction.date} onChange={e => handleTransactionChange(transaction.id, 'date', e.target.value)} required />
                           </div>
                           <div>
                              <Label htmlFor={`trans_amount_${transaction.id}`}>{t('transactionAmount')}</Label>
                              <Input type="number" id={`trans_amount_${transaction.id}`} value={transaction.amount ?? ''} onChange={e => handleTransactionChange(transaction.id, 'amount', e.target.value)} required />
                           </div>
                       </div>
                        {transaction.type === 'advance' && (
                           <div>
                              <Label htmlFor={`trans_installments_${transaction.id}`}>{t('installments')}</Label>
                              <Input type="number" id={`trans_installments_${transaction.id}`} value={transaction.installments ?? ''} onChange={e => handleTransactionChange(transaction.id, 'installments', e.target.value)} />
                              <p className="text-xs text-gray-500 mt-1">{t('gpfInstallmentsHelp')}</p>
                           </div>
                        )}
                  </div>
              ))}
          </CardContent>
      </Card>
      

      <div className="pt-4 grid grid-cols-2 gap-4">
        <Button type="reset" variant="outline">
          {t('resetForm')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('calculating') : t('calculateGpf')}
        </Button>
      </div>
    </form>
  );
};

export default GPFForm;