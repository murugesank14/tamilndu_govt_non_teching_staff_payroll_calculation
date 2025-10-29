import React from 'react';
import { PensionResult as PensionResultType } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { useLanguage } from './LanguageProvider';

interface PensionResultProps {
  result: PensionResultType;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const PensionResult: React.FC<PensionResultProps> = ({ result }) => {
  const { inputs, calculations, benefits } = result;
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader>
          <CardTitle>{t('pensionSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 text-sm">
            <div><p className="text-gray-500">{t('retirementDate')}</p><p className="font-semibold">{inputs.retirementDate}</p></div>
            <div><p className="text-gray-500">{t('ageAtRetirement')}</p><p className="font-semibold">{inputs.ageAtRetirement} Years</p></div>
            <div><p className="text-gray-500">{t('qualifyingService')}</p><p className="font-semibold">{calculations.qualifyingService}</p></div>
            <div className="col-span-full"><p className="text-gray-500">{t('averageEmoluments')}</p><p className="font-bold text-lg text-emerald-700">{formatCurrency(calculations.averageEmoluments)}</p></div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('pensionBenefits')}</CardTitle>
          <CardDescription>Monthly receivable pension amount.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{t('fullPension')}</span>
                <span className="font-bold text-xl text-blue-600">{formatCurrency(benefits.fullPension)}</span>
            </div>
            {benefits.residuaryPension !== undefined && (
                 <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="font-medium text-green-800">{t('residuaryPension')}</span>
                    <span className="font-bold text-xl text-green-700">{formatCurrency(benefits.residuaryPension)}</span>
                </div>
            )}
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>{t('lumpSumBenefits')}</CardTitle>
          <CardDescription>Total one-time payment receivable on retirement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
             <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">{t('dcrg')}</span>
                <span className="font-semibold text-gray-800">{formatCurrency(benefits.dcrg)}</span>
            </div>
            {benefits.commutedValue !== undefined && (
                 <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">{t('commutedValue')}</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(benefits.commutedValue)}</span>
                </div>
            )}
            <div className="flex justify-between items-center pt-3">
                <span className="font-bold text-lg">{t('totalLumpSum')}</span>
                <span className="font-extrabold text-2xl text-emerald-600">{formatCurrency(benefits.totalLumpSum)}</span>
            </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-gray-50 border-dashed">
        <CardContent className="p-4">
            <p className="text-xs text-center text-gray-600 italic">
               Calculations as per Tamil Nadu Pension Rules, 1978. For official use, please verify with the service register.
            </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PensionResult;
