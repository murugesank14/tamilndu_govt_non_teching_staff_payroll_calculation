import React, { useState } from 'react';
import { EmployeeInput, CityGrade, Promotion } from '../types';
import { PAY_SCALES_6TH_PC, LEVELS, GRADE_PAY_OPTIONS } from '../constants';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';

interface PayrollFormProps {
  onCalculate: (data: EmployeeInput) => void;
  isLoading: boolean;
}

const PayrollForm: React.FC<PayrollFormProps> = ({ onCalculate, isLoading }) => {
  const [formData, setFormData] = useState<Omit<EmployeeInput, 'promotions'>>({
    employeeName: '',
    cpsGpfNo: '',
    dateOfBirth: '',
    retirementAge: '60',
    dateOfJoining: '',
    
    basicPay2005: undefined,
    joiningScaleId: PAY_SCALES_6TH_PC[12].id,
    joiningPayInPayBand: undefined,
    joiningLevel: '11',

    selectionGradeDate: '',
    specialGradeDate: '',
    superGradeDate: '',

    cityGrade: CityGrade.GRADE_III,
    calculationStartDate: '2006-01-01',
    calculationEndDate: new Date().toISOString().split('T')[0],
  });

  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumberInput = ['basicPay2005', 'joiningPayInPayBand'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberInput && value ? Number(value) : value }));
  };

  const handlePromotionChange = (id: string, field: keyof Promotion, value: string | number) => {
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  
  const addPromotion = () => {
    setPromotions(prev => [...prev, { id: Date.now().toString(), date: '', post: '', level: '12' }]);
  };
  
  const removePromotion = (id: string) => {
    setPromotions(prev => prev.filter(p => p.id !== id));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({ ...formData, promotions });
  };
  
  const joiningDate = formData.dateOfJoining ? new Date(formData.dateOfJoining) : null;
  const joiningPeriod = joiningDate 
      ? (joiningDate < new Date('2006-01-01') ? 'pre2006' : (joiningDate < new Date('2016-01-01') ? '6thPC' : '7thPC')) 
      : null;

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
                    <label className="flex items-center"><input type="radio" name="retirementAge" value="58" checked={formData.retirementAge === '58'} onChange={handleChange as any} className="form-radio" /><span className="ml-2">58 Years</span></label>
                    <label className="flex items-center"><input type="radio" name="retirementAge" value="60" checked={formData.retirementAge === '60'} onChange={handleChange as any} className="form-radio" /><span className="ml-2">60 Years</span></label>
                </div>
                 <p className="text-xs text-gray-500 mt-2">Calculated Retirement Date: <span className="font-semibold">{getRetirementDate()}</span></p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2 mt-6">Pay at Time of Joining</h2>
          <div className="space-y-4">
             {joiningPeriod === 'pre2006' && (
                <>
                    <div>
                        <Label htmlFor="joiningScaleId">Pay Scale (as of 31-12-2005)</Label>
                        <Select name="joiningScaleId" id="joiningScaleId" value={formData.joiningScaleId} onChange={handleChange} required>
                          {PAY_SCALES_6TH_PC.map(ps => (<option key={ps.id} value={ps.id}>{ps.scale}</option>))}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="basicPay2005">Basic Pay in the above scale</Label>
                        <Input type="number" name="basicPay2005" id="basicPay2005" value={formData.basicPay2005 ?? ''} onChange={handleChange} placeholder="e.g., 5500" required />
                    </div>
                </>
             )}
             {joiningPeriod === '6thPC' && (
                <>
                     <div>
                        <Label htmlFor="joiningScaleId">Pay Band + Grade Pay</Label>
                         <Select name="joiningScaleId" id="joiningScaleId" value={formData.joiningScaleId} onChange={handleChange} required>
                          {PAY_SCALES_6TH_PC.map(ps => (<option key={ps.id} value={ps.id}>{`${ps.payBand} + ${ps.gradePay} GP`}</option>))}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="joiningPayInPayBand">Pay in the Pay Band</Label>
                        <Input type="number" name="joiningPayInPayBand" id="joiningPayInPayBand" value={formData.joiningPayInPayBand ?? ''} onChange={handleChange} placeholder="e.g., 10230" required />
                    </div>
                </>
             )}
             {joiningPeriod === '7thPC' && (
                <div>
                    <Label htmlFor="joiningLevel">Level of Pay</Label>
                    <Select name="joiningLevel" id="joiningLevel" value={formData.joiningLevel} onChange={handleChange} required>
                        {LEVELS.map(level => <option key={level} value={level}>{`Level ${level}`}</option>)}
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Pay will be fixed at the minimum of this Level as per rules for new entrants.</p>
                </div>
             )}
             {!joiningPeriod && <p className="text-sm text-gray-500">Please select a Date of Joining to enter pay details.</p>}
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2 mt-6">Career Events</h2>
          <div className="space-y-4">
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
                <Label htmlFor="superGradeDate">Super Grade Date (if any)</Label>
                <Input type="date" name="superGradeDate" id="superGradeDate" value={formData.superGradeDate} onChange={handleChange} />
                <p className="text-xs text-gray-500 mt-1">Awarded after 10 years in Special Grade.</p>
              </div>

              <div>
                <Label htmlFor="cityGrade">City/Town Grade for HRA</Label>
                <Select name="cityGrade" id="cityGrade" value={formData.cityGrade} onChange={handleChange} required>
                  {Object.values(CityGrade).map(grade => (<option key={grade} value={grade}>{grade}</option>))}
                </Select>
              </div>
          </div>
        </div>

        <div>
            <div className="flex justify-between items-center mb-4 mt-6 border-b pb-2">
                 <h2 className="text-xl font-bold text-gray-700">Promotions</h2>
                 <Button type="button" onClick={addPromotion} className="text-xs py-1 px-3 rounded-md">+ Add Promotion</Button>
            </div>
            <div className="space-y-4">
                {promotions.map((promo, index) => (
                    <div key={promo.id} className="p-4 border rounded-md relative bg-gray-50">
                        <button type="button" onClick={() => removePromotion(promo.id)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">&times;</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                                <Label htmlFor={`promo_date_${promo.id}`}>Date of Promotion</Label>
                                <Input type="date" id={`promo_date_${promo.id}`} value={promo.date} onChange={e => handlePromotionChange(promo.id, 'date', e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor={`promo_post_${promo.id}`}>Post of Promotion</Label>
                                <Input type="text" id={`promo_post_${promo.id}`} value={promo.post} onChange={e => handlePromotionChange(promo.id, 'post', e.target.value)} placeholder="e.g., Superintendent"/>
                            </div>
                            {promo.date && new Date(promo.date) < new Date('2016-01-01') ? (
                                <div className="md:col-span-2">
                                    <Label htmlFor={`promo_gp_${promo.id}`}>New Grade Pay</Label>
                                     <Select id={`promo_gp_${promo.id}`} value={promo.gradePay ?? ''} onChange={e => handlePromotionChange(promo.id, 'gradePay', Number(e.target.value))}>
                                        <option value="">Select Grade Pay</option>
                                        {GRADE_PAY_OPTIONS.map(gp => <option key={gp} value={gp}>{gp}</option>)}
                                    </Select>
                                </div>
                            ) : (
                                <div className="md:col-span-2">
                                    <Label htmlFor={`promo_level_${promo.id}`}>New Level of Pay</Label>
                                     <Select id={`promo_level_${promo.id}`} value={promo.level ?? ''} onChange={e => handlePromotionChange(promo.id, 'level', e.target.value)}>
                                        <option value="">Select Level</option>
                                        {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
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
