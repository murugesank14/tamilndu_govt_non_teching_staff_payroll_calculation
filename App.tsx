import React, { useState } from 'react';
import { EmployeeInput, PayrollResult as PayrollResultType } from './types';
import { calculateFullPayroll } from './services/payrollService';
import PayrollForm from './components/PayrollForm';
import PayrollResult from './components/PayrollResult';
import { HeroIcon } from './components/ui/HeroIcon';
import { useLanguage } from './components/LanguageProvider';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const activeClasses = "bg-emerald-600 text-white";
    const inactiveClasses = "bg-white text-gray-600 hover:bg-gray-100";
    
    return (
        <div className="flex rounded-lg p-1 bg-gray-200">
            <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'en' ? activeClasses : inactiveClasses}`}
            >
                English
            </button>
            <button
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'ta' ? activeClasses : inactiveClasses}`}
            >
                தமிழ்
            </button>
        </div>
    )
}

const App: React.FC = () => {
  const [payrollResult, setPayrollResult] = useState<PayrollResultType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleCalculate = (data: EmployeeInput) => {
    setIsLoading(true);
    setError(null);
    setPayrollResult(null);

    // Simulate async calculation
    setTimeout(() => {
      try {
        const result = calculateFullPayroll(data);
        setPayrollResult(result);
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('An unknown error occurred during calculation.');
        }
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 md:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HeroIcon />
            <div>
                 <h1 className="text-base md:text-xl font-bold text-gray-800">
                  {t('appTitle')}
                </h1>
                <h2 className="text-sm md:text-base font-medium text-emerald-700">{t('appTitleTa')}</h2>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <PayrollForm onCalculate={handleCalculate} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-3">
            {isLoading && (
              <div className="flex justify-center items-center h-full bg-white rounded-xl shadow-md p-8">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin border-t-emerald-500"></div>
              </div>
            )}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative shadow" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {payrollResult && <PayrollResult result={payrollResult} />}
            {!payrollResult && !isLoading && !error && (
                 <div className="bg-white rounded-xl shadow-md p-8 text-center h-full flex flex-col justify-center">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t('welcomeTitle')}</h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                        {t('welcomeMessage')}
                    </p>
                </div>
            )}
          </div>
        </div>
      </main>

       <footer className="text-center p-4 mt-8 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} TN Payroll Calculator. All Rights Reserved.</p>
       </footer>
    </div>
  );
};

export default App;