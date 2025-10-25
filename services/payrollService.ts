import { EmployeeInput, PayrollResult, PayrollYear, PayrollPeriod, CityGrade } from '../types';
import { 
    PAY_MATRIX, GRADE_PAY_TO_LEVEL, DA_RATES, HRA_SLABS_7TH_PC, 
    PAY_SCALES_6TH_PC, HRA_SLABS_6TH_PC, HRA_SLABS_6TH_PC_PRE_2009 
} from '../constants';

const FITMENT_FACTOR_7TH_PC = 2.57;
const FITMENT_FACTOR_6TH_PC = 1.86;

// --- 7th Pay Commission Helpers ---
function findPayInMatrix(pay: number, level: number): number {
  const levelPayScale = PAY_MATRIX[level];
  if (!levelPayScale) throw new Error(`Invalid level: ${level}`);
  const newPay = levelPayScale.find(p => p >= pay);
  return newPay || levelPayScale[levelPayScale.length - 1];
}

function getIncrement7thPC(currentPay: number, level: number, steps: number): number {
    const levelPayScale = PAY_MATRIX[level];
    if (!levelPayScale) throw new Error(`Invalid level for increment: ${level}`);
    const currentIndex = levelPayScale.indexOf(currentPay);
    if (currentIndex === -1) {
        // If current pay is not in matrix (e.g., after promotion), find the next step.
        const nextStep = levelPayScale.find(p => p > currentPay);
        if(!nextStep) return currentPay; // Already at max
        const nextStepIndex = levelPayScale.indexOf(nextStep);
        const newIndex = Math.min(nextStepIndex + steps - 1, levelPayScale.length - 1);
        return levelPayScale[newIndex];
    }
    const newIndex = Math.min(currentIndex + steps, levelPayScale.length - 1);
    return levelPayScale[newIndex];
}

function getHra7thPC(basicPay: number, cityGrade: string): number {
    const slab = HRA_SLABS_7TH_PC.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
    if (!slab) return 0;
    return slab.rates[cityGrade as CityGrade] || 0;
}


// --- 6th Pay Commission Helpers ---
function getIncrement6thPC(payInPayBand: number, gradePay: number): number {
    const basicPay = payInPayBand + gradePay;
    const increment = Math.ceil((basicPay * 0.03) / 10) * 10;
    return payInPayBand + increment;
}

function getHra6thPC(basicPay: number, cityGrade: string, date: Date): number {
    const effectiveSlabs = date < new Date('2009-06-01') ? HRA_SLABS_6TH_PC_PRE_2009 : HRA_SLABS_6TH_PC;
    const cityGradeMap: {[key:string]: string} = {
        [CityGrade.GRADE_I_A]: 'Grade I(a)',
        [CityGrade.GRADE_I_B]: 'Grade I(b)',
        [CityGrade.GRADE_II]: 'Grade II',
        [CityGrade.GRADE_III]: 'Grade III',
        [CityGrade.GRADE_IV]: 'Unclassified',
    }
    const mappedGrade = cityGradeMap[cityGrade] || 'Unclassified';
    const slab = effectiveSlabs.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
    if (!slab) return 0;
    return slab.rates[mappedGrade] || 0;
}


const calculate7thPcPayroll = (payInPayBand2015: number, gradePay2015: number, selGradeDate: Date | null, spGradeDate: Date | null, cityGrade: CityGrade, promotionDate: Date | null, promotionLevel: number | null, calcStartDate: Date, calcEndDate: Date) => {
    const oldBasicPay = payInPayBand2015 + gradePay2015;
    const multipliedPay = Math.round(oldBasicPay * FITMENT_FACTOR_7TH_PC);
    
    const initialLevel = GRADE_PAY_TO_LEVEL[gradePay2015];
    if (!initialLevel) throw new Error(`Could not find a corresponding level for Grade Pay: ${gradePay2015}`);

    const initialRevisedPay = findPayInMatrix(multipliedPay, initialLevel);

    const yearlyCalculations: PayrollYear[] = [];
    let currentPay = initialRevisedPay;
    let currentLevel = initialLevel;

    const startYear = Math.max(2016, calcStartDate.getFullYear());
    const endYear = Math.min(new Date().getFullYear(), calcEndDate.getFullYear());

    for (let year = startYear; year <= endYear; year++) {
        const yearData: PayrollYear = { year, periods: [] };
        
        const events: { date: Date, type: string, data?: any }[] = [];
        
        // Populate events for the year
        events.push({ date: new Date(year, 6, 1), type: 'ANNUAL_INCREMENT' });

        DA_RATES
            .filter(r => r.date.getFullYear() === year && r.commission === 7)
            .forEach(da => events.push({ date: da.date, type: 'DA_CHANGE', data: { rate: da.rate } }));

        if (selGradeDate && selGradeDate.getFullYear() === year) events.push({ date: selGradeDate, type: 'SELECTION_GRADE' });
        if (spGradeDate && spGradeDate.getFullYear() === year) events.push({ date: spGradeDate, type: 'SPECIAL_GRADE' });
        if (promotionDate && promotionDate.getFullYear() === year && promotionLevel) events.push({ date: promotionDate, type: 'PROMOTION', data: { newLevel: promotionLevel } });
        
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        let payForPeriod = currentPay;
        let levelForPeriod = currentLevel;
        let remarksForPeriod: string[] = [];

        let lastDate = new Date(year, 0, 1);
        if (year === startYear && calcStartDate > lastDate) {
            lastDate = calcStartDate;
        }


        for (const event of events) {
            if(event.date > lastDate) {
                addPeriod(lastDate, new Date(event.date.getTime() - 1));
            }

            // Apply event effect only if it's within the calculation range
            if (event.date >= calcStartDate && event.date <= calcEndDate) {
                switch(event.type) {
                    case 'SELECTION_GRADE':
                        payForPeriod = getIncrement7thPC(payForPeriod, levelForPeriod, 2);
                        remarksForPeriod.push(`Selection Grade applied on ${event.date.toLocaleDateString('en-GB')}.`);
                        break;
                    case 'SPECIAL_GRADE':
                        payForPeriod = getIncrement7thPC(payForPeriod, levelForPeriod, 2);
                        remarksForPeriod.push(`Special Grade applied on ${event.date.toLocaleDateString('en-GB')}.`);
                        break;
                    case 'ANNUAL_INCREMENT':
                        payForPeriod = getIncrement7thPC(payForPeriod, levelForPeriod, 1);
                        remarksForPeriod.push('Annual Increment applied from July.');
                        break;
                    case 'PROMOTION':
                        const payWithNotionalIncrement = getIncrement7thPC(payForPeriod, levelForPeriod, 1);
                        levelForPeriod = event.data.newLevel;
                        payForPeriod = findPayInMatrix(payWithNotionalIncrement, levelForPeriod);
                        remarksForPeriod.push(`Promoted to Level ${levelForPeriod} on ${event.date.toLocaleDateString('en-GB')}.`);
                        break;
                }
            }
            lastDate = event.date;
        }
        
        addPeriod(lastDate, new Date(year, 11, 31));
        
        function addPeriod(startDate: Date, endDate: Date) {
            const periodStartDate = startDate > calcStartDate ? startDate : calcStartDate;
            const periodEndDate = endDate < calcEndDate ? endDate : calcEndDate;

            if (periodStartDate > periodEndDate) return;

            const daRate = DA_RATES.filter(r => r.date <= periodStartDate && r.commission === 7).pop()?.rate ?? 0;
            const daAmount = Math.round(payForPeriod * (daRate / 100));
            const hra = getHra7thPC(payForPeriod, cityGrade);
            const grossPay = payForPeriod + daAmount + hra;

            const startStr = `${periodStartDate.getDate()} ${periodStartDate.toLocaleString('default', { month: 'short' })}`;
            const endStr = `${periodEndDate.getDate()} ${periodEndDate.toLocaleString('default', { month: 'short' })}`;
            const periodString = `${startStr}${(startStr === endStr && periodStartDate.getFullYear() === periodEndDate.getFullYear()) ? '' : ` - ${endStr}`}, ${year}`;
            
            yearData.periods.push({
                period: periodString,
                basicPay: payForPeriod,
                daRate, daAmount, hra, grossPay,
                remarks: [...remarksForPeriod],
            });
            remarksForPeriod = []; // Reset remarks for next period
        }
        
        if (yearData.periods.length > 0) yearlyCalculations.push(yearData);
        
        currentPay = payForPeriod;
        currentLevel = levelForPeriod;
    }
    
    return {
        initialCalculation: { oldBasicPay, multipliedPay, initialRevisedPay: initialRevisedPay, level: initialLevel },
        yearlyCalculations,
    };
}


export const calculateFullPayroll = (data: EmployeeInput): PayrollResult => {
  const { 
      basicPay2005, scaleId, selectionGradeDate, specialGradeDate, cityGrade,
      employeeName, cpsGpfNo, dateOfBirth, retirementAge, promotionDate, promotionPost, promotionLevel,
      dateOfJoining, calculationStartDate, calculationEndDate
   } = data;

  if (!basicPay2005 || !scaleId || !dateOfJoining || !calculationStartDate || !calculationEndDate) {
      throw new Error('Please fill all required fields, including Date of Joining and Calculation Period.');
  }
  
  const calcStartDate = new Date(calculationStartDate);
  const calcEndDate = new Date(calculationEndDate);
  const doj = new Date(dateOfJoining);


  // --- 6th PC Calculation (2006-2015) ---
  const scaleInfo = PAY_SCALES_6TH_PC.find(s => s.id === scaleId);
  if (!scaleInfo) throw new Error(`Invalid pay scale ID: ${scaleId}`);

  const initialPayInPayBand = Math.ceil((basicPay2005 * FITMENT_FACTOR_6TH_PC) / 10) * 10;
  const initialGradePay = scaleInfo.gradePay;

  const yearlyCalculations6thPC: PayrollYear[] = [];
  let currentPayInBand = initialPayInPayBand;
  let currentGradePay = initialGradePay;
  
  const selGradeDate = selectionGradeDate ? new Date(selectionGradeDate) : null;
  const spGradeDate = specialGradeDate ? new Date(specialGradeDate) : null;

  const startYear6PC = Math.max(2006, doj.getFullYear(), calcStartDate.getFullYear());
  const endYear6PC = Math.min(2015, calcEndDate.getFullYear());

  for (let year = startYear6PC; year <= endYear6PC; year++) {
    const yearData: PayrollYear = { year, periods: [] };
    const yearlyRemarks = new Set<string>();

    let pipbBeforeAnnualIncrement = currentPayInBand;
    
    if (selGradeDate && selGradeDate.getFullYear() === year) {
        currentPayInBand = getIncrement6thPC(currentPayInBand, currentGradePay);
        yearlyRemarks.add(`Selection Grade applied in ${year}.`);
        pipbBeforeAnnualIncrement = currentPayInBand;
    }
    if (spGradeDate && spGradeDate.getFullYear() === year) {
        currentPayInBand = getIncrement6thPC(currentPayInBand, currentGradePay);
        yearlyRemarks.add(`Special Grade applied in ${year}.`);
        pipbBeforeAnnualIncrement = currentPayInBand;
    }

    const incrementMonth = 6;
    let incrementAppliedInYear = false;
    if (year < new Date().getFullYear() || (year === new Date().getFullYear() && new Date().getMonth() >= incrementMonth)) {
        currentPayInBand = getIncrement6thPC(pipbBeforeAnnualIncrement, currentGradePay);
        incrementAppliedInYear = true;
    }
    
    const daRatesForYear = DA_RATES.filter(r => r.date.getFullYear() === year && r.commission === 6);
    let lastEventDate = new Date(year, 0, 1);
    if(year === startYear6PC && calcStartDate > lastEventDate) lastEventDate = calcStartDate;
    if(year === startYear6PC && doj > lastEventDate) lastEventDate = doj;


    const events = daRatesForYear.map(da => da.date);
    events.sort((a,b) => a.getTime() - b.getTime());

    for (const eventDate of events) {
        const periodStartDate = eventDate > lastEventDate ? eventDate : lastEventDate;
        
        let periodEndDate: Date;
        const nextEvent = events.find(d => d > eventDate);

        if (nextEvent) {
             periodEndDate = new Date(nextEvent.getTime() - 86400000);
        } else {
            periodEndDate = new Date(year, 11, 31);
        }

        const finalStartDate = periodStartDate < calcStartDate ? calcStartDate : periodStartDate;
        const finalEndDate = periodEndDate > calcEndDate ? calcEndDate : periodEndDate;

        if(finalStartDate > finalEndDate) continue;

        const periodRemarks = new Set<string>([...yearlyRemarks]);
        const effectivePipb = (incrementAppliedInYear && finalStartDate.getMonth() >= incrementMonth) ? currentPayInBand : pipbBeforeAnnualIncrement;
        const effectiveBasic = effectivePipb + currentGradePay;

        if (incrementAppliedInYear && finalStartDate.getMonth() >= incrementMonth) {
            periodRemarks.add('Annual Increment applied from July.');
        }

        const daRate = DA_RATES.filter(r => r.date <= finalStartDate && r.commission === 6).pop()?.rate ?? 0;
        const daAmount = Math.round(effectiveBasic * (daRate / 100));
        const hra = getHra6thPC(effectiveBasic, cityGrade, finalStartDate);
        const grossPay = effectiveBasic + daAmount + hra;

        const startStr = `${finalStartDate.getDate()} ${finalStartDate.toLocaleString('default', { month: 'short' })}`;
        const endStr = `${finalEndDate.getDate()} ${finalEndDate.toLocaleString('default', { month: 'short' })}`;
        const periodString = `${startStr}` + (finalStartDate.getTime() === finalEndDate.getTime() ? '' : ` - ${endStr}`) + `, ${year}`;

        yearData.periods.push({
            period: periodString,
            basicPay: effectiveBasic,
            payInPayBand: effectivePipb,
            gradePay: currentGradePay,
            daRate, daAmount, hra, grossPay,
            remarks: Array.from(periodRemarks),
        });
        lastEventDate = new Date(periodEndDate.getTime() + 86400000);
    }
    if (yearData.periods.length > 0) yearlyCalculations6thPC.push(yearData);
  }

  // --- 7th PC Calculation (2016 onwards) ---
  const { initialCalculation: fixation7thPC, yearlyCalculations: yearlyCalculations7thPC } = calculate7thPcPayroll(currentPayInBand, currentGradePay, selGradeDate, spGradeDate, cityGrade, promotionDate ? new Date(promotionDate) : null, promotionLevel ? parseInt(promotionLevel, 10) : null, calcStartDate, calcEndDate);

  let retirementDateStr = '';
    if(dateOfBirth) {
        try {
            const dob = new Date(dateOfBirth);
            const retirementYear = dob.getFullYear() + parseInt(retirementAge, 10);
            const lastDay = new Date(retirementYear, dob.getMonth() + 1, 0);
            retirementDateStr = lastDay.toLocaleDateString('en-GB'); // DD/MM/YYYY
        } catch {
            retirementDateStr = 'Invalid DOB';
        }
    }


  return {
    employeeDetails: {
        employeeName,
        cpsGpfNo,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('en-GB') : 'N/A',
        dateOfJoining: doj.toLocaleDateString('en-GB'),
        retirementDate: retirementDateStr,
        promotionDate: promotionDate ? new Date(promotionDate).toLocaleDateString('en-GB') : undefined,
        promotionPost: promotionPost || undefined,
    },
    fixation6thPC: {
      basicPay2005,
      multipliedPay: Math.round((basicPay2005 * FITMENT_FACTOR_6TH_PC)),
      initialPayInPayBand,
      initialGradePay,
      initialRevisedBasicPay: initialPayInPayBand + initialGradePay,
    },
    fixation7thPC,
    yearlyCalculations: [...yearlyCalculations6thPC, ...yearlyCalculations7thPC],
  };
};