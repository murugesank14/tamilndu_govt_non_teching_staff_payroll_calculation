
import React, { useState } from 'react';
import { EmployeeInput, PayrollResult as PayrollResultType } from './types';
import { calculateFullPayroll } from './services/payrollService';
import PayrollForm from './components/PayrollForm';
import PayrollResult from './components/PayrollResult';
import { HeroIcon } from './components/ui/HeroIcon';

const App: React.FC = () => {
  const [payrollResult, setPayrollResult] = useState<PayrollResultType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 md:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HeroIcon />
            <h1 className="text-xl md:text-2xl font-bold text-gray-700">
              TN Government Staff Payroll Calculator
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <PayrollForm onCalculate={handleCalculate} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-3">
            {isLoading && (
              <div className="flex justify-center items-center h-full bg-white rounded-lg shadow p-8">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin border-t-blue-500"></div>
              </div>
            )}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative shadow" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {payrollResult && <PayrollResult result={payrollResult} />}
            {!payrollResult && !isLoading && !error && (
                 <div className="bg-white rounded-lg shadow p-8 text-center h-full flex flex-col justify-center">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">Welcome!</h2>
                    <p className="text-gray-500">
                        Enter employee details on the left and click "Calculate Full Payroll" to see the detailed breakdown from 2006 to the present.
                    </p>
                </div>
            )}
          </div>
        </div>
      </main>

       <footer className="text-center p-4 mt-8 text-sm text-gray-500">
          <p>
              Built by a world-class senior frontend React engineer.
          </p>
          <p>&copy; {new Date().getFullYear()} Payroll Calculator. All Rights Reserved.</p>
       </footer>
    </div>
  );
};

export default App;