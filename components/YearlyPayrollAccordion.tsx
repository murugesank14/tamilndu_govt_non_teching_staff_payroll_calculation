import React from 'react';
import { PayrollYear } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/Accordion';
import { useLanguage } from './LanguageProvider';

interface YearlyPayrollAccordionProps {
  yearlyCalculations: PayrollYear[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

export const YearlyPayrollAccordion: React.FC<YearlyPayrollAccordionProps> = ({ yearlyCalculations }) => {
    const { t } = useLanguage();
    
    const calculateYearlyTotal = (year: PayrollYear) => {
        // This is an approximation as periods can be of different lengths.
        // A more accurate calculation would require knowing the exact duration of each period.
        // For a simple annual summary, summing up the gross pay is a reasonable approach.
        return year.periods.reduce((acc, period) => acc + period.grossPay, 0);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('detailedBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {yearlyCalculations.map(yearData => (
                        <AccordionItem value={`item-${yearData.year}`} key={yearData.year}>
                            <AccordionTrigger>
                                <div className="flex justify-between w-full pr-4 text-left">
                                    <span>{t('payrollForYear', {year: yearData.year})}</span>
                                    <span className="font-semibold text-green-600 ml-4 whitespace-nowrap">
                                      {t('annualGrossPay')}: {formatCurrency(calculateYearlyTotal(yearData))}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                        <tr>
                                          <th scope="col" className="px-4 py-3">{t('period')}</th>
                                          <th scope="col" className="px-4 py-3">{t('basicPay')}</th>
                                          <th scope="col" className="px-4 py-3">{t('da')}</th>
                                          <th scope="col" className="px-4 py-3">{t('hra')}</th>
                                          <th scope="col" className="px-4 py-3">{t('grossPay')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {yearData.periods.map((period, index) => (
                                          <React.Fragment key={index}>
                                          <tr className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-4 font-medium">{period.period}</td>
                                            <td className="px-4 py-4">
                                              {formatCurrency(period.basicPay)}
                                               {period.payInPayBand != null && <p className="text-xs text-gray-500">({formatCurrency(period.payInPayBand)} + {formatCurrency(period.gradePay || 0)} GP)</p>}
                                            </td>
                                            <td className="px-4 py-4">{formatCurrency(period.daAmount)} ({period.daRate}%)</td>
                                            <td className="px-4 py-4">{formatCurrency(period.hra)}</td>
                                            <td className="px-4 py-4 font-bold text-blue-600">{formatCurrency(period.grossPay)}</td>
                                          </tr>
                                          {period.remarks && period.remarks.length > 0 && (
                                            <tr className="bg-blue-50/70 text-blue-800 text-xs">
                                               <td colSpan={5} className="px-4 py-1 italic">
                                                   <span className="font-semibold">{t('note')}:</span> {period.remarks.join(' ')}
                                               </td>
                                            </tr>
                                          )}
                                          </React.Fragment>
                                        ))}
                                      </tbody>
                                    </table>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
};