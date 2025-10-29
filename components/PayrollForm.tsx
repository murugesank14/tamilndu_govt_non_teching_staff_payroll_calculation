import React, { useState, useEffect } from 'react';
import { EmployeeInput, CityGrade, Promotion, AnnualIncrementChange, BreakInService } from '../types';
import { PAY_SCALES_6TH_PC, LEVELS, GRADE_PAY_OPTIONS, POSTS, PAY_SCALES_5TH_PC, PAY_SCALES_4TH_PC, PROBATION_PERIOD_OPTIONS } from '../constants';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { TrashIcon } from './ui/Icons';
import { useLanguage } from './LanguageProvider';
import { AutocompleteInput } from './ui/AutocompleteInput';

interface PayrollFormProps {
  onCalculate: (data: EmployeeInput) => void;
  isLoading: boolean;
}

// Pre-filled data for Murugesan K based on user request to correct the payroll report.
const initialFormData: Omit<EmployeeInput, 'promotions' | 'annualIncrementChanges' | 'breaksInService'> = {
    employeeName: 'Murugesan K',
    fatherName: 'Kasi S',
    employeeNo: '16010101980',
    cpsGpfNo: '7224886',
    panNumber: 'CJXPM7687K',
    bankAccountNumber: '20174970639',
    dateOfBirth: '1975-05-30',
    retirementAge: '60',
    dateOfJoining: '2012-04-12',
    dateOfJoiningInOffice: '2013-07-05',
    dateOfRelief: '',
    
    joiningPostId: 'custom',
    joiningPostCustomName: 'Assistant Inspector',
    joiningBasicPay4thPC: undefined,
    joiningScaleId4thPC: PAY_SCALES_4TH_PC[1].id,
    joiningBasicPay5thPC: undefined,
    joiningScaleId5thPC: PAY_SCALES_5TH_PC[10].id,
    joiningPayInPayBand: 9708,
    joiningScaleId6thPC: 'PB2-4300', // Scale with Grade Pay 4300 to match 7th PC fixation to Level 12
    joiningLevel: '12',

    selectionGradeDate: '2023-07-01',
    selectionGradeTwoIncrements: true, // This is handled by rules, but kept for legacy
    specialGradeDate: '',
    specialGradeTwoIncrements: true,
    superGradeDate: '',
    probationDeclarationDate: '',
    stagnationIncrementDate: '',
    probationPeriod: 2,
    accountTestPassDate: '2014-12-01',
    departmentTestPassDate: '',
    
    incrementEligibilityMonths: 6,

    cityGrade: CityGrade.GRADE_II, // Sivagangai likely falls under Grade II
    calculationStartDate: '2014-01-01',
    calculationEndDate: '2025-09-30',
    
    festivalAdvance: undefined,
    carAdvance: undefined,
    twoWheelerAdvance: undefined,
    computerAdvance: undefined,
    otherPayables: undefined,
};

const PayrollForm: React.FC<PayrollFormProps> = ({ onCalculate, isLoading }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [promotions, setPromotions] = useState<Promotion[]>([
      // Pre-filled promotion details for Murugesan K
      {
          id: 'promo1',
          date: '2023-12-29',
          post: 'Deputy Inspector',
          level: '18', // Corrected level for Deputy Inspector
          rule22bOption: 'nextIncrementDate'
      }
  ]);
  const [annualIncrementChanges, setAnnualIncrementChanges] = useState<AnnualIncrementChange[]>([
      { id: Date.now().toString(), effectiveDate: initialFormData.dateOfJoining, incrementMonth: 'jul' }
  ]);
  const [breaksInService, setBreaksInService] = useState<BreakInService[]>([]);
  const [duplicatePromotionError, setDuplicatePromotionError] = useState<{[key: string]: string | null}>({});
  const { t } = useLanguage();
  
  const isCustomPost = formData.joiningPostId === 'custom';
  
  const promotionPostSuggestions = [
      ...new Set([
          ...POSTS.map(p => p.name), 
          ...promotions.map(p => p.post).filter(Boolean)
      ])
  ];

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
    const { name, value, type } = e.target;
    const isNumberInput = ['joiningBasicPay4thPC', 'joiningBasicPay5thPC', 'joiningPayInPayBand', 'festivalAdvance', 'carAdvance', 'twoWheelerAdvance', 'computerAdvance', 'otherPayables', 'incrementEligibilityMonths', 'probationPeriod'].includes(name);
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: isNumberInput && value ? Number(value) : value }));
    }
  };
  
  const handlePostChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const postId = e.target.value;
    const selectedPost = POSTS.find(p => p.id === postId);
    if (selectedPost) {
        setFormData(prev => ({
            ...prev,
            joiningPostId: postId,
            joiningScaleId6thPC: selectedPost.scaleId,
            joiningLevel: selectedPost.level.toString(),
        }));
    } else {
        setFormData(prev => ({ ...prev, joiningPostId: 'custom' }));
    }
  };

  const handlePromotionChange = (id: string, field: keyof Promotion, value: string | number) => {
    if (field === 'post' && typeof value === 'string') {
        const isDuplicate = promotions.some(p => 
            p.id !== id && 
            p.post.trim().toLowerCase() === value.trim().toLowerCase() &&
            value.trim() !== ''
        );
        setDuplicatePromotionError(prev => ({
            ...prev,
            [id]: isDuplicate ? '⚠️ Entry already exists / பதிவை ஏற்கனவே சேர்த்துள்ளீர்கள்.' : null
        }));
    }
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  
  const addPromotion = () => {
    const newId = Date.now().toString();
    setPromotions(prev => [...prev, { id: newId, date: '', post: '', level: '12', rule22bOption: 'promotionDate' }]);
    setDuplicatePromotionError(prev => ({...prev, [newId]: null}));
  };
  
  const removePromotion = (id: string) => {
    setPromotions(prev => prev.filter(p => p.id !== id));
    setDuplicatePromotionError(prev => {
        const newErrors = {...prev};
        delete newErrors[id];
        return newErrors;
    });
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
  
  const addBreakInService = () => {
    setBreaksInService(prev => [...prev, { id: Date.now().toString(), startDate: '', endDate: '' }]);
  };

  const removeBreakInService = (id: string) => {
    setBreaksInService(prev => prev.filter(b => b.id !== id));
  };

  const handleBreakInServiceChange = (id: string, field: keyof BreakInService, value: string) => {
    setBreaksInService(prev => prev.map(b => (b.id === id ? { ...b, [field]: value } : b)));
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
  
  const handleReset = () => {
      // Reset to a blank state, not the pre-filled one
      const blankState: Omit<EmployeeInput, 'promotions' | 'annualIncrementChanges' | 'breaksInService'> = {
          ...initialFormData,
          employeeName: '', fatherName: '', employeeNo: '', cpsGpfNo: '', panNumber: '', bankAccountNumber: '',
          dateOfBirth: '', dateOfJoining: '', dateOfJoiningInOffice: '', joiningPayInPayBand: undefined,
          accountTestPassDate: '', selectionGradeDate: '',
          calculationStartDate: '1984-10-01', calculationEndDate: new Date().toISOString().split('T')[0],
      };
      setFormData(blankState);
      setPromotions([]);
      setBreaksInService([]);
      setAnnualIncrementChanges([{ id: Date.now().toString(), effectiveDate: '', incrementMonth: 'jul' }]);
      setDuplicatePromotionError({});
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({ ...formData, promotions, annualIncrementChanges, breaksInService });
  };
  
  const joiningDate = formData.dateOfJoining ? new Date(formData.dateOfJoining) : null;
  const joiningPeriod = joiningDate 
    ? (joiningDate < new Date('1996-01-01') ? '4thPC'
    : (joiningDate < new Date('2006-01-01') ? '5thPC'
    : (joiningDate < new Date('2016-01-01') ? '6thPC' : '7thPC')))
    : null;
  
  const hasDuplicateErrors = Object.values(duplicatePromotionError).some(error => error !== null);

  const isSgPre2016 = formData.selectionGradeDate && new Date(formData.selectionGradeDate) < new Date('2016-01-01');
  const isSgPost2016 = formData.selectionGradeDate && new Date(formData.selectionGradeDate) >= new Date('2016-01-01');
  const isSpGPre2016 = formData.specialGradeDate && new Date(formData.specialGradeDate) < new Date('2016-01-01');
  const isSpGPost2016 = formData.specialGradeDate && new Date(formData.specialGradeDate) >= new Date('2016-01-01');


  return (
    <form onSubmit={handleSubmit} onReset={handleReset} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('personalDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeName">{t('employeeName')}</Label>
                <Input type="text" name="employeeName" id="employeeName" value={formData.employeeName} onChange={handleChange} placeholder={t('enterFullName')} required />
              </div>
              <div>
                <Label htmlFor="fatherName">{t('fatherName')}</Label>
                <Input type="text" name="fatherName" id="fatherName" value={formData.fatherName} onChange={handleChange} placeholder={t('enterFatherName')} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employeeNo">{t('employeeNo')}</Label>
                <Input type="text" name="employeeNo" id="employeeNo" value={formData.employeeNo} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="cpsGpfNo">{t('cpsGpfNo')}</Label>
                <Input type="text" name="cpsGpfNo" id="cpsGpfNo" value={formData.cpsGpfNo} onChange={handleChange} required />
              </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="panNumber">{t('panNumber')}</Label>
                <Input type="text" name="panNumber" id="panNumber" value={formData.panNumber} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="bankAccountNumber">{t('bankAccountNumber')}</Label>
                <Input type="text" name="bankAccountNumber" id="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">{t('dateOfBirth')}</Label>
                <Input type="date" name="dateOfBirth" id="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required />
              </div>
              <div>
                <Label htmlFor="dateOfJoiningService">{t('dateOfJoiningService')}</Label>
                <Input type="date" name="dateOfJoining" id="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} required />
              </div>
            </div>
            <div>
                <Label htmlFor="dateOfJoiningInOffice">{t('dateOfJoiningOffice')}</Label>
                <Input type="date" name="dateOfJoiningInOffice" id="dateOfJoiningInOffice" value={formData.dateOfJoiningInOffice} onChange={handleChange} required />
            </div>
           <div>
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">{t('annualIncrementSchedule')}</h3>
                  <Button type="button" onClick={addIncrementChange} variant="ghost" size="sm">{t('addChange')}</Button>
              </div>
              <div className="space-y-2">
                  {annualIncrementChanges.map((change, index) => (
                      <div key={change.id} className="flex items-center gap-2">
                          <div className="flex-1">
                              <Label htmlFor={`inc_date_${change.id}`} className="sr-only">Effective Date</Label>
                              <Input type="date" id={`inc_date_${change.id}`} value={change.effectiveDate} onChange={e => handleIncrementChange(change.id, 'effectiveDate', e.target.value)} disabled={index === 0} required />
                          </div>
                          <div className="flex-1">
                              <Label htmlFor={`inc_month_${change.id}`} className="sr-only">Increment Month</Label>
                              <Select id={`inc_month_${change.id}`} value={change.incrementMonth} onChange={e => handleIncrementChange(change.id, 'incrementMonth', e.target.value as any)}>
                                  <option value="jan">January</option><option value="apr">April</option><option value="jul">July</option><option value="oct">October</option>
                              </Select>
                          </div>
                          <div>{index > 0 && (<Button type="button" onClick={() => removeIncrementChange(change.id)} variant="destructive" size="icon"><TrashIcon /></Button>)}</div>
                      </div>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('incrementScheduleHelpText')}</p>
          </div>
          <div>
              <Label>{t('retirementAge')}</Label>
              <div className="mt-2 flex items-center space-x-6">
                  <label className="flex items-center"><input type="radio" name="retirementAge" value="58" checked={formData.retirementAge === '58'} onChange={handleChange as any} className="form-radio" /><span className="ml-2">{t('retirementAge58')}</span></label>
                  <label className="flex items-center"><input type="radio" name="retirementAge" value="60" checked={formData.retirementAge === '60'} onChange={handleChange as any} className="form-radio" /><span className="ml-2">{t('retirementAge60')}</span></label>
              </div>
               <p className="text-xs text-gray-500 mt-2">{t('calculatedRetirementDate')}: <span className="font-semibold">{getRetirementDate()}</span></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('payAtJoining')}</CardTitle>
          {joiningPeriod === '4thPC' && <CardDescription>{t('payAtJoiningDesc4thPC')}</CardDescription>}
          {joiningPeriod === '5thPC' && <CardDescription>{t('payAtJoiningDesc5thPC')}</CardDescription>}
          {joiningPeriod === '6thPC' && <CardDescription>{t('payAtJoiningDesc6thPC')}</CardDescription>}
          {joiningPeriod === '7thPC' && <CardDescription>{t('payAtJoiningDesc7thPC')}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
              <Label htmlFor="joiningPostId">{t('postAtJoining')}</Label>
              <Select name="joiningPostId" id="joiningPostId" value={formData.joiningPostId} onChange={handlePostChange}>
                  <option value="custom">-- Other / Manual Entry --</option>
                  {POSTS.map(post => <option key={post.id} value={post.id}>{post.name}</option>)}
              </Select>
          </div>
           {isCustomPost && (
              <div>
                  <Label htmlFor="joiningPostCustomName">{t('customPostName')}</Label>
                  <Input type="text" name="joiningPostCustomName" id="joiningPostCustomName" value={formData.joiningPostCustomName ?? ''} onChange={handleChange} required />
              </div>
            )}
           {joiningPeriod === '4thPC' && (
              <>
                  <div>
                      <Label htmlFor="joiningScaleId4thPC">{t('payScale4thPC')}</Label>
                      <Select name="joiningScaleId4thPC" id="joiningScaleId4thPC" value={formData.joiningScaleId4thPC} onChange={handleChange} required >
                        {PAY_SCALES_4TH_PC.map(ps => (<option key={ps.id} value={ps.id}>{ps.scale}</option>))}
                      </Select>
                  </div>
                  <div>
                      <Label htmlFor="joiningBasicPay4thPC">{t('basicPayAtJoining')}</Label>
                      <Input type="number" name="joiningBasicPay4thPC" id="joiningBasicPay4thPC" value={formData.joiningBasicPay4thPC ?? ''} onChange={handleChange} required />
                  </div>
              </>
           )}
           {joiningPeriod === '5thPC' && (
              <>
                  <div>
                      <Label htmlFor="joiningScaleId5thPC">{t('payScale5thPC')}</Label>
                      <Select name="joiningScaleId5thPC" id="joiningScaleId5thPC" value={formData.joiningScaleId5thPC} onChange={handleChange} required >
                        {PAY_SCALES_5TH_PC.map(ps => (<option key={ps.id} value={ps.id}>{ps.scale}</option>))}
                      </Select>
                  </div>
                  <div>
                      <Label htmlFor="joiningBasicPay5thPC">{t('basicPayAtJoining')}</Label>
                      <Input type="number" name="joiningBasicPay5thPC" id="joiningBasicPay5thPC" value={formData.joiningBasicPay5thPC ?? ''} onChange={handleChange} required />
                  </div>
              </>
           )}
           {joiningPeriod === '6thPC' && (
              <>
                   <div>
                      <Label htmlFor="joiningScaleId6thPC">{t('payBandGradePay')}</Label>
                       <Select name="joiningScaleId6thPC" id="joiningScaleId6thPC" value={formData.joiningScaleId6thPC} onChange={handleChange} required disabled={!isCustomPost}>
                        {PAY_SCALES_6TH_PC.map(ps => (<option key={ps.id} value={ps.id}>{`${ps.payBand} + ${ps.gradePay} GP`}</option>))}
                      </Select>
                  </div>
                  <div>
                      <Label htmlFor="joiningPayInPayBand">{t('payInPayBand')}</Label>
                      <Input type="number" name="joiningPayInPayBand" id="joiningPayInPayBand" value={formData.joiningPayInPayBand ?? ''} onChange={handleChange} required />
                  </div>
              </>
           )}
           {joiningPeriod === '7thPC' && (
              <div>
                  <Label htmlFor="joiningLevel">{t('levelOfPay')}</Label>
                  <Select name="joiningLevel" id="joiningLevel" value={formData.joiningLevel} onChange={handleChange} required disabled={!isCustomPost}>
                      {LEVELS.map(level => <option key={level} value={level}>{`Level ${level}`}</option>)}
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">{t('newEntrantHelpText')}</p>
              </div>
           )}
           {!joiningPeriod && <p className="text-sm text-gray-500 p-4 text-center">{t('selectDatePrompt')}</p>}
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>{t('careerEventsHRA')}</CardTitle>
              <CardDescription>{t('careerEventsHRADesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <Label htmlFor="selectionGradeDate">{t('selectionGradeDate')}</Label>
                  <Input type="date" name="selectionGradeDate" id="selectionGradeDate" value={formData.selectionGradeDate} onChange={handleChange} />
                  {isSgPre2016 && <div className="mt-2 text-xs"><label><input type="checkbox" name="selectionGradeTwoIncrements" checked={formData.selectionGradeTwoIncrements} onChange={handleChange} /> Apply 2 Increments</label></div>}
                  {isSgPost2016 && <p className="text-xs text-gray-500 mt-2">{t('gradeFixationNotePost2016')}</p>}
                </div>
                <div>
                  <Label htmlFor="specialGradeDate">{t('specialGradeDate')}</Label>
                  <Input type="date" name="specialGradeDate" id="specialGradeDate" value={formData.specialGradeDate} onChange={handleChange} />
                  {isSpGPre2016 && <div className="mt-2 text-xs"><label><input type="checkbox" name="specialGradeTwoIncrements" checked={formData.specialGradeTwoIncrements} onChange={handleChange} /> Apply 2 Increments</label></div>}
                  {isSpGPost2016 && <p className="text-xs text-gray-500 mt-2">{t('gradeFixationNotePost2016')}</p>}
                </div>
                 <div>
                  <Label htmlFor="superGradeDate">{t('superGradeDate')}</Label>
                  <Input type="date" name="superGradeDate" id="superGradeDate" value={formData.superGradeDate} onChange={handleChange} />
                </div>
                
                 <div>
                  <Label htmlFor="stagnationIncrementDate">{t('stagnationIncrementDate')}</Label>
                  <Input type="date" name="stagnationIncrementDate" id="stagnationIncrementDate" value={formData.stagnationIncrementDate ?? ''} onChange={handleChange} />
                  <p className="text-xs text-gray-500 mt-1">{t('stagnationHelpText')}</p>
                </div>
                 <div>
                  <Label htmlFor="dateOfRelief">{t('dateOfRelief')}</Label>
                  <Input type="date" name="dateOfRelief" id="dateOfRelief" value={formData.dateOfRelief ?? ''} onChange={handleChange} />
                  <p className="text-xs text-gray-500 mt-1">{t('reliefHelpText')}</p>
                </div>
                 <div>
                  <Label htmlFor="cityGrade">{t('cityGradeHRA')}</Label>
                  <Select name="cityGrade" id="cityGrade" value={formData.cityGrade} onChange={handleChange} required>
                    {Object.values(CityGrade).map(grade => (<option key={grade} value={grade}>{grade}</option>))}
                  </Select>
                 </div>
                 <div className="sm:col-span-2">
                    <Label htmlFor="incrementEligibilityMonths">{t('incrementEligibility')}</Label>
                    <Input type="number" name="incrementEligibilityMonths" id="incrementEligibilityMonths" value={formData.incrementEligibilityMonths} onChange={handleChange} required />
                    <p className="text-xs text-gray-500 mt-1">{t('incrementEligibilityHelpText')}</p>
                 </div>
              </div>
              <div className="pt-6 border-t">
                  <h4 className="text-md font-semibold text-gray-800 mb-2">{t('probationServiceTests')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                       <div>
                          <Label htmlFor="probationPeriod">{t('probationPeriod')}</Label>
                           <Select name="probationPeriod" id="probationPeriod" value={formData.probationPeriod} onChange={handleChange}>
                               {PROBATION_PERIOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                           </Select>
                       </div>
                       <div>
                          <Label htmlFor="probationDeclarationDate">{t('probationDeclarationDate')}</Label>
                          <Input type="date" name="probationDeclarationDate" id="probationDeclarationDate" value={formData.probationDeclarationDate ?? ''} onChange={handleChange} />
                          <p className="text-xs text-gray-500 mt-1">{t('probationHelpText')}</p>
                       </div>
                       <div>
                          <Label htmlFor="accountTestPassDate">{t('accountTest')}</Label>
                          <Input type="date" name="accountTestPassDate" id="accountTestPassDate" value={formData.accountTestPassDate ?? ''} onChange={handleChange} />
                          <p className="text-xs text-gray-500 mt-1">{t('passDateHelpText')}</p>
                       </div>
                       <div>
                          <Label htmlFor="departmentTestPassDate">{t('departmentTest')}</Label>
                          <Input type="date" name="departmentTestPassDate" id="departmentTestPassDate" value={formData.departmentTestPassDate ?? ''} onChange={handleChange} />
                          <p className="text-xs text-gray-500 mt-1">{t('passDateHelpText')}</p>
                       </div>
                  </div>
              </div>
          </CardContent>
      </Card>
      
      {formData.dateOfRelief && (
          <Card>
              <CardHeader>
                  <CardTitle>{t('advancesLPC')}</CardTitle>
                  <CardDescription>{t('advancesLPCDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="festivalAdvance">{t('festivalAdvance')}</Label>
                            <Input type="number" name="festivalAdvance" id="festivalAdvance" value={formData.festivalAdvance ?? ''} onChange={handleChange} />
                        </div>
                        <div>
                            <Label htmlFor="carAdvance">{t('carAdvance')}</Label>
                            <Input type="number" name="carAdvance" id="carAdvance" value={formData.carAdvance ?? ''} onChange={handleChange} />
                        </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="twoWheelerAdvance">{t('twoWheelerAdvance')}</Label>
                            <Input type="number" name="twoWheelerAdvance" id="twoWheelerAdvance" value={formData.twoWheelerAdvance ?? ''} onChange={handleChange} />
                        </div>
                        <div>
                            <Label htmlFor="computerAdvance">{t('computerAdvance')}</Label>
                            <Input type="number" name="computerAdvance" id="computerAdvance" value={formData.computerAdvance ?? ''} onChange={handleChange} />
                        </div>
                   </div>
                   <div>
                        <Label htmlFor="otherPayables">{t('otherPayables')}</Label>
                        <Input type="number" name="otherPayables" id="otherPayables" value={formData.otherPayables ?? ''} onChange={handleChange} />
                   </div>
              </CardContent>
          </Card>
      )}

      <Card>
          <CardHeader className="flex justify-between items-center">
             <CardTitle>{t('promotions')}</CardTitle>
             <Button type="button" onClick={addPromotion} variant="ghost" size="sm">{t('add')}</Button>
          </CardHeader>
          <CardContent className="space-y-3">
              {promotions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No promotions added.</p>}
              {promotions.map((promo) => (
                  <div key={promo.id} className="p-3 border rounded-md bg-gray-50/80 space-y-3">
                      <div className="flex justify-between items-start">
                         <div className="flex-1 space-y-1">
                            <Label htmlFor={`promo_post_${promo.id}`}>{t('postOfPromotion')}</Label>
                            <AutocompleteInput
                                id={`promo_post_${promo.id}`}
                                value={promo.post}
                                onValueChange={value => handlePromotionChange(promo.id, 'post', value)}
                                suggestions={promotionPostSuggestions}
                                placeholder={t('typeOrSelectPost')}
                            />
                            {duplicatePromotionError[promo.id] && (
                                <p className="text-sm text-red-600 mt-1">{duplicatePromotionError[promo.id]}</p>
                            )}
                         </div>
                         <Button type="button" onClick={() => removePromotion(promo.id)} variant="destructive" size="icon" className="ml-2 mt-5"><TrashIcon /></Button>
                      </div>

                      <div>
                          <Label htmlFor={`promo_date_${promo.id}`}>{t('dateOfPromotion')}</Label>
                          <Input type="date" id={`promo_date_${promo.id}`} value={promo.date} onChange={e => handlePromotionChange(promo.id, 'date', e.target.value)} />
                      </div>
                      
                      {promo.date && new Date(promo.date) < new Date('2016-01-01') ? (
                          <div>
                              <Label htmlFor={`promo_gp_${promo.id}`}>{t('newGradePay')}</Label>
                               <Select id={`promo_gp_${promo.id}`} value={promo.gradePay ?? ''} onChange={e => handlePromotionChange(promo.id, 'gradePay', Number(e.target.value))}>
                                  <option value="">Select Grade Pay</option>
                                  {GRADE_PAY_OPTIONS.map(gp => <option key={gp} value={gp}>{gp}</option>)}
                              </Select>
                          </div>
                      ) : (
                          <div>
                              <Label htmlFor={`promo_level_${promo.id}`}>{t('newLevelOfPay')}</Label>
                               <Select id={`promo_level_${promo.id}`} value={promo.level ?? ''} onChange={e => handlePromotionChange(promo.id, 'level', e.target.value)}>
                                  <option value="">Select Level</option>
                                  {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                              </Select>
                          </div>
                      )}

                      {promo.date && new Date(promo.date) >= new Date('2016-01-01') && (
                          <div className="pt-2">
                              <Label className="font-semibold">{t('optionUnder22b')}</Label>
                              <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0 text-sm">
                                  <label className="flex items-center">
                                      <input type="radio" name={`rule22bOption_${promo.id}`} value="promotionDate" 
                                      checked={promo.rule22bOption === 'promotionDate'} 
                                      onChange={() => handlePromotionChange(promo.id, 'rule22bOption', 'promotionDate')} 
                                      className="form-radio" />
                                      <span className="ml-2">{t('optionDateOfPromotion')}</span>
                                  </label>
                                  <label className="flex items-center">
                                      <input type="radio" name={`rule22bOption_${promo.id}`} value="nextIncrementDate" 
                                      checked={promo.rule22bOption === 'nextIncrementDate'}
                                      onChange={() => handlePromotionChange(promo.id, 'rule22bOption', 'nextIncrementDate')}
                                      className="form-radio" />
                                      <span className="ml-2">{t('optionNextIncrement')}</span>
                                  </label>
                              </div>
                          </div>
                      )}
                  </div>
              ))}
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex justify-between items-center">
            <CardTitle>{t('breaksInService')}</CardTitle>
            <Button type="button" onClick={addBreakInService} variant="ghost" size="sm">{t('addBreak')}</Button>
        </CardHeader>
        <CardContent className="space-y-3">
            {breaksInService.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No breaks in service added.</p>}
            {breaksInService.map((breakItem) => (
                <div key={breakItem.id} className="p-3 border rounded-md bg-gray-50/80">
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <Label htmlFor={`break_start_${breakItem.id}`}>{t('startDate')}</Label>
                            <Input type="date" id={`break_start_${breakItem.id}`} value={breakItem.startDate} onChange={e => handleBreakInServiceChange(breakItem.id, 'startDate', e.target.value)} required />
                        </div>
                        <div className="flex-1">
                            <Label htmlFor={`break_end_${breakItem.id}`}>{t('endDate')}</Label>
                            <Input type="date" id={`break_end_${breakItem.id}`} value={breakItem.endDate} onChange={e => handleBreakInServiceChange(breakItem.id, 'endDate', e.target.value)} required />
                        </div>
                        <Button type="button" onClick={() => removeBreakInService(breakItem.id)} variant="destructive" size="icon"><TrashIcon /></Button>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>{t('calculationPeriod')}</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <Label htmlFor="calculationStartDate">{t('calculateFrom')}</Label>
                      <Input type="date" name="calculationStartDate" id="calculationStartDate" value={formData.calculationStartDate} onChange={handleChange} required />
                  </div>
                   <div>
                      <Label htmlFor="calculationEndDate">{t('calculateTo')}</Label>
                      <Input type="date" name="calculationEndDate" id="calculationEndDate" value={formData.calculationEndDate} onChange={handleChange} required />
                  </div>
              </div>
          </CardContent>
      </Card>

      <div className="pt-4 grid grid-cols-2 gap-4">
        <Button type="reset" variant="outline">
          {t('resetForm')}
        </Button>
        <Button type="submit" disabled={isLoading || hasDuplicateErrors}>
          {isLoading ? t('calculating') : t('calculatePayroll')}
        </Button>
      </div>
    </form>
  );
};

export default PayrollForm;