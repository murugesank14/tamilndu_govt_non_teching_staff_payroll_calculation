





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
// FIX: Import translations to resolve type errors for 't' function and navItems.
import { translations } from './translations';
// FIX: Replaced FileJsonIcon with JsonIcon and ensured all other icons are correctly imported. They will be added to Icons.tsx.
import { CalendarDaysIcon, CircleDollarSignIcon, SheetIcon, LandmarkIcon, AlertTriangleIcon, GanttChartSquareIcon, FileSearchIcon, JsonIcon, ScanSearchIcon } from './components/ui/Icons';
import { Notification } from './components/ui/Notification';
import PaySlipVerifier from './components/PaySlipVerifier';


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

type ActiveView = 'calculator' | 'pensionCalculator' | 'gpfCalculator' | 'leaveCalculator' | 'auditTracker' | 'goViewer' | 'paySlip' | 'leaveBalance' | 'paySlipVerifier';

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
    try {
      if (!data) throw new Error("Input data is missing or invalid.");
      const result = calculateFullPayroll(data, activeGoData);
      if (!result) throw new Error("Calculation returned an invalid result.");
      setPayrollResult(result);
    } catch (e) {
      console.error("Payroll Calculation Error:", e);
      if (e instanceof Error) {
        setError(`Payroll calculation failed: ${e.message}`);
      } else {
        setError('An unknown error occurred during payroll calculation.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePensionCalculate = (data: PensionInput) => {
    setIsLoading(true);
    setError(null);
    setPensionResult(null);
    try {
      if (!data) throw new Error("Input data is missing or invalid.");
      const result = calculatePension(data);
      if (!result) throw new Error("Calculation returned an invalid result.");
      setPensionResult(result);
    } catch (e) {
      console.error("Pension Calculation Error:", e);
      if (e instanceof Error) {
        setError(`Pension calculation failed: ${e.message}`);
      } else {
        setError('An unknown error occurred during pension calculation.');
      }
    } finally {
      setIsLoading(false);
    }
  }
  
   const handleGpfCalculate = (data: GPFInput) => {
    setIsLoading(true);
    setError(null);
    setGpfResult(null);
    try {
      if (!data) throw new Error("Input data is missing or invalid.");
      const result = calculateGPF(data);
      if (!result) throw new Error("Calculation returned an invalid result.");
      setGpfResult(result);
    } catch (e) {
      console.error("GPF Calculation Error:", e);
      if (e instanceof Error) {
        setError(`GPF calculation failed: ${e.message}`);
      } else {
        setError('An unknown error occurred during GPF calculation.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleLeaveCalculate = (data: LeaveInput) => {
    setIsLoading(true);
    setError(null);
    setLeaveResult(null);
    try {
      if (!data) throw new Error("Input data is missing or invalid.");
      const result = calculateLeave(data);
      if (!result) throw new Error("Calculation returned an invalid result.");
      setLeaveResult(result);
    } catch (e) {
      console.error("Leave Calculation Error:", e);
      if (e instanceof Error) {
        setError(`Leave calculation failed: ${e.message}`);
      } else {
        setError('An unknown error occurred during leave calculation.');
      }
    } finally {
      setIsLoading(false);
    }
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

  // FIX: Complete the handleDeleteAuditPara function which was truncated.
  const handleDeleteAuditPara = (id: string) => {
      setAuditParas(prev => prev.filter(p => p.id !== id));
      setNotification({ type: 'info', message: 'Audit Para deleted.' });
  };

  const navItems: { id: ActiveView; labelKey: keyof typeof translations.en; icon: React.ReactNode }[] = [
    { id: 'calculator', labelKey: 'payrollCalculator', icon: <CircleDollarSignIcon className="w-5 h-5" /> },
    { id: 'pensionCalculator', labelKey: 'pensionCalculator', icon: <LandmarkIcon className="w-5 h-5" /> },
    { id: 'gpfCalculator', labelKey: 'gpfCalculator', icon: <SheetIcon className="w-5 h-5" /> },
    { id: 'leaveCalculator', labelKey: 'leaveCalculator', icon: <CalendarDaysIcon className="w-5 h-5" /> },
    { id: 'auditTracker', labelKey: 'auditTracker', icon: <AlertTriangleIcon className="w-5 h-5" /> },
    // FIX: Replaced non-existent FileJsonIcon with the available JsonIcon.
    { id: 'goViewer', labelKey: 'goViewer', icon: <JsonIcon className="w-5 h-5" /> },
    { id: 'paySlip', labelKey: 'paySlipOutput', icon: <GanttChartSquareIcon className="w-5 h-5" /> },
    { id: 'leaveBalance', labelKey: 'yearlyLeaveBalance', icon: <FileSearchIcon className="w-5 h-5" /> },
    { id: 'paySlipVerifier', labelKey: 'paySlipVerifier', icon: <ScanSearchIcon className="w-5 h-5" /> },
  ];

  const WelcomeMessage: React.FC<{ view: ActiveView }> = ({ view }) => {
    const messages: Record<ActiveView, string> = {
        calculator: t('welcomeMessage'),
        pensionCalculator: t('welcomePensionMessage'),
        gpfCalculator: t('welcomeGpfMessage'),
        leaveCalculator: t('welcomeLeaveMessage'),
        auditTracker: t('welcomeAuditTrackerMessage'),
        goViewer: t('goViewerDescription'),
        paySlip: t('pleaseCalculatePayrollFirst'),
        leaveBalance: t('pleaseCalculateLeaveFirst'),
        paySlipVerifier: 'Upload pay slips to begin verification.',
    };
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-xl shadow-md border border-gray-200/80">
            <h3 className="text-xl font-semibold text-gray-700">{t('welcomeTitle')}</h3>
            <p className="mt-2 text-sm text-gray-500">{messages[view]}</p>
        </div>
    );
  };

  // FIX: Added the return statement with a full layout to fix the "component returns nothing" error.
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
                <HeroIcon />
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">{t('appTitle')}</h1>
                    <p className="text-sm text-emerald-600 font-medium">{t('appTitleTa')}</p>
                </div>
            </div>
            <LanguageSwitcher />
        </div>
      </header>
      <main className="container mx-auto p-4 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64">
          <nav className="bg-white rounded-xl shadow-md p-4 space-y-1 sticky top-24">
            {navItems.map(item => (
                <button 
                    key={item.id} 
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeView === item.id 
                        ? 'bg-emerald-600 text-white shadow' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    {item.icon}
                    {/* FIX: This call is now correctly typed after importing 'translations'. */}
                    <span>{t(item.labelKey)}</span>
                </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1">
          {notification && <Notification type={notification.type} message={notification.message} onDismiss={() => setNotification(null)} />}
          {error && <Notification type="error" message={error} onDismiss={() => setError(null)} />}
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* FORMS - Column 1 */}
              <div>
                {activeView === 'calculator' && <PayrollForm onCalculate={handleCalculate} isLoading={isLoading} />}
                {activeView === 'pensionCalculator' && <PensionForm onCalculate={handlePensionCalculate} isLoading={isLoading} />}
                {activeView === 'gpfCalculator' && <GPFForm onCalculate={handleGpfCalculate} isLoading={isLoading} />}
                {activeView === 'leaveCalculator' && <LeaveForm onCalculate={handleLeaveCalculate} isLoading={isLoading} />}
                {activeView === 'auditTracker' && <AuditParaForm onSave={handleSaveAuditPara} editingPara={editingAuditPara} onClearEditing={() => setEditingAuditPara(null)} />}
                {activeView === 'paySlipVerifier' && <PaySlipVerifier />}
              </div>

               {/* RESULTS - Column 2 */}
              <div className="space-y-4">
                {isLoading && <div className="p-8 text-center bg-white rounded-xl shadow-md">Calculating...</div>}
                
                {activeView === 'calculator' && (payrollResult ? <PayrollResult result={payrollResult} /> : !isLoading && !error && <WelcomeMessage view="calculator" />)}
                {activeView === 'pensionCalculator' && (pensionResult ? <PensionResult result={pensionResult} /> : !isLoading && !error && <WelcomeMessage view="pensionCalculator" />)}
                {activeView === 'gpfCalculator' && (gpfResult ? <GPFResult result={gpfResult} /> : !isLoading && !error && <WelcomeMessage view="gpfCalculator" />)}
                {activeView === 'leaveCalculator' && (leaveResult ? <LeaveResult result={leaveResult} /> : !isLoading && !error && <WelcomeMessage view="leaveCalculator" />)}
                {activeView === 'auditTracker' && <AuditParaResult paras={auditParas} onEdit={(id) => setEditingAuditPara(auditParas.find(p=>p.id === id) || null)} onDelete={handleDeleteAuditPara} />}
                {activeView === 'paySlip' && (payrollResult ? <PaySlipResult payrollResult={payrollResult} /> : <WelcomeMessage view="paySlip" />)}
                {activeView === 'leaveBalance' && (leaveResult ? <LeaveBalanceResult leaveResult={leaveResult} /> : <WelcomeMessage view="leaveBalance" />)}
              </div>
          </div>
          {activeView === 'goViewer' && <GoViewer goData={activeGoData} onGoDataUpdate={(newGoData) => setActiveGoData(newGoData)} />}

        </div>
      </main>
    </div>
  );
};

// FIX: Add default export to make it available for import in index.tsx
export default App;