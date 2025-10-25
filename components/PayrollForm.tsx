import React, { useState } from 'react';
import { EmployeeInput, CityGrade } from '../types';
import { PAY_SCALES_6TH_PC, LEVELS } from '../constants';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';

interface PayrollFormProps {
  onCalculate: (data: EmployeeInput) => void;
  isLoading: boolean;
}

const PayrollForm: React.FC<PayrollFormProps> = ({ onCalculate, isLoading }) => {
  const [formData, setFormData] = useState<EmployeeInput>({
    employeeName: '',
    cpsGpfNo: '',
    dateOfBirth: '',
    retirementAge: '60',
    dateOfJoining: '',
    basicPay2005: 5500,
    scaleId: "5500-175-9000",
    selectionGradeDate: '',
    specialGradeDate: '',
    promotionDate: '',
    promotionPost: '',
    promotionLevel: '12',
    cityGrade: CityGrade.GRADE_III,
    calculationStartDate: '2006-01-01',
    calculationEndDate: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'basicPay2005' ? Number(value) : value }));
  };

   const handleRetirementAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target as { value: '58' | '60' };
    setFormData(prev => ({ ...prev, retirementAge: value }));
  };

  const getRetirementDate = () => {
    if (!formData.dateOfBirth) return 'N/A';
    try {
        const dob = new Date(formData.dateOfBirth);
        if (isNaN(dob.getTime())) return 'Invalid Date';
        const retirementYear = dob.getFullYear() + parseInt(formData.retirementAge, 10);
        const retirementMonth = dob.getMonth();
        const lastDay = new Date(retirementYear, retirementMonth + 1, 0);
        return lastDay.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch {
        return 'Invalid Date';
    }
  }

  const showPromotionLevel = formData.promotionDate && new Date(formData.promotionDate) >= new Date('2016-01-01');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(formData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">Personal Details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="employeeName">Employee Name</Label>
              <Input type="text" name="employeeName" id="employeeName" value={formData.employeeName} onChange={handleChange} placeholder="Enter full name" required />
            </div>
            <div>
              <Label htmlFor="cpsGpfNo">CPS / GPF No.</Label>
              <Input type="text" name="cpsGpfNo" id="cpsGpfNo" value={formData.cpsGpfNo} onChange={handleChange} placeholder="Enter account number" required />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required />
            </div>
             <div>
              <Label htmlFor="dateOfJoining">Date of Joining</Label>
              <Input type="date" name="dateOfJoining" id="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required />
            </div>
            <div>
                <Label>Retirement Age</Label>
                <div className="mt-2 flex items-center space-x-6">
                    <label className="flex items-center">
                        <input type="radio" name="retirementAge" value="58" checked={formData.retirementAge === '58'} onChange={handleRetirementAgeChange} className="form-radio" />
                        <span className="ml-2">58 Years</span>
                    </label>
                    <label className="flex items-center">
                        <input type="radio" name="retirementAge" value="60" checked={formData.retirementAge === '60'} onChange={handleRetirementAgeChange} className="form-radio" />
                        <span className="ml-2">60 Years</span>
                    </label>
                </div>
                 <p className="text-xs text-gray-500 mt-2">Calculated Retirement Date: <span className="font-semibold">{getRetirementDate()}</span></p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2 mt-6">Service &amp; Pay Details</h2>
          <div className="space-y-4">
             <div>
                <Label htmlFor="payScale2005">Pay Scale (as of 31-12-2005)</Label>
                <Select name="scaleId" id="payScale2005" value={formData.scaleId} onChange={handleChange} required>
                  {PAY_SCALES_6TH_PC.map(ps => (
                    <option key={ps.id} value={ps.id}>{ps.scale}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="basicPay2005">Basic Pay in the above scale (as of 31-12-2005)</Label>
                <Input type="number" name="basicPay2005" id="basicPay2005" value={formData.basicPay2005} onChange={handleChange} placeholder="e.g., 5500" required />
              </div>

              <div>
                <Label htmlFor="selectionGradeDate">Selection Grade Date (if any)</Label>
                <Input type="date" name="selectionGradeDate" id="selectionGradeDate" value={formData.selectionGradeDate} onChange={handleChange} />
                <p className="text-xs text-gray-500 mt-1">Awarded on completion of 10 years service.</p>
              </div>
              
              <div>
                <Label htmlFor="specialGradeDate">Special Grade Date (if any)</Label>
                <Input type="date" name="specialGradeDate" id="specialGradeDate" value={formData.specialGradeDate} onChange={handleChange} />
                <p className="text-xs text-gray-500 mt-1">Awarded on completion of 20 years service.</p>
              </div>

              <div>
                <Label htmlFor="cityGrade">City/Town Grade for HRA</Label>
                <Select name="cityGrade" id="cityGrade" value={formData.cityGrade} onChange={handleChange} required>
                  {Object.values(CityGrade).map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </Select>
              </div>
          </div>
        </div>

        <div>
            <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2 mt-6">Promotion Details (if any)</h2>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="promotionDate">Date of Promotion</Label>
                    <Input type="date" name="promotionDate" id="promotionDate" value={formData.promotionDate} onChange={handleChange} />
                </div>
                 <div>
                    <Label htmlFor="promotionPost">Post of Promotion</Label>
                    <Input type="text" name="promotionPost" id="promotionPost" value={formData.promotionPost} onChange={handleChange} placeholder="e.g., Assistant" />
                </div>
                {showPromotionLevel && (
                    <div>
                        <Label htmlFor="promotionLevel">Level of Pay (for promotion on/after 01.01.2016)</Label>
                        <Select name="promotionLevel" id="promotionLevel" value={formData.promotionLevel} onChange={handleChange}>
                            {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                        </Select>
                    </div>
                )}
            </div>
        </div>
        
        <div>
            <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2 mt-6">Calculation Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="calculationStartDate">Calculate From</Label>
                    <Input type="date" name="calculationStartDate" id="calculationStartDate" value={formData.calculationStartDate} onChange={handleChange} required />
                </div>
                 <div>
                    <Label htmlFor="calculationEndDate">Calculate To</Label>
                    <Input type="date" name="calculationEndDate" id="calculationEndDate" value={formData.calculationEndDate} onChange={handleChange} required />
                </div>
            </div>
        </div>


        <div className="pt-4">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Calculating...' : 'Calculate Full Payroll'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PayrollForm;