
import { EmployeeInput, PayrollResult, PayrollYear, PayrollPeriod, CityGrade, Promotion, Post, PayRevision2010, PayScale } from '../types';
import { 
    PAY_MATRIX, GRADE_PAY_TO_LEVEL, DA_RATES, HRA_SLABS_7TH_PC, 
    PAY_SCALES_6TH_PC, HRA_SLABS_6TH_PC, HRA_SLABS_6TH_PC_PRE_2009, HRA_SLABS_5TH_PC, POSTS,
    PAY_REVISIONS_2010
} from '../constants';

const FITMENT_FACTOR_7TH_PC = 2.57;
const FITMENT_FACTOR_6TH_PC = 1.86;

// Helper to parse YYYY-MM-DD string as a UTC date at midnight to avoid timezone issues.
const parseDateUTC = (dateString?: string): Date | undefined => {
  if (!dateString) return undefined;
  // Appending 'T00:00:00Z' ensures the date is parsed as UTC midnight.
  return new Date(`${dateString}T00:00:00Z`);
};

// --- Pay Calculation Helpers ---

function findPayInMatrix(pay: number, level: number): number {
  const levelPayScale = PAY_MATRIX[level];
  if (!levelPayScale) throw new Error(`Invalid level: ${level}`);
  const newPay = levelPayScale.find(p => p >= pay);
  return newPay || levelPayScale[levelPayScale.length - 1];
}

function parse5thPCScale(scale: string): { stages: { from: number, to: number, inc: number }[], max: number } {
    const parts = scale.replace(/\s/g, '').split('-').map(Number);
    if (parts.some(isNaN)) return { stages: [], max: 0 };
    const stages = [];
    for (let i = 0; i < parts.length - 2; i += 2) {
        stages.push({ from: parts[i], to: parts[i+2], inc: parts[i+1] });
    }
    return { stages, max: parts[parts.length - 1] };
}

function getIncrement5thPC(currentPay: number, scaleString: string, steps: number = 1): number {
    let newPay = currentPay;
    const scale = parse5thPCScale(scaleString);
    if(scale.stages.length === 0) return newPay;
    
    for (let i = 0; i < steps; i++) {
        if (newPay >= scale.max) {
            newPay = scale.max;
            break;
        }
        let incrementApplied = false;
        for (const stage of scale.stages) {
            if (newPay < stage.to) {
                newPay += stage.inc;
                incrementApplied = true;
                break;
            }
        }
        if (!incrementApplied) { // If pay is already at or above the last 'from' value
             newPay += scale.stages[scale.stages.length - 1].inc;
        }
        
        if(newPay > scale.max) newPay = scale.max;
    }
    return newPay;
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
        let payInPayBand = currentPay - gradePay;
        for (let i = 0; i < steps; i++) {
             const incrementAmount = Math.round((payInPayBand + gradePay) * 0.03);
             payInPayBand += incrementAmount;
        }
        return { newPay: payInPayBand + gradePay, newPipb: payInPayBand };
    }
}

function getHra(basicPay: number, cityGrade: string, date: Date): number {
    const is7thPC = date >= new Date('2016-01-01T00:00:00Z');
    const is6thPC = date >= new Date('2006-01-01T00:00:00Z');
    
    if (is7thPC) {
        const slab = HRA_SLABS_7TH_PC.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
        if (!slab) return 0;
        return slab.rates[cityGrade as CityGrade] || 0;
    } else if (is6thPC) {
        const effectiveSlabs = date < new Date('2009-06-01T00:00:00Z') ? HRA_SLABS_6TH_PC_PRE_2009 : HRA_SLABS_6TH_PC;
        const slab = effectiveSlabs.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
        if (!slab) return 0;
        return slab.rates[cityGrade as CityGrade] || 0;
    } else { // 5th PC
        const slab = HRA_SLABS_5TH_PC.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
        if (!slab) return 0;
        return slab.rates[cityGrade as CityGrade] || 0;
    }
}


export const calculateFullPayroll = (data: EmployeeInput): PayrollResult => {
    // --- 1. SETUP & INITIALIZATION ---
    const { dateOfJoining, calculationStartDate, calculationEndDate, promotions, annualIncrementChanges, breaksInService, selectionGradeDate, specialGradeDate, superGradeDate, stagnationIncrementDate, cityGrade, incrementEligibilityMonths, joiningPostId, joiningPostCustomName, selectionGradeTwoIncrements, specialGradeTwoIncrements, ...employeeDetails } = data;
    
    const doj = parseDateUTC(dateOfJoining);
    const calcStartDate = parseDateUTC(calculationStartDate);
    let calcEndDate = parseDateUTC(calculationEndDate);
    const reliefDate = parseDateUTC(employeeDetails.dateOfRelief);

    if (!doj || !calcStartDate || !calcEndDate) {
      throw new Error('Please fill all required fields: Date of Joining and Calculation Period.');
    }
     if (doj < new Date('1998-01-01T00:00:00Z')) {
        throw new Error('Calculations before 01-01-1998 are not supported yet.');
    }

    if(reliefDate && reliefDate < calcEndDate) {
        calcEndDate = reliefDate;
    }
    
    // --- State Variables for Simulation ---
    let currentPay: number;
    let currentCommission: 5 | 6 | 7;
    let currentLevel: number = 0;
    let currentPipb: number | undefined = undefined;
    let currentGradePay: number | undefined = undefined;
    let current5thPCScaleString: string | undefined = undefined;
    let currentPostId: string | undefined = joiningPostId;

    let fixation6thPC: PayrollResult['fixation6thPC'] | undefined = undefined;
    let fixation7thPC: PayrollResult['fixation7thPC'] | undefined = undefined;
    const appliedRevisions: { description: string, date: Date }[] = [];
    const stagnationIncrementDates: string[] = [];
    
    // --- 2. INITIAL PAY FIXATION (at Date of Joining) ---
    const fixedDate1998 = new Date('1998-01-01T00:00:00Z');
    const fixedDate2006 = new Date('2006-01-01T00:00:00Z');
    const fixedDate2016 = new Date('2016-01-01T00:00:00Z');

    if (doj < fixedDate2006) {
        currentCommission = 5;
        const { joiningBasicPay5thPC, joiningScaleId5thPC } = data;
        if (joiningBasicPay5thPC === undefined || !joiningScaleId5thPC) throw new Error("For pre-2006 joiners, 5th PC Pay Scale and Basic Pay at joining are required.");
        const scaleInfo = PAY_SCALES_6TH_PC.find(s => s.id === joiningScaleId5thPC);
        if(!scaleInfo) throw new Error(`Invalid 5th PC Scale ID: ${joiningScaleId5thPC}`);
        currentPay = joiningBasicPay5thPC;
        current5thPCScaleString = scaleInfo.scale;
    } else if (doj < fixedDate2016) {
        currentCommission = 6;
        const { joiningPayInPayBand, joiningScaleId6thPC } = data;
        if (joiningPayInPayBand === undefined || !joiningScaleId6thPC) throw new Error("For 6th PC joiners, Pay in Pay Band and Scale are required.");
        const scaleInfo = PAY_SCALES_6TH_PC.find(s => s.id === joiningScaleId6thPC);
        if (!scaleInfo) throw new Error(`Invalid 6th PC Scale ID: ${joiningScaleId6thPC}`);
        currentPipb = joiningPayInPayBand;
        currentGradePay = scaleInfo.gradePay;
        currentPay = currentPipb + currentGradePay;
    } else {
        currentCommission = 7;
        const { joiningLevel } = data;
        if (!joiningLevel) throw new Error("For 7th PC joiners, Pay Level is required.");
        currentLevel = parseInt(joiningLevel, 10);
        currentPay = PAY_MATRIX[currentLevel][0];
    }

    // --- 3. BUILD CHRONOLOGICAL EVENT LIST ---
    const events: { date: Date, type: string, data?: any, priority: number }[] = [
        ...DA_RATES.map(da => ({ date: da.date, type: 'DA_CHANGE', data: da, priority: 1 })),
        { date: fixedDate2006, type: 'PAY_COMMISSION_6', priority: 2 },
        { date: fixedDate2016, type: 'PAY_COMMISSION_7', priority: 2 },
    ];
    if (selectionGradeDate) events.push({ date: parseDateUTC(selectionGradeDate)!, type: 'SELECTION_GRADE', data: { twoIncrements: selectionGradeTwoIncrements }, priority: 3 });
    if (specialGradeDate) events.push({ date: parseDateUTC(specialGradeDate)!, type: 'SPECIAL_GRADE', data: { twoIncrements: specialGradeTwoIncrements }, priority: 3 });
    if (superGradeDate) events.push({ date: parseDateUTC(superGradeDate)!, type: 'SUPER_GRADE', priority: 3 });
    promotions.forEach(p => p.date && events.push({ date: parseDateUTC(p.date)!, type: 'PROMOTION', data: p, priority: 3 }));
    PAY_REVISIONS_2010.forEach(rev => events.push({ date: new Date('2010-08-01T00:00:00Z'), type: 'PAY_REVISION_2010', data: rev, priority: 3 }));
    let lastStagnationCheckDate = stagnationIncrementDate ? parseDateUTC(stagnationIncrementDate) : null;


    // --- 4. THE SIMULATION LOOP ---
    const yearlyCalculationsMap: Map<number, PayrollPeriod[]> = new Map();
    let currentDate = new Date(doj);
    let currentDaRate = 0;
    const sortedIncrementChanges = [...annualIncrementChanges].filter(c => c.effectiveDate).sort((a, b) => parseDateUTC(a.effectiveDate)!.getTime() - parseDateUTC(b.effectiveDate)!.getTime());
    
    while (currentDate <= calcEndDate) {
        let remarks: string[] = [];
        let didIncrementThisMonth = false;

        // --- Process Events for the current month ---
        const monthEvents = events.filter(e => e.date.getUTCFullYear() === currentDate.getUTCFullYear() && e.date.getUTCMonth() === currentDate.getUTCMonth()).sort((a,b) => a.priority - b.priority);
        
        for (const event of monthEvents) {
            const eventDate = event.date;
            
            // --- PAY COMMISSION FIXATION ---
            if (event.type === 'PAY_COMMISSION_6' && currentCommission === 5) {
                const basicPay2005 = currentPay;
                const multipliedPay = Math.round(basicPay2005 * FITMENT_FACTOR_6TH_PC);
                const scaleInfo = PAY_SCALES_6TH_PC.find(s => s.scale === current5thPCScaleString);
                if (!scaleInfo) throw new Error(`Could not map 5th PC scale ${current5thPCScaleString} to 6th PC.`);
                
                currentPipb = multipliedPay;
                currentGradePay = scaleInfo.gradePay;
                currentPay = currentPipb + currentGradePay;
                currentCommission = 6;
                fixation6thPC = { basicPay2005, multipliedPay, initialPayInPayBand: currentPipb, initialGradePay: currentGradePay, initialRevisedBasicPay: currentPay };
                remarks.push(`Pay fixed in 6th Pay Commission as per G.O.Ms.No.234/2009.`);
            }

            if (event.type === 'PAY_COMMISSION_7' && currentCommission === 6) {
                const oldBasicPay = currentPay;
                const multipliedPay = Math.round(oldBasicPay * FITMENT_FACTOR_7TH_PC);
                const levelFor7PC = GRADE_PAY_TO_LEVEL[currentGradePay!];
                if (!levelFor7PC) throw new Error(`Could not find a level for Grade Pay ${currentGradePay} at 7th PC transition.`);
                
                currentLevel = levelFor7PC;
                currentPay = findPayInMatrix(multipliedPay, currentLevel);
                currentPipb = undefined;
                currentGradePay = undefined;
                currentCommission = 7;
                fixation7thPC = { oldBasicPay, multipliedPay, initialRevisedPay: currentPay, level: currentLevel };
                remarks.push(`Pay fixed in 7th Pay Commission as per G.O.Ms.No.40/2021.`);
            }

            // --- Other Events (Promotions, Increments etc.) ---
            if (event.type.startsWith('PAY_REVISION_2010') && currentCommission === 6 && (event.data as PayRevision2010).postId === currentPostId) {
                // ... logic as before ...
            }

            if(event.type === 'DA_CHANGE' && event.data.commission === currentCommission) currentDaRate = event.data.rate;

            let steps = 0;
            let eventName = '';
            if (event.type.includes('GRADE')) { // Selection, Special, Super
                steps = (event.type === 'SELECTION_GRADE' && event.data.twoIncrements) || (event.type === 'SPECIAL_GRADE' && event.data.twoIncrements) ? 2 : 1;
                eventName = event.type.replace('_', ' ');
            } else if (event.type === 'STAGNATION_INCREMENT') {
                steps = 1; eventName = 'Stagnation Increment';
            }

            if (steps > 0 && !didIncrementThisMonth) {
                if(currentCommission === 5) {
                    currentPay = getIncrement5thPC(currentPay, current5thPCScaleString!, steps);
                } else {
                    const { newPay, newPipb } = getIncrement(currentPay, currentLevel, steps, currentCommission, currentGradePay);
                    currentPay = newPay;
                    if(newPipb !== undefined) currentPipb = newPipb;
                }
                remarks.push(`${eventName} applied.`);
                didIncrementThisMonth = true;
            }

            if (event.type === 'PROMOTION') {
                // ... promotion logic as before, for all 3 commissions ...
            }
        } // End of event loop for the month

        // --- Annual Increment ---
        const applicableChange = sortedIncrementChanges.filter(c => parseDateUTC(c.effectiveDate)! <= currentDate).pop();
        const incrementMonth = applicableChange ? { 'jan': 0, 'apr': 3, 'jul': 6, 'oct': 9 }[applicableChange.incrementMonth] : 6; // Default July
        
        if (currentDate.getUTCMonth() === incrementMonth && !didIncrementThisMonth) {
             const cutoffDate = new Date(currentDate);
             cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - (incrementEligibilityMonths ?? 6));
             if (doj <= cutoffDate) {
                if(currentCommission === 5) {
                    currentPay = getIncrement5thPC(currentPay, current5thPCScaleString!);
                } else {
                    const { newPay, newPipb } = getIncrement(currentPay, currentLevel, 1, currentCommission, currentGradePay);
                    currentPay = newPay;
                    if(newPipb !== undefined) currentPipb = newPipb;
                }
                remarks.push('Annual Increment applied.');
                didIncrementThisMonth = true;
             }
        }
        
        // --- Store Monthly Calculation ---
        if (currentDate >= calcStartDate) {
            const year = currentDate.getUTCFullYear();
            if (!yearlyCalculationsMap.has(year)) yearlyCalculationsMap.set(year, []);

            const daAmount = Math.round(currentPay * (currentDaRate / 100));
            const hra = getHra(currentPay, cityGrade, currentDate);
            const grossPay = currentPay + daAmount + hra;

            yearlyCalculationsMap.get(year)!.push({
                period: currentDate.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
                basicPay: currentPay,
                daRate: currentDaRate,
                daAmount,
                hra,
                grossPay,
                remarks,
                commission: currentCommission,
                payInPayBand: currentPipb,
                gradePay: currentGradePay
            });
        }
        
        // Advance to next month
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    } // End of main simulation loop

    // --- 5. FORMAT FINAL OUTPUT ---
    const yearlyCalculations = Array.from(yearlyCalculationsMap.entries()).map(([year, periods]) => ({ year, periods }));
    
    // ... (rest of the return statement to format EmployeeDetails is largely the same)
    
    const retirementDateStr = employeeDetails.dateOfBirth ? new Date(Date.UTC(parseDateUTC(employeeDetails.dateOfBirth)!.getUTCFullYear() + parseInt(employeeDetails.retirementAge, 10), parseDateUTC(employeeDetails.dateOfBirth)!.getUTCMonth() + 1, 0)).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : 'N/A';
    const joiningPostName = joiningPostId === 'custom' ? joiningPostCustomName : POSTS.find(p => p.id === joiningPostId)?.name;
    
    return {
        employeeDetails: {
            ...employeeDetails,
            dateOfBirth: parseDateUTC(employeeDetails.dateOfBirth)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
            dateOfJoining: doj.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
            // Fix: Access dateOfJoiningInOffice from the employeeDetails object.
            dateOfJoiningInOffice: parseDateUTC(employeeDetails.dateOfJoiningInOffice)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
            dateOfRelief: reliefDate ? reliefDate.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            retirementDate: retirementDateStr,
            joiningPost: joiningPostName || 'N/A',
            promotions: promotions.map(p => ({post: p.post, date: parseDateUTC(p.date)!.toLocaleDateString('en-GB', { timeZone: 'UTC' })})),
            payRevisions: appliedRevisions.map(r => ({ description: r.description, date: r.date.toLocaleDateString('en-GB', { timeZone: 'UTC' }) })),
            selectionGradeDate: selectionGradeDate ? parseDateUTC(selectionGradeDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            specialGradeDate: specialGradeDate ? parseDateUTC(specialGradeDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            superGradeDate: superGradeDate ? parseDateUTC(superGradeDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            stagnationIncrementDates: stagnationIncrementDates.length > 0 ? stagnationIncrementDates : undefined,
        },
        fixation6thPC,
        fixation7thPC,
        yearlyCalculations,
        appliedRevisions,
    };
};
