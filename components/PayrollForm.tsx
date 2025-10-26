import React, { useState, useEffect } from 'react';
import { EmployeeInput, CityGrade, Promotion, AnnualIncrementChange } from '../types';
import { PAY_SCALES_6TH_PC, LEVELS, GRADE_PAY_OPTIONS, POSTS } from '../constants';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';

interface PayrollFormProps {
  onCalculate: (data: EmployeeInput) => void;
  isLoading: boolean;
}

const PayrollForm: React.FC<PayrollFormProps> = ({ onCalculate, isLoading }) => {
  const [formData, setFormData] = useState<Omit<EmployeeInput, 'promotions' | 'annualIncrementChanges'>>({
    employeeName: '',
    fatherName: '',
    employeeNo: '',
    cpsGpfNo: '',
    dateOfBirth: '',
    retirementAge: '60',
    dateOfJoining: '',
    dateOfJoiningInOffice: '',
    
    joiningPostId: 'custom',
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

  const [isCustomPayScale, setIsCustomPayScale] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [annualIncrementChanges, setAnnualIncrementChanges] = useState<AnnualIncrementChange[]>([
      { id: Date.now().toString(), effectiveDate: '', incrementMonth: 'jul' }
  ]);
  
  useEffect(() => {
    setAnnualIncrementChanges(prev => {
        const newChanges = [...prev];
        if (newChanges.length > 0) {
            newChanges[0] = { ...newChanges[0], effectiveDate: formData.dateOfJoining };
        } else {
             newChanges.push({ id: Date.now().toString(), effectiveDate: formData.dateOfJoining, incrementMonth: 'jul' });
        }
        return newChanges;
    });
}, [formData.dateOfJoining]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumberInput = ['basicPay2005', 'joiningPayInPayBand'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberInput && value ? Number(value) : value }));
  };
  
  const handlePostChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const postId = e.target.value;
    if (postId === 'custom') {
        setIsCustomPayScale(true);
        setFormData(prev => ({ ...prev, joiningPostId: postId }));
    } else {
        const selectedPost = POSTS.find(p => p.id === postId);
        if (selectedPost) {
            setIsCustomPayScale(false);
            setFormData(prev => ({
                ...prev,
                joiningPostId: postId,
                joiningScaleId: selectedPost.scaleId,
                joiningLevel: selectedPost.level.toString(),
            }));
        }
    }
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

  const handleIncrementChange = (id: string, field: keyof AnnualIncrementChange, value: string) => {
    setAnnualIncrementChanges(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  
  const addIncrementChange = () => {
    setAnnualIncrementChanges(prev => [...prev, { id: Date.now().toString(), effectiveDate: '', incrementMonth: 'jul' }]);
  };
  
  const removeIncrementChange = (id: string) => {
    if (annualIncrementChanges.length > 1) {
        setAnnualIncrementChanges(prev => prev.filter(c => c.id !== id));
    }
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
    onCalculate({ ...formData, promotions, annualIncrementChanges });
  };
  
  const joiningDate = formData.dateOfJoining ? new Date(formData.dateOfJoining) : null;
  const joiningPeriod = joiningDate 
      ? (joiningDate < new Date('2006-01-01') ? 'pre2006' : (joiningDate < new Date('2016-01-01') ? '6thPC' : '7thPC')) 
      : null;

  const joiningPeriodText = {
    pre2006: 'Pre 2006 (5th Pay Commission)',
    '6thPC': '2006 - 2015 (6th Pay Commission)',
    '7thPC': 'Post 2016 (7th Pay Commission)',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="employeeName">Employee Name</Label>
            <Input type="text" name="employeeName" id="employeeName" value={formData.employeeName} onChange={handleChange} placeholder="Enter full name" required />
          </div>
          <div>
            <Label htmlFor="fatherName">Father's Name</Label>
            <Input type="text" name="fatherName" id="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Enter father's name" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeNo">Employee Number</Label>
              <Input type="text" name="employeeNo" id="employeeNo" value={formData.employeeNo} onChange={handleChange} placeholder="Enter employee number" required />
            </div>
            <div>
              <Label htmlFor="cpsGpfNo">CPS / GPF No.</Label>
              <Input type="text" name="cpsGpfNo" id="cpsGpfNo" value={formData.cpsGpfNo} onChange={handleChange} placeholder="Enter account number" required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="dateOfJoining">Date of Joining (Service)</Label>
              <Input type="date" name="dateOfJoining" id="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required />
            </div>
          </div>
           <div>
              <Label htmlFor="dateOfJoiningInOffice">Date of Joining (This Office)</Label>
              <Input type="date" name="dateOfJoiningInOffice" id="dateOfJoiningInOffice" value={formData.dateOfJoiningInOffice} onChange={handleChange} required />
           </div>
           <div>
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Annual Increment Schedule</h3>
                  <Button type="button" onClick={addIncrementChange} className="text-xs py-1 px-2 rounded-md">+ Add Change</Button>
              </div>
              <div className="space-y-2">
                  {annualIncrementChanges.map((change, index) => (
                      <div key={change.id} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                              <Label htmlFor={`inc_date_${change.id}`} className="sr-only">Effective Date</Label>
                              <Input type="date" id={`inc_date_${change.id}`} value={change.effectiveDate} onChange={e => handleIncrementChange(change.id, 'effectiveDate', e.target.value)} disabled={index === 0} required />
                          </div>
                          <div className="col-span-6">
                              <Label htmlFor={`inc_month_${change.id}`} className="sr-only">Increment Month</Label>
                              <Select id={`inc_month_${change.id}`} value={change.incrementMonth} onChange={e => handleIncrementChange(change.id, 'incrementMonth', e.target.value as any)}>
                                  <option value="jan">January</option><option value="apr">April</option><option value="jul">July</option><option value="oct">October</option>
                              </Select>
                          </div>
                          <div className="col-span-1 flex justify-center">{index > 0 && (<button type="button" onClick={() => removeIncrementChange(change.id)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>)}</div>
                      </div>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">First entry defaults to joining date. Add changes if the schedule is modified.</p>
          </div>
          <div>
              <Label>Retirement Age</Label>
              <div className="mt-2 flex items-center space-x-6">
                  <label className="flex items-center"><input type="radio" name="retirementAge" value="58" checked={formData.retirementAge === '58'} onChange={handleChange as any} className="form-radio" /><span className="ml-2">58 Years</span></label>
                  <label className="flex items-center"><input type="radio" name="retirementAge" value="60" checked={formData.retirementAge === '60'} onChange={handleChange as any} className="form-radio" /><span className="ml-2">60 Years</span></label>
              </div>
               <p className="text-xs text-gray-500 mt-2">Calculated Retirement Date: <span className="font-semibold">{getRetirementDate()}</span></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pay at Time of Joining</CardTitle>
          {joiningPeriod && <CardDescription>{joiningPeriodText[joiningPeriod]}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
              <Label htmlFor="joiningPostId">Post at Joining</Label>
              <Select name="joiningPostId" id="joiningPostId" value={formData.joiningPostId} onChange={handlePostChange}>
                  <option value="custom">-- Other / Manual Entry --</option>
                  {POSTS.map(post => <option key={post.id} value={post.id}>{post.name}</option>)}
              </Select>
          </div>
           {joiningPeriod === 'pre2006' && (
              <>
                  <div>
                      <Label htmlFor="joiningScaleId">Pay Scale (as of 31-12-2005)</Label>
                      <Select name="joiningScaleId" id="joiningScaleId" value={formData.joiningScaleId} onChange={handleChange} required disabled={!isCustomPayScale}>
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
                       <Select name="joiningScaleId" id="joiningScaleId" value={formData.joiningScaleId} onChange={handleChange} required disabled={!isCustomPayScale}>
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
                  <Select name="joiningLevel" id="joiningLevel" value={formData.joiningLevel} onChange={handleChange} required disabled={!isCustomPayScale}>
                      {LEVELS.map(level => <option key={level} value={level}>{`Level ${level}`}</option>)}
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Pay will be fixed at the minimum of this Level for new entrants.</p>
              </div>
           )}
           {!joiningPeriod && <p className="text-sm text-gray-500 p-4 text-center">Please select a Date of Joining to enter pay details.</p>}
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Career Events & HRA</CardTitle>
              <CardDescription>Enter dates for grade awards and specify HRA classification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="selectionGradeDate">Selection Grade Date</Label>
                  <Input type="date" name="selectionGradeDate" id="selectionGradeDate" value={formData.selectionGradeDate} onChange={handleChange} />
                  <p className="text-xs text-gray-500 mt-1">Typically after 10 years.</p>
                </div>
                <div>
                  <Label htmlFor="specialGradeDate">Special Grade Date</Label>
                  <Input type="date" name="specialGradeDate" id="specialGradeDate" value={formData.specialGradeDate} onChange={handleChange} />
                   <p className="text-xs text-gray-500 mt-1">Typically after 20 years.</p>
                </div>
              </div>
              <div>
                  <Label htmlFor="superGradeDate">Super Grade (Bonus) Date</Label>
                  <Input type="date" name="superGradeDate" id="superGradeDate" value={formData.superGradeDate} onChange={handleChange} />
                  <p className="text-xs text-gray-500 mt-1">Typically after 30 years.</p>
              </div>
              <div>
                  <Label htmlFor="cityGrade">City/Town Grade for HRA</Label>
                  <Select name="cityGrade" id="cityGrade" value={formData.cityGrade} onChange={handleChange} required>
                    {Object.values(CityGrade).map(grade => (<option key={grade} value={grade}>{grade}</option>))}
                  </Select>
              </div>
          </CardContent>
      </Card>

      <Card>
          <CardHeader className="flex justify-between items-center">
             <CardTitle>Promotions</CardTitle>
             <Button type="button" onClick={addPromotion} className="text-xs py-1 px-3 rounded-md -my-2">+ Add</Button>
          </CardHeader>
          <CardContent className="space-y-3">
              {promotions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No promotions added.</p>}
              {promotions.map((promo) => (
                  <div key={promo.id} className="p-3 border rounded-md relative bg-gray-50/80">
                      <button type="button" onClick={() => removePromotion(promo.id)} className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
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
          </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Calculation Period</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
      </Card>

      <div className="pt-2">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Calculating...' : 'Calculate Full Payroll'}
        </Button>
      </div>
    </form>
  );
};

export default PayrollForm;