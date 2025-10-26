import { EmployeeInput, PayrollResult, PayrollYear, PayrollPeriod, CityGrade, Promotion } from '../types';
import { 
    PAY_MATRIX, GRADE_PAY_TO_LEVEL, DA_RATES, HRA_SLABS_7TH_PC, 
    PAY_SCALES_6TH_PC, HRA_SLABS_6TH_PC, HRA_SLABS_6TH_PC_PRE_2009, POSTS 
} from '../constants';

const FITMENT_FACTOR_7TH_PC = 2.57;
const FITMENT_FACTOR_6TH_PC = 1.86;

// --- Pay Calculation Helpers ---

function findPayInMatrix(pay: number, level: number): number {
  const levelPayScale = PAY_MATRIX[level];
  if (!levelPayScale) throw new Error(`Invalid level: ${level}`);
  const newPay = levelPayScale.find(p => p >= pay);
  return newPay || levelPayScale[levelPayScale.length - 1];
}

function getIncrement(currentPay: number, level: number, steps: number, commission: 6 | 7, gradePay?: number): { newPay: number, newPipb?: number } {
    if (commission === 7) {
        const levelPayScale = PAY_MATRIX[level];
        if (!levelPayScale) throw new Error(`Invalid level for 7th PC increment: ${level}`);
        const currentIndex = levelPayScale.indexOf(currentPay);
        
        let newIndex = -1;
        if (currentIndex === -1) {
             const nextStepIndex = levelPayScale.findIndex(p => p > currentPay);
             if(nextStepIndex === -1) return { newPay: currentPay }; // Already at max
             newIndex = Math.min(nextStepIndex + steps - 1, levelPayScale.length - 1);
        } else {
            newIndex = Math.min(currentIndex + steps, levelPayScale.length - 1);
        }
        return { newPay: levelPayScale[newIndex] };
    } else { // 6th PC
        if (gradePay === undefined) throw new Error("Grade Pay is required for 6th PC increment");
        const payInPayBand = currentPay - gradePay;
        let newPipb = payInPayBand;
        for (let i = 0; i < steps; i++) {
             const increment = Math.ceil(((newPipb + gradePay) * 0.03) / 10) * 10;
             newPipb += increment;
        }
        return { newPay: newPipb + gradePay, newPipb };
    }
}

function getHra(basicPay: number, cityGrade: string, date: Date): number {
    const is7thPC = date >= new Date('2016-01-01');
    if (is7thPC) {
        const slab = HRA_SLABS_7TH_PC.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
        if (!slab) return 0;
        return slab.rates[cityGrade as CityGrade] || 0;
    } else {
        const effectiveSlabs = date < new Date('2009-06-01') ? HRA_SLABS_6TH_PC_PRE_2009 : HRA_SLABS_6TH_PC;
        const cityGradeMap: {[key:string]: string} = {
            [CityGrade.GRADE_I_A]: 'Grade I(a)', [CityGrade.GRADE_I_B]: 'Grade I(b)',
            [CityGrade.GRADE_II]: 'Grade II', [CityGrade.GRADE_III]: 'Grade III',
            [CityGrade.GRADE_IV]: 'Unclassified',
        }
        const mappedGrade = cityGradeMap[cityGrade] || 'Unclassified';
        const slab = effectiveSlabs.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
        if (!slab) return 0;
        return slab.rates[mappedGrade] || 0;
    }
}


export const calculateFullPayroll = (data: EmployeeInput): PayrollResult => {
    const { employeeName, fatherName, employeeNo, cpsGpfNo, dateOfBirth, retirementAge, dateOfJoining, dateOfJoiningInOffice, cityGrade, calculationStartDate, calculationEndDate, promotions, annualIncrementChanges, ...rest } = data;
    const { selectionGradeDate, specialGradeDate, superGradeDate, joiningPostId } = rest;

    if (!dateOfJoining || !calculationStartDate || !calculationEndDate) {
      throw new Error('Please fill all required fields, including Date of Joining and Calculation Period.');
    }

    const doj = new Date(dateOfJoining);
    const calcStartDate = new Date(calculationStartDate);
    const calcEndDate = new Date(calculationEndDate);
    
    let currentPay: number, currentLevel: number, currentPipb: number | undefined, currentGradePay: number | undefined;
    let fixation6thPC: PayrollResult['fixation6thPC'] | undefined = undefined;
    let fixation7thPC: PayrollResult['fixation7thPC'] | undefined = undefined;
    
    const sortedIncrementChanges = [...annualIncrementChanges]
        .filter(c => c.effectiveDate)
        .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

    // 1. Determine Initial Pay based on Date of Joining
    if (doj < new Date('2006-01-01')) {
        const { basicPay2005, joiningScaleId } = rest;
        if (!basicPay2005 || !joiningScaleId) throw new Error("Basic Pay and Scale as of 31-12-2005 are required for employees who joined before 2006.");
        const scaleInfo = PAY_SCALES_6TH_PC.find(s => s.id === joiningScaleId);
        if (!scaleInfo) throw new Error(`Invalid pay scale ID: ${joiningScaleId}`);

        const multipliedPay = Math.ceil((basicPay2005 * FITMENT_FACTOR_6TH_PC) / 10) * 10;
        currentPipb = multipliedPay;
        currentGradePay = scaleInfo.gradePay;
        currentPay = currentPipb + currentGradePay;
        
        fixation6thPC = { basicPay2005, multipliedPay, initialPayInPayBand: currentPipb, initialGradePay: currentGradePay, initialRevisedBasicPay: currentPay };

    } else if (doj < new Date('2016-01-01')) {
        const { joiningPayInPayBand, joiningScaleId } = rest;
        if (joiningPayInPayBand === undefined || !joiningScaleId) throw new Error("Pay in Pay Band and Grade Pay are required for employees who joined between 2006 and 2015.");
        const scaleInfo = PAY_SCALES_6TH_PC.find(s => s.id === joiningScaleId);
        if (!scaleInfo) throw new Error(`Invalid pay scale ID: ${joiningScaleId}`);
        
        currentPipb = joiningPayInPayBand;
        currentGradePay = scaleInfo.gradePay;
        currentPay = currentPipb + currentGradePay;
    } else { // Joined in 7th PC
        const { joiningLevel } = rest;
        if (!joiningLevel) throw new Error("Pay Level is required for employees who joined on or after 01-01-2016.");
        currentLevel = parseInt(joiningLevel, 10);
        currentPay = PAY_MATRIX[currentLevel][0];
    }
    
    // --- Setup for 7th PC Fixation (if applicable) ---
    if (doj < new Date('2016-01-01')) {
        let payAt2015 = currentPay;
        let gradePayAt2015 = currentGradePay!;
        
        // --- Refactored Pre-2016 chronological event processing ---
        const allEventsPre2016: { date: Date, type: string, data?: any }[] = [];
        // Gather grade and promotion events
        if (selectionGradeDate && new Date(selectionGradeDate) < new Date('2016-01-01')) allEventsPre2016.push({ date: new Date(selectionGradeDate), type: 'SELECTION_GRADE'});
        if (specialGradeDate && new Date(specialGradeDate) < new Date('2016-01-01')) allEventsPre2016.push({ date: new Date(specialGradeDate), type: 'SPECIAL_GRADE'});
        if (superGradeDate && new Date(superGradeDate) < new Date('2016-01-01')) allEventsPre2016.push({ date: new Date(superGradeDate), type: 'SUPER_GRADE'});
        promotions.forEach(p => p.date && new Date(p.date) < new Date('2016-01-01') && allEventsPre2016.push({ date: new Date(p.date), type: 'PROMOTION', data: p}));

        // Gather annual increments
        for (let year = doj.getFullYear(); year <= 2015; year++) {
            const applicableChange = sortedIncrementChanges
                .filter(c => new Date(c.effectiveDate) <= new Date(year, 11, 31))
                .pop();
            const effectiveIncrementMonth = applicableChange ? applicableChange.incrementMonth : 'jul';
            const incrementMonthMap = { 'jan': 0, 'apr': 3, 'jul': 6, 'oct': 9 };
            const incrementMonth = incrementMonthMap[effectiveIncrementMonth as 'jan' | 'apr' | 'jul' | 'oct'];
            const annualIncrementDate = new Date(year, incrementMonth, 1);
            
            const cutoffDate = new Date(annualIncrementDate);
            cutoffDate.setMonth(cutoffDate.getMonth() - 6);
            if (doj <= cutoffDate && annualIncrementDate > doj) {
                 allEventsPre2016.push({ date: annualIncrementDate, type: 'ANNUAL_INCREMENT' });
            }
        }

        // Sort and process all events chronologically
        allEventsPre2016
            .filter(e => e.date >= doj)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .forEach(event => {
                if (event.type === 'ANNUAL_INCREMENT' || event.type === 'SUPER_GRADE') {
                    payAt2015 = getIncrement(payAt2015, 0, 1, 6, gradePayAt2015).newPay;
                } else if (event.type === 'SELECTION_GRADE' || event.type === 'SPECIAL_GRADE') {
                    // Apply two 3% increments as requested for pre-2016 awards
                    payAt2015 = getIncrement(payAt2015, 0, 2, 6, gradePayAt2015).newPay;
                } else if (event.type === 'PROMOTION') {
                    const { newPipb } = getIncrement(payAt2015, 0, 1, 6, gradePayAt2015);
                    gradePayAt2015 = event.data.gradePay!;
                    payAt2015 = newPipb! + gradePayAt2015;
                }
            });

        const multipliedPay = Math.round(payAt2015 * FITMENT_FACTOR_7TH_PC);
        const levelFor7PC = GRADE_PAY_TO_LEVEL[gradePayAt2015];
        if (!levelFor7PC) throw new Error(`Could not find a level for Grade Pay ${gradePayAt2015} at 7th PC transition.`);
        
        const payFor7PC = findPayInMatrix(multipliedPay, levelFor7PC);
        fixation7thPC = { oldBasicPay: payAt2015, multipliedPay, initialRevisedPay: payFor7PC, level: levelFor7PC };
    }


    // 2. Build Chronological Event List
    const events: { date: Date, type: string, data?: any }[] = [];
    DA_RATES.forEach(da => events.push({ date: da.date, type: 'DA_CHANGE' }));
    if (selectionGradeDate) events.push({ date: new Date(selectionGradeDate), type: 'SELECTION_GRADE' });
    if (specialGradeDate) events.push({ date: new Date(specialGradeDate), type: 'SPECIAL_GRADE' });
    if (superGradeDate) events.push({ date: new Date(superGradeDate), type: 'SUPER_GRADE'});
    promotions.forEach(p => p.date && events.push({ date: new Date(p.date), type: 'PROMOTION', data: p }));
    annualIncrementChanges.forEach((change, index) => {
        // Only add remarks for changes after the initial setting
        if (index > 0 && change.effectiveDate) {
            events.push({
                date: new Date(change.effectiveDate),
                type: 'INCREMENT_MONTH_CHANGE',
                data: { month: change.incrementMonth }
            });
        }
    });

    const yearlyCalculations: PayrollYear[] = [];
    const startYear = Math.max(2006, doj.getFullYear(), calcStartDate.getFullYear());
    const endYear = Math.min(new Date().getFullYear() + 5, calcEndDate.getFullYear());

    for (let year = startYear; year <= endYear; year++) {
        const yearData: PayrollYear = { year, periods: [] };
        
        const yearEvents = [...events.filter(e => e.date.getFullYear() === year)];
        
        const applicableChange = sortedIncrementChanges
                .filter(c => new Date(c.effectiveDate) <= new Date(year, 11, 31))
                .pop();
        const effectiveIncrementMonth = applicableChange ? applicableChange.incrementMonth : 'jul';

        const incrementMonthMap = { 'jan': 0, 'apr': 3, 'jul': 6, 'oct': 9 };
        const incrementMonth = incrementMonthMap[effectiveIncrementMonth as 'jan' | 'apr' | 'jul' | 'oct'];
        const annualIncrementDate = new Date(year, incrementMonth, 1);
        
        const cutoffDate = new Date(annualIncrementDate);
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        if (doj <= cutoffDate) {
             yearEvents.push({ date: annualIncrementDate, type: 'ANNUAL_INCREMENT' });
        }
        
        yearEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

        let lastDate = new Date(year, 0, 1);
        if (year === startYear) {
            lastDate = doj > calcStartDate ? doj : calcStartDate;
        }

        const processPeriod = (startDate: Date, endDate: Date, remarks: string[]) => {
            if (startDate > endDate || startDate > calcEndDate || endDate < calcStartDate) return;
            const periodStartDate = startDate > calcStartDate ? startDate : calcStartDate;
            const periodEndDate = endDate < calcEndDate ? endDate : calcEndDate;
            if(periodStartDate > periodEndDate) return;

            const commission = periodStartDate < new Date('2016-01-01') ? 6 : 7;
            const daRate = DA_RATES.filter(r => r.date <= periodStartDate && r.commission === commission).pop()?.rate ?? 0;
            const daAmount = Math.round(currentPay * (daRate / 100));
            const hra = getHra(currentPay, cityGrade, periodStartDate);
            const grossPay = currentPay + daAmount + hra;

            const startStr = periodStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short'});
            const endStr = periodEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short'});
            const periodString = `${startStr}, ${year}` + (startStr === endStr ? '' : ` - ${endStr}, ${year}`);
            
            yearData.periods.push({ period: periodString, basicPay: currentPay, daRate, daAmount, hra, grossPay, remarks, payInPayBand: currentPipb, gradePay: currentGradePay });
        };
        
        let periodRemarks: string[] = [];
        for (const event of yearEvents) {
            if (event.date > lastDate) {
                processPeriod(lastDate, new Date(event.date.getTime() - 1), periodRemarks);
                periodRemarks = [];
            }
            lastDate = event.date;
            
            if (event.date >= doj && event.date <= calcEndDate) {
                const commission = event.date < new Date('2016-01-01') ? 6 : 7;
                
                if (event.date.getTime() === new Date('2016-01-01').getTime() && fixation7thPC) {
                    currentPay = fixation7thPC.initialRevisedPay;
                    currentLevel = fixation7thPC.level;
                    currentPipb = undefined;
                    currentGradePay = undefined;
                    periodRemarks.push(`7th Pay Commission fixation applied.`);
                }
                
                if(event.type === 'INCREMENT_MONTH_CHANGE') {
                    const monthName = event.data.month.charAt(0).toUpperCase() + event.data.month.slice(1);
                    periodRemarks.push(`Annual increment month changed to ${monthName}.`);
                }

                let steps = 0;
                let eventName = event.type.replace('_', ' ');
                if (event.type === 'ANNUAL_INCREMENT') {
                    steps = 1;
                } else if (event.type === 'SELECTION_GRADE' || event.type === 'SPECIAL_GRADE') {
                    if (commission === 7 && currentLevel >= 1 && currentLevel <= 23) {
                        steps = 2; // G.O. rule for 7th PC
                    } else if (commission === 6) {
                        steps = 2; // User requested 3%+3% for 6th PC
                    } else {
                        // For 7th PC levels > 23, it is one increment.
                        steps = 1;
                    }
                } else if (event.type === 'SUPER_GRADE') {
                    // This corresponds to the 30-year Bonus Increment, which is one increment.
                    steps = 1;
                    eventName = 'Bonus Increment (Super Grade)';
                }

                if (steps > 0) {
                    const { newPay, newPipb } = getIncrement(currentPay, currentLevel, steps, commission, currentGradePay);
                    currentPay = newPay;
                    if(newPipb !== undefined) currentPipb = newPipb;
                    periodRemarks.push(`${eventName} applied` + (steps > 1 ? ` (${steps} increments).` : '.'));
                }

                if (event.type === 'PROMOTION') {
                     if(commission === 7) {
                        const { newPay } = getIncrement(currentPay, currentLevel, 1, 7);
                        currentLevel = parseInt(event.data.level, 10);
                        currentPay = findPayInMatrix(newPay, currentLevel);
                     } else {
                         const { newPipb } = getIncrement(currentPay, 0, 1, 6, currentGradePay);
                         currentGradePay = event.data.gradePay;
                         currentPipb = newPipb;
                         currentPay = currentPipb! + currentGradePay!;
                     }
                     periodRemarks.push(`Promoted to ${event.data.post}.`);
                }
            }
        }
        processPeriod(lastDate, new Date(year, 11, 31), periodRemarks);

        if(yearData.periods.length > 0) yearlyCalculations.push(yearData);
    }
    
    const retirementDateStr = dateOfBirth ? new Date(new Date(dateOfBirth).getFullYear() + parseInt(retirementAge, 10), new Date(dateOfBirth).getMonth() + 1, 0).toLocaleDateString('en-GB') : 'N/A';
    const joiningPostName = POSTS.find(p => p.id === joiningPostId)?.name || 'N/A (Custom)';


    return {
        employeeDetails: {
            employeeName,
            fatherName,
            employeeNo,
            cpsGpfNo,
            retirementDate: retirementDateStr,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('en-GB') : 'N/A',
            dateOfJoining: doj.toLocaleDateString('en-GB'),
            dateOfJoiningInOffice: dateOfJoiningInOffice ? new Date(dateOfJoiningInOffice).toLocaleDateString('en-GB') : 'N/A',
            joiningPost: joiningPostName,
            promotions: promotions.map(p => ({post: p.post, date: new Date(p.date).toLocaleDateString('en-GB')})),
            retirementAge,
            selectionGradeDate: selectionGradeDate || undefined,
            specialGradeDate: specialGradeDate || undefined,
            superGradeDate: superGradeDate || undefined,
        },
        fixation6thPC,
        fixation7thPC,
        yearlyCalculations,
    };
};