

import React, { useState } from 'react';
import { EmployeeInput, PayrollResult as PayrollResultType, GovernmentOrder, PensionInput, PensionResult as PensionResultType, GPFInput, GPFResult as GPFResultType, LeaveInput, LeaveResult as LeaveResultType, AuditPara } from './types';
import { calculateFullPayroll, calculatePension, calculateGPF, calculateLeave } from './services/payrollService';
import PayrollForm from './components/PayrollForm';
import PayrollResult from './components/PayrollResult';
import { HeroIcon } from './components/ui/HeroIcon';
import { useLanguage } from './components/LanguageProvider';
import GoViewer from './components/GoViewer';
import { GO_DATA } from './constants';
import PensionForm from './components/PensionForm';
import PensionResult from './components/PensionResult';
import GPFForm from './components/GPFForm';
import GPFResult from './components/GPFResult';
import LeaveForm from './components/LeaveForm';
import LeaveResult from './components/LeaveResult';
import AuditParaForm from './components/AuditParaForm';
import AuditParaResult from './components/AuditParaResult';
import PaySlipResult from './components/PaySlipResult';
import LeaveBalanceResult from './components/LeaveBalanceResult';
import { CalendarDaysIcon, CircleDollarSignIcon, SheetIcon, LandmarkIcon, AlertTriangleIcon } from './components/ui/Icons';
import { Notification } from './components/ui/Notification';


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

type ActiveView = 'calculator' | 'pensionCalculator' | 'gpfCalculator' | 'leaveCalculator' | 'auditTracker' | 'goViewer' | 'paySlip' | 'leaveBalance';

const App: React.FC = () => {
  const [payrollResult, setPayrollResult] = useState<PayrollResultType | null>(null);
  const [pensionResult, setPensionResult] = useState<PensionResultType | null>(null);
  const [gpfResult, setGpfResult] = useState<GPFResultType | null>(null);
  const [leaveResult, setLeaveResult] = useState<LeaveResultType | null>(null);
  const [auditParas, setAuditParas] = useState<AuditPara[]>([]);
  const [editingAuditPara, setEditingAuditPara] = useState<AuditPara | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('calculator');
  const [activeGoData, setActiveGoData] = useState<GovernmentOrder[]>(GO_DATA);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const { t } = useLanguage();

  const handleCalculate = (data: EmployeeInput) => {
    setIsLoading(true);
    setError(null);
    setPayrollResult(null);

    setTimeout(() => {
      try {
        const result = calculateFullPayroll(data, activeGoData);
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
  
  const handlePensionCalculate = (data: PensionInput) => {
    setIsLoading(true);
    setError(null);
    setPensionResult(null);

    setTimeout(() => {
        try {
            const result = calculatePension(data);
            setPensionResult(result);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred during pension calculation.');
            }
        } finally {
            setIsLoading(false);
        }
    }, 500);
  }
  
   const handleGpfCalculate = (data: GPFInput) => {
    setIsLoading(true);
    setError(null);
    setGpfResult(null);

    setTimeout(() => {
        try {
            const result = calculateGPF(data);
            setGpfResult(result);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred during GPF calculation.');
            }
        } finally {
            setIsLoading(false);
        }
    }, 500);
  }

  const handleLeaveCalculate = (data: LeaveInput) => {
    setIsLoading(true);
    setError(null);
    setLeaveResult(null);

    setTimeout(() => {
        try {
            const result = calculateLeave(data);
            setLeaveResult(result);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('An unknown error occurred during leave calculation.');
            }
        } finally {
            setIsLoading(false);
        }
    }, 500);
  };
  
  const handleSaveAuditPara = (para: AuditPara) => {
    setAuditParas(prev => {
        const existingIndex = prev.findIndex(p => p.id === para.id);
        if (existingIndex > -1) {
            const newParas = [...prev];
            newParas[existingIndex] = para;
            return newParas;
        } else {
            return [...prev, para];
        }
    });
    setEditingAuditPara(null); // Reset editing state
  };

  const handleDeleteAuditPara = (id: string) => {
      setAuditParas(prev => prev.filter(p => p.id !== id));
  };
  
  const handleEditAuditPara = (id: string) => {
      const paraToEdit = auditParas.find(p => p.id === id);
      if(paraToEdit) {
          setEditingAuditPara(paraToEdit);
      }
  };

  const handleViewChange = (view: ActiveView) => {
      setNotification(null);
      setError(null);
      setActiveView(view);
  }

  const getNavButtonClasses = (viewName: ActiveView) => {
    const baseClasses = "flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors focus:outline-none";
    if (activeView === viewName) {
      return `${baseClasses} text-emerald-600 border-b-2 border-emerald-600`;
    }
    return `${baseClasses} text-gray-500 hover:text-gray-700 hover:bg-gray-100`;
  }
  
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full bg-white rounded-xl shadow-md p-8">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin border-t-emerald-500"></div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative shadow" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        );
    }
    if (activeView === 'calculator' && payrollResult) {
        return <PayrollResult result={payrollResult} />;
    }
    if (activeView === 'pensionCalculator' && pensionResult) {
        return <PensionResult result={pensionResult} />;
    }
    if (activeView === 'gpfCalculator' && gpfResult) {
        return <GPFResult result={gpfResult} />;
    }
    if (activeView === 'leaveCalculator' && leaveResult) {
        return <LeaveResult result={leaveResult} />;
    }
    if (activeView === 'auditTracker') {
        return <AuditParaResult 
                    paras={auditParas} 
                    onEdit={handleEditAuditPara}
                    onDelete={handleDeleteAuditPara}
                />;
    }
    
    // Default welcome message for all calculators
    let welcomeMessage = t('welcomeMessage');
    if (activeView === 'pensionCalculator') welcomeMessage = t('welcomePensionMessage');
    if (activeView === 'gpfCalculator') welcomeMessage = t('welcomeGpfMessage');
    if (activeView === 'leaveCalculator') welcomeMessage = t('welcomeLeaveMessage');

    return (
        <div className="bg-white rounded-xl shadow-md p-8 text-center h-full flex flex-col justify-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t('welcomeTitle')}</h2>
            <p className="text-gray-500 max-w-md mx-auto">
                {welcomeMessage}
            </p>
        </div>
    );
  }


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

      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 flex overflow-x-auto">
          <button onClick={() => handleViewChange('calculator')} className={getNavButtonClasses('calculator')}>
            <SheetIcon className="w-4 h-4" /> {t('payrollCalculator')}
          </button>
           <button onClick={() => handleViewChange('pensionCalculator')} className={getNavButtonClasses('pensionCalculator')}>
             <LandmarkIcon className="w-4 h-4" />{t('pensionCalculator')}
          </button>
           <button onClick={() => handleViewChange('gpfCalculator')} className={getNavButtonClasses('gpfCalculator')}>
             <CircleDollarSignIcon className="w-4 h-4" />{t('gpfCalculator')}
          </button>
          <button onClick={() => handleViewChange('leaveCalculator')} className={getNavButtonClasses('leaveCalculator')}>
             <CalendarDaysIcon className="w-4 h-4" />{t('leaveCalculator')}
          </button>
           <button onClick={() => {
                setNotification(null);
                if (!payrollResult) {
                    setNotification({ type: 'info', message: t('pleaseCalculatePayrollFirst') });
                } else {
                    setActiveView('paySlip');
                }
            }} className={getNavButtonClasses('paySlip')}>
                <SheetIcon className="w-4 h-4" /> {t('paySlipOutput')}
            </button>
            <button onClick={() => {
                setNotification(null);
                if (!leaveResult) {
                    setNotification({ type: 'info', message: t('pleaseCalculateLeaveFirst') });
                } else {
                    setActiveView('leaveBalance');
                }
            }} className={getNavButtonClasses('leaveBalance')}>
                <CalendarDaysIcon className="w-4 h-4" /> {t('yearlyLeaveBalance')}
            </button>
          <button onClick={() => handleViewChange('auditTracker')} className={getNavButtonClasses('auditTracker')}>
            <AlertTriangleIcon className="w-4 h-4" />{t('auditTracker')}
          </button>
          <button onClick={() => handleViewChange('goViewer')} className={getNavButtonClasses('goViewer')}>
            {t('goViewer')}
          </button>
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
         {notification && <Notification type={notification.type} message={notification.message} onDismiss={() => setNotification(null)} />}
         {activeView === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <PayrollForm onCalculate={handleCalculate} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-3">
                 {renderContent()}
              </div>
            </div>
          )}
          {activeView === 'pensionCalculator' && (
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <PensionForm onCalculate={handlePensionCalculate} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-3">
                {renderContent()}
              </div>
            </div>
          )}
          {activeView === 'gpfCalculator' && (
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <GPFForm onCalculate={handleGpfCalculate} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-3">
                {renderContent()}
              </div>
            </div>
          )}
           {activeView === 'leaveCalculator' && (
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <LeaveForm onCalculate={handleLeaveCalculate} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-3">
                {renderContent()}
              </div>
            </div>
          )}
          {activeView === 'auditTracker' && (
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <AuditParaForm 
                    onSave={handleSaveAuditPara} 
                    editingPara={editingAuditPara}
                    onClearEditing={() => setEditingAuditPara(null)}
                />
              </div>
              <div className="lg:col-span-3">
                {renderContent()}
              </div>
            </div>
          )}
          {activeView === 'goViewer' && (
            <GoViewer goData={activeGoData} onGoDataUpdate={setActiveGoData} />
          )}
           {activeView === 'paySlip' && payrollResult && (
                <PaySlipResult payrollResult={payrollResult} />
            )}
            {activeView === 'leaveBalance' && leaveResult && (
                <LeaveBalanceResult leaveResult={leaveResult} />
            )}
      </main>

       <footer className="text-center p-4 mt-8 text-xs text-gray-500 space-y-2">
           <p className="font-semibold text-green-700 bg-green-50 p-2 rounded-md">
             {t('rulesSyncedMessage', { date: today })}
           </p>
          <p>&copy; {new Date().getFullYear()} TN Payroll Calculator. All Rights Reserved.</p>
       </footer>
    </div>
  );
};

export default App;