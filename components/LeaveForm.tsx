import React, { useState } from 'react';
import { LeaveInput, LeaveTransaction } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { TrashIcon } from './ui/Icons';
import { useLanguage } from './LanguageProvider';

interface LeaveFormProps {
  onCalculate: (data: LeaveInput) => void;
  isLoading: boolean;
}

const initialFormData: Omit<LeaveInput, 'transactions'> = {
    employeeName: '',
    basicPay: undefined,
    initialElBalance: undefined,
    initialHplBalance: undefined,
};

const LeaveForm: React.FC<LeaveFormProps> = ({ onCalculate, isLoading }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [transactions, setTransactions] = useState<Omit<LeaveTransaction, 'description'|'amount'>[]>([]);
  const { t } = useLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumberInput = ['basicPay', 'initialElBalance', 'initialHplBalance'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberInput && value ? Number(value) : value }));
  };

  const handleTransactionChange = (id: string, field: keyof Omit<LeaveTransaction, 'description'|'amount'>, value: string | number) => {
    setTransactions(prev => prev.map(transaction => transaction.id === id ? { ...transaction, [field]: value } : transaction));
  };
  
  const addTransaction = () => {
    const newTransaction: Omit<LeaveTransaction, 'description' | 'amount'> = {
      id: Date.now().toString(),
      type: 'avail',
      leaveType: 'el',
      days: undefined,
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const removeTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setTransactions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({ ...formData, transactions });
  };
  
  return (
    <form onSubmit={handleSubmit} onReset={handleReset} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('leaveCalculatorTitle')}</CardTitle>
          <CardDescription>{t('leaveCalculatorDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="employeeName">{t('employeeName')}</Label>
                <Input type="text" name="employeeName" id="employeeName" value={formData.employeeName} onChange={handleChange} placeholder={t('enterFullName')} required />
            </div>
            <div>
                <Label htmlFor="basicPay">{t('currentBasicPay')}</Label>
                <Input type="number" name="basicPay" id="basicPay" value={formData.basicPay ?? ''} onChange={handleChange} required />
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>{t('currentLeaveBalances')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <Label htmlFor="initialElBalance">{t('elBalance')}</Label>
                  <Input type="number" name="initialElBalance" id="initialElBalance" value={formData.initialElBalance ?? ''} onChange={handleChange} required />
              </div>
              <div>
                  <Label htmlFor="initialHplBalance">{t('hplBalance')}</Label>
                  <Input type="number" name="initialHplBalance" id="initialHplBalance" value={formData.initialHplBalance ?? ''} onChange={handleChange} required />
              </div>
          </CardContent>
      </Card>
      
       <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>{t('leaveActions')}</CardTitle>
                <CardDescription>{t('leaveActionsDesc')}</CardDescription>
              </div>
              <Button type="button" onClick={addTransaction} variant="ghost" size="sm">{t('addLeaveAction')}</Button>
          </CardHeader>
          <CardContent className="space-y-4">
             {transactions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No actions added.</p>}
              {transactions.map(transaction => (
                  <div key={transaction.id} className="p-3 border rounded-md bg-gray-50/80 space-y-3">
                      <div className="flex justify-between items-start">
                         <div className="flex-1 space-y-1">
                            <Label htmlFor={`action_type_${transaction.id}`}>{t('actionType')}</Label>
                            <Select id={`action_type_${transaction.id}`} value={transaction.type} onChange={e => {
                                const newType = e.target.value as 'avail' | 'surrender' | 'credit';
                                let newDays: number | undefined = transaction.days;
                                if(newType === 'surrender') newDays = 15;
                                if(newType === 'credit') newDays = 0; // Days not needed for credit
                                handleTransactionChange(transaction.id, 'type', newType);
                                handleTransactionChange(transaction.id, 'days', newDays);
                            }}>
                                <option value="avail">{t('availLeave')}</option>
                                <option value="surrender">{t('surrenderLeave')}</option>
                                <option value="credit">{t('creditLeave')}</option>
                            </Select>
                         </div>
                         <Button type="button" onClick={() => removeTransaction(transaction.id)} variant="destructive" size="icon" className="ml-2 mt-5"><TrashIcon /></Button>
                      </div>
                      
                      {transaction.type === 'avail' && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div>
                                  <Label htmlFor={`leave_type_${transaction.id}`}>{t('leaveType')}</Label>
                                  <Select id={`leave_type_${transaction.id}`} value={transaction.leaveType} onChange={e => handleTransactionChange(transaction.id, 'leaveType', e.target.value)}>
                                      <option value="el">{t('earnedLeave')}</option>
                                      <option value="hpl">{t('halfPayLeave')}</option>
                                      <option value="commuted">{t('commutedLeave')}</option>
                                  </Select>
                               </div>
                               <div>
                                  <Label htmlFor={`days_avail_${transaction.id}`}>{t('numberOfDays')}</Label>
                                  <Input type="number" id={`days_avail_${transaction.id}`} value={transaction.days ?? ''} onChange={e => handleTransactionChange(transaction.id, 'days', Number(e.target.value))} required />
                               </div>
                           </div>
                      )}
                      
                      {transaction.type === 'surrender' && (
                           <div>
                              <Label htmlFor={`days_surrender_${transaction.id}`}>{t('numberOfDays')}</Label>
                              <Select id={`days_surrender_${transaction.id}`} value={transaction.days} onChange={e => handleTransactionChange(transaction.id, 'days', Number(e.target.value))}>
                                  <option value="15">{t('surrender15Days')}</option>
                                  <option value="30">{t('surrender30Days')}</option>
                              </Select>
                           </div>
                      )}

                       {transaction.type === 'credit' && (
                           <p className="text-sm text-gray-600 p-2 bg-blue-50 rounded-md">15 days of EL and 10 days of HPL will be credited.</p>
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
          {isLoading ? t('calculating') : t('calculateLeave')}
        </Button>
      </div>
    </form>
  );
};

export default LeaveForm;