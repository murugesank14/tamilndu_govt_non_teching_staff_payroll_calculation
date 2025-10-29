import { EmployeeInput, PayrollResult, PayrollYear, PayrollPeriod, CityGrade, Promotion, Post, PayRevision2010, PayScale, GovernmentOrder, PromotionFixation, PensionInput, PensionResult, GPFInput, GPFResult, GPFMonthlyCalculation, LeaveInput, LeaveResult, LeaveTransaction } from '../types';
import { 
    PAY_MATRIX, GRADE_PAY_TO_LEVEL, HRA_SLABS_7TH_PC, 
    PAY_SCALES_6TH_PC, HRA_SLABS_6TH_PC, HRA_SLABS_6TH_PC_PRE_2009, HRA_SLABS_5TH_PC, HRA_SLABS_4TH_PC, POSTS,
    PAY_REVISIONS_2010, PAY_SCALES_5TH_PC, PAY_SCALES_4TH_PC,
    DA_RATES_4TH_PC, DA_RATES_5TH_PC, DA_RATES_6TH_PC, DA_RATES_7TH_PC,
    COMMUTATION_FACTORS
} from '../constants';

const FITMENT_FACTOR_6TH_PC = 1.86;

// Helper to parse YYYY-MM-DD string as a UTC date at midnight to avoid timezone issues.
const parseDateUTC = (dateString?: string): Date | undefined => {
  if (!dateString) return undefined;
  // Appending 'T00:00:00Z' ensures the date is parsed as UTC midnight.
  return new Date(`${dateString}T00:00:00Z`);
};

// --- Pay Calculation Helpers ---

const getDARate = (date: Date, commission: 4 | 5 | 6 | 7): number => {
    let schedule;
    switch (commission) {
        case 4: schedule = DA_RATES_4TH_PC; break;
        case 5: schedule = DA_RATES_5TH_PC; break;
        case 6: schedule = DA_RATES_6TH_PC; break;
        case 7: schedule = DA_RATES_7TH_PC; break;
        default: return 0;
    }
    const applicableRate = schedule.filter(r => r.date <= date).pop();
    return applicableRate ? applicableRate.rate : 0;
};


function findPayInMatrix(pay: number, level: number): number {
  const levelPayScale = PAY_MATRIX[level];
  if (!levelPayScale) throw new Error(`Invalid level: ${level}`);
  const newPay = levelPayScale.find(p => p >= pay);
  return newPay || levelPayScale[levelPayScale.length - 1];
}

function parseSlabScale(scale: string): { stages: { from: number, to: number, inc: number }[], max: number } {
    const parts = scale.replace(/\s/g, '').split('-').map(Number);
    if (parts.some(isNaN)) return { stages: [], max: 0 };
    const stages = [];
    for (let i = 0; i < parts.length - 2; i += 2) {
        // Handle cases like 900-20-1100 where 'to' is the next 'from'
        const from = parts[i];
        const inc = parts[i+1];
        const to = parts[i+2];
        stages.push({ from, to, inc });
    }
    return { stages, max: parts[parts.length - 1] };
}


function getIncrementForSlabScale(currentPay: number, scaleString: string, steps: number = 1): number {
    let newPay = currentPay;
    const scale = parseSlabScale(scaleString);
    if(scale.stages.length === 0) return newPay;
    
    for (let i = 0; i < steps; i++) {
        if (newPay >= scale.max) {
            newPay = scale.max;
            break;
        }
        let incrementApplied = false;
        for (const stage of scale.stages) {
            // If current pay is within a stage (e.g., between 900 and 1100 for 900-20-1100)
            if (newPay < stage.to) {
                newPay += stage.inc;
                incrementApplied = true;
                break;
            }
        }
        if (!incrementApplied) { // If pay is at or above the last 'from' value
             newPay += scale.stages[scale.stages.length - 1].inc;
        }
        
        if(newPay > scale.max) newPay = scale.max;
    }
    return newPay;
}

function findPayInSlabScale(pay: number, scaleString: string): number {
    const scale = parseSlabScale(scaleString);
    if (scale.stages.length === 0) return pay;

    // If pay is below the minimum, start from minimum
    if (pay < scale.stages[0].from) return scale.stages[0].from;
    
    let currentStagePay = scale.stages[0].from;
    while(currentStagePay < pay && currentStagePay < scale.max) {
        currentStagePay = getIncrementForSlabScale(currentStagePay, scaleString, 1);
    }
    return Math.min(currentStagePay, scale.max);
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

function getHra(basicPay: number, cityGrade: string, date: Date, daRate: number, hraRevisionGO: GovernmentOrder | undefined): { hra: number, revised: boolean, goRef?: string } {
    const is7thPC = date >= new Date('2016-01-01T00:00:00Z');

    // TN G.O.(Ms) No.83, Dated: 21.03.2024 - HRA revision when DA crosses 50%
    if (is7thPC && daRate >= 50 && hraRevisionGO && date >= parseDateUTC(hraRevisionGO.effectiveFrom)!) {
        let revisedHra = 0;
        let isRevised = false;
        const minHra = 1800; // As per G.O. for Y/Z cities

        if (cityGrade === CityGrade.GRADE_I_A) { // 'Y' Category - Chennai UA
            revisedHra = Math.round(basicPay * 0.20);
            isRevised = true;
        } else if (cityGrade === CityGrade.GRADE_I_B) { // 'Z' Category - Other Major Cities
            revisedHra = Math.round(basicPay * 0.10);
            isRevised = true;
        }

        if (isRevised) {
            // As per G.O, for other places, the old slab rates continue.
            return { hra: Math.max(revisedHra, minHra), revised: true, goRef: hraRevisionGO.goNumberAndDate.en };
        }
    }
    
    let slab;
    if (is7thPC) {
        slab = HRA_SLABS_7TH_PC.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
    } else if (date >= new Date('2006-01-01T00:00:00Z')) { // 6th PC
        const effectiveSlabs = date < new Date('2009-06-01T00:00:00Z') ? HRA_SLABS_6TH_PC_PRE_2009 : HRA_SLABS_6TH_PC;
        slab = effectiveSlabs.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
    } else if (date >= new Date('1996-01-01T00:00:00Z')) { // 5th PC
        slab = HRA_SLABS_5TH_PC.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
    } else { // 4th PC
        slab = HRA_SLABS_4TH_PC.find(s => basicPay >= s.payRange[0] && basicPay <= s.payRange[1]);
    }

    if (!slab) return { hra: 0, revised: false };
    return { hra: slab.rates[cityGrade as CityGrade] || 0, revised: false };
}


export const calculateFullPayroll = (data: EmployeeInput, activeGoData: GovernmentOrder[]): PayrollResult => {
    // --- 1. SETUP & INITIALIZATION ---
    
    // --- Build Rule Sets from G.O. Data ---
    const hraRevisionGO = activeGoData.find(go => go.rule?.type === 'HRA_REVISION_DA_50_PERCENT');
    const promotionRule22bGO = activeGoData.find(go => go.rule?.type === 'PROMOTION_RULE' && (go.rule as any).rule === '22(b)');
    const payCommission7thGO = activeGoData.find(go => go.rule?.type === 'PAY_COMMISSION_FIXATION' && go.effectiveFrom.startsWith('2016'));
    const gradeFixationSplitGO = activeGoData.find(go => go.rule?.type === 'PROMOTION_RULE' && (go.rule as any).rule === 'GradeFixationLevelSplit');
    const incrementOnGradeAwardDateGO = activeGoData.find(go => go.rule?.type === 'PROMOTION_RULE' && (go.rule as any).rule === 'IncrementOnGradeAwardDate');


    const { dateOfJoining, calculationStartDate, calculationEndDate, promotions, annualIncrementChanges, breaksInService, selectionGradeDate, specialGradeDate, superGradeDate, stagnationIncrementDate, cityGrade, incrementEligibilityMonths, joiningPostId, joiningPostCustomName, selectionGradeTwoIncrements, specialGradeTwoIncrements, probationDeclarationDate, accountTestPassDate, departmentTestPassDate, ...employeeDetails } = data;
    
    const doj = parseDateUTC(dateOfJoining);
    const calcStartDate = parseDateUTC(calculationStartDate);
    let calcEndDate = parseDateUTC(calculationEndDate);
    const reliefDate = parseDateUTC(employeeDetails.dateOfRelief);
    const probDate = parseDateUTC(probationDeclarationDate);

    if (!doj || !calcStartDate || !calcEndDate) {
      throw new Error('Please fill all required fields: Date of Joining and Calculation Period.');
    }
     if (doj < new Date('1984-10-01T00:00:00Z')) {
        throw new Error('Calculations before 01-10-1984 are not supported yet.');
    }

    if(reliefDate && reliefDate < calcEndDate) {
        calcEndDate = reliefDate;
    }
    
    // Increment postponement due to break in service (LOP/EOL)
    const totalLopDays = breaksInService.reduce((total, breakItem) => {
        const start = parseDateUTC(breakItem.startDate);
        const end = parseDateUTC(breakItem.endDate);
        if (start && end && end >= start) {
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
            return total + diffDays;
        }
        return total;
    }, 0);

    const effectiveDojForIncrement = new Date(doj);
    effectiveDojForIncrement.setUTCDate(effectiveDojForIncrement.getUTCDate() + totalLopDays);
    
    // --- State Variables for Simulation ---
    let currentPay: number;
    let currentCommission: 4 | 5 | 6 | 7;
    let currentLevel: number = 0;
    let currentPipb: number | undefined = undefined;
    let currentGradePay: number | undefined = undefined;
    let current4thPCScaleString: string | undefined = undefined;
    let current5thPCScaleString: string | undefined = undefined;
    let currentPostId: string | undefined = joiningPostId;
    let deferredPromotionFixation: { promotion: Promotion, oldLevel: number } | null = null;

    let fixation5thPC: PayrollResult['fixation5thPC'] | undefined = undefined;
    let fixation6thPC: PayrollResult['fixation6thPC'] | undefined = undefined;
    let fixation7thPC: PayrollResult['fixation7thPC'] | undefined = undefined;
    const promotionFixations: PromotionFixation[] = [];
    const appliedRevisions: { description: string, date: Date }[] = [];
    const stagnationIncrementDates: string[] = [];
    
    // --- 2. INITIAL PAY FIXATION (at Date of Joining) ---
    const fixedDate1996 = new Date('1996-01-01T00:00:00Z');
    const fixedDate2006 = new Date('2006-01-01T00:00:00Z');
    const fixedDate2016 = new Date('2016-01-01T00:00:00Z');

    if (doj < fixedDate1996) { // 4th PC
        currentCommission = 4;
        const { joiningBasicPay4thPC, joiningScaleId4thPC } = data;
        if (joiningBasicPay4thPC === undefined || !joiningScaleId4thPC) throw new Error("For pre-1996 joiners, 4th PC Pay Scale and Basic Pay at joining are required.");
        const scaleInfo = PAY_SCALES_4TH_PC.find(s => s.id === joiningScaleId4thPC);
        if(!scaleInfo) throw new Error(`Invalid 4th PC Scale ID: ${joiningScaleId4thPC}`);
        currentPay = joiningBasicPay4thPC;
        current4thPCScaleString = scaleInfo.scale;
    } else if (doj < fixedDate2006) { // 5th PC
        currentCommission = 5;
        const { joiningBasicPay5thPC, joiningScaleId5thPC } = data;
        if (joiningBasicPay5thPC === undefined || !joiningScaleId5thPC) throw new Error("For pre-2006 joiners, 5th PC Pay Scale and Basic Pay at joining are required.");
        const scaleInfo = PAY_SCALES_5TH_PC.find(s => s.id === joiningScaleId5thPC);
        if(!scaleInfo) throw new Error(`Invalid 5th PC Scale ID: ${joiningScaleId5thPC}`);
        currentPay = joiningBasicPay5thPC;
        current5thPCScaleString = scaleInfo.scale;
    } else if (doj < fixedDate2016) { // 6th PC
        currentCommission = 6;
        const { joiningPayInPayBand, joiningScaleId6thPC } = data;
        if (joiningPayInPayBand === undefined || !joiningScaleId6thPC) throw new Error("For 6th PC joiners, Pay in Pay Band and Scale are required.");
        const scaleInfo = PAY_SCALES_6TH_PC.find(s => s.id === joiningScaleId6thPC);
        if (!scaleInfo) throw new Error(`Invalid 6th PC Scale ID: ${joiningScaleId6thPC}`);
        currentPipb = joiningPayInPayBand;
        currentGradePay = scaleInfo.gradePay;
        currentPay = currentPipb + currentGradePay;
    } else { // 7th PC
        currentCommission = 7;
        const { joiningLevel } = data;
        if (!joiningLevel) throw new Error("For 7th PC joiners, Pay Level is required.");
        currentLevel = parseInt(joiningLevel, 10);
        currentPay = PAY_MATRIX[currentLevel][0];
    }

    // --- 3. BUILD CHRONOLOGICAL EVENT LIST ---
    const events: { date: Date, type: string, data?: any, priority: number }[] = [
        { date: fixedDate1996, type: 'PAY_COMMISSION_5', priority: 2 },
        { date: fixedDate2006, type: 'PAY_COMMISSION_6', priority: 2 },
        { date: fixedDate2016, type: 'PAY_COMMISSION_7', priority: 2 },
    ];
    if (selectionGradeDate) events.push({ date: parseDateUTC(selectionGradeDate)!, type: 'SELECTION_GRADE', data: { twoIncrements: selectionGradeTwoIncrements }, priority: 3 });
    if (specialGradeDate) events.push({ date: parseDateUTC(specialGradeDate)!, type: 'SPECIAL_GRADE', data: { twoIncrements: specialGradeTwoIncrements }, priority: 3 });
    if (superGradeDate) events.push({ date: parseDateUTC(superGradeDate)!, type: 'SUPER_GRADE', priority: 3 });
    if (accountTestPassDate) events.push({ date: parseDateUTC(accountTestPassDate)!, type: 'ACCOUNT_TEST_INCREMENT', priority: 4 });
    if (departmentTestPassDate) events.push({ date: parseDateUTC(departmentTestPassDate)!, type: 'DEPARTMENTAL_TEST_INCREMENT', priority: 4 });
    promotions.forEach(p => p.date && events.push({ date: parseDateUTC(p.date)!, type: 'PROMOTION', data: p, priority: 3 }));
    PAY_REVISIONS_2010.forEach(rev => events.push({ date: new Date('2010-08-01T00:00:00Z'), type: 'PAY_REVISION_2010', data: rev, priority: 3 }));
    let lastStagnationCheckDate = stagnationIncrementDate ? parseDateUTC(stagnationIncrementDate) : null;


    // --- 4. THE SIMULATION LOOP ---
    const yearlyCalculationsMap: Map<number, PayrollPeriod[]> = new Map();
    let currentDate = new Date(doj);
    let firstIncrementApplied = false;
    const sortedIncrementChanges = [...annualIncrementChanges].filter(c => c.effectiveDate).sort((a, b) => parseDateUTC(a.effectiveDate)!.getTime() - parseDateUTC(b.effectiveDate)!.getTime());
    
    while (currentDate <= calcEndDate) {
        let remarks: string[] = [];
        let didIncrementThisMonth = false;

        // --- Determine current increment month for event checks ---
        const applicableIncrementChange = sortedIncrementChanges.filter(c => parseDateUTC(c.effectiveDate)! <= currentDate).pop();
        const currentIncrementMonth = applicableIncrementChange ? { 'jan': 0, 'apr': 3, 'jul': 6, 'oct': 9 }[applicableIncrementChange.incrementMonth] : 6; // Default July

        // --- Process Events for the current month ---
        const monthEvents = events.filter(e => e.date.getUTCFullYear() === currentDate.getUTCFullYear() && e.date.getUTCMonth() === currentDate.getUTCMonth()).sort((a,b) => a.priority - b.priority);
        
        for (const event of monthEvents) {
            
            // --- PAY COMMISSION FIXATION ---
            if (event.type === 'PAY_COMMISSION_5' && currentCommission === 4) {
                 const basicPay1995 = currentPay;
                 // As per G.O. 162, DA was 148% of Basic Pay. Using a flat rate for simplicity.
                 const da1995 = Math.floor(basicPay1995 * 1.48); 
                 const fitmentBenefit = Math.max(Math.round(basicPay1995 * 0.20), 50);
                 const totalPay = basicPay1995 + da1995 + fitmentBenefit;

                 const scaleInfo4th = PAY_SCALES_4TH_PC.find(s => s.scale === current4thPCScaleString);
                 if (!scaleInfo4th) throw new Error(`Could not find 4th PC scale mapping for ${current4thPCScaleString}`);
                 
                 const scaleInfo5th = PAY_SCALES_5TH_PC.find(s => s.id === scaleInfo4th.id);
                 if (!scaleInfo5th) throw new Error(`Could not find 5th PC scale equivalent for 4th PC ID ${scaleInfo4th.id}`);

                 currentPay = findPayInSlabScale(totalPay, scaleInfo5th.scale);
                 current5thPCScaleString = scaleInfo5th.scale;
                 current4thPCScaleString = undefined;
                 currentCommission = 5;
                 fixation5thPC = { basicPay1995, da1995, fitmentBenefit, totalPay, initialRevisedPay: currentPay };
                 remarks.push(`Pay fixed in 5th Pay Commission as per G.O.Ms.No.162/1998.`);
            }

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
                const fitmentFactor = payCommission7thGO && (payCommission7thGO.rule as any).fitmentFactor 
                    ? (payCommission7thGO.rule as any).fitmentFactor 
                    : 2.57; // Fallback
                const oldBasicPay = currentPay;
                const multipliedPay = Math.round(oldBasicPay * fitmentFactor);
                const levelFor7PC = GRADE_PAY_TO_LEVEL[currentGradePay!];
                if (!levelFor7PC) throw new Error(`Could not find a level for Grade Pay ${currentGradePay} at 7th PC transition.`);
                
                currentLevel = levelFor7PC;
                currentPay = findPayInMatrix(multipliedPay, currentLevel);
                currentPipb = undefined;
                currentGradePay = undefined;
                currentCommission = 7;
                                
                fixation7thPC = { oldBasicPay, multipliedPay, initialRevisedPay: currentPay, level: currentLevel };
                remarks.push(`Pay fixed in 7th Pay Commission as per ${payCommission7thGO?.goNumberAndDate.en || 'G.O.Ms.No.303/2017 & G.O.Ms.No.40/2021'}.`);
            }

            // --- Other Events (Promotions, Increments etc.) ---
            if (event.type.startsWith('PAY_REVISION_2010') && currentCommission === 6 && (event.data as PayRevision2010).postId === currentPostId) {
                // ... logic as before ...
            }
            
            if (event.type === 'PROMOTION') {
                const promo: Promotion = event.data;
                const option = promo.rule22bOption || 'promotionDate';

                // Check if the promotion date is within the effective period of Rule 22(b) for 7th PC
                if (promotionRule22bGO && event.date >= parseDateUTC(promotionRule22bGO.effectiveFrom)! && promo.level) {
                     if (option === 'nextIncrementDate') {
                        deferredPromotionFixation = { promotion: promo, oldLevel: currentLevel };
                        remarks.push(`Promoted to ${promo.post}. Pay fixation deferred to next increment date under Rule 22(b) option.`);
                    } else {
                        const oldBasic = currentPay;
                        const oldLevel = currentLevel;
                        const newLevel = parseInt(promo.level, 10);
                        
                        const { newPay: payAfterNotionalInc } = getIncrement(oldBasic, oldLevel, 1, 7);
                        const newBasic = findPayInMatrix(payAfterNotionalInc, newLevel);

                        currentPay = newBasic;
                        currentLevel = newLevel;
                        
                        remarks.push(`Pay fixed on promotion to ${promo.post} under Rule 22(b).`);
                        promotionFixations.push({
                            newPost: promo.post, oldLevel, newLevel,
                            promotionDate: parseDateUTC(promo.date)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
                            optionUnderRule22b: 'Date of Promotion',
                            effectiveDate: currentDate.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
                            oldBasic, payAfterNotionalIncrement: payAfterNotionalInc, newBasic,
                            goReference: `Rule 22(b), TNRPR 2017 (${promotionRule22bGO.goNumberAndDate.en})`,
                            fixationMethod: 'One notional increment granted in lower level; fixed at next higher cell in new level.'
                        });
                    }
                }
                 // Handle promotions for other commissions if necessary...
            }
            
            if (event.type === 'ACCOUNT_TEST_INCREMENT' || event.type === 'DEPARTMENTAL_TEST_INCREMENT') {
                const steps = 1;
                const eventName = event.type === 'ACCOUNT_TEST_INCREMENT' ? 'Account Test Increment' : 'Departmental Test Increment';
                if(currentCommission <= 5) {
                    const scale = currentCommission === 4 ? current4thPCScaleString! : current5thPCScaleString!;
                    currentPay = getIncrementForSlabScale(currentPay, scale, steps);
                } else {
                    const { newPay, newPipb } = getIncrement(currentPay, currentLevel, steps, currentCommission as 6 | 7, currentGradePay);
                    currentPay = newPay;
                    if(newPipb !== undefined) currentPipb = newPipb;
                }
                remarks.push(`${eventName} granted.`);
                // Note: We do NOT set didIncrementThisMonth = true, as test increments are additional.
            }

            if ((event.type === 'SELECTION_GRADE' || event.type === 'SPECIAL_GRADE') && !didIncrementThisMonth) {
                const isPost2016 = event.date >= new Date('2016-01-01T00:00:00Z');
                const gradeType = event.type === 'SELECTION_GRADE' ? 'Selection Grade' : 'Special Grade';
                
                // G.O. 237/2013 Logic: Handle increment on the same day as grade award in 6th PC
                const is6thPCPeriod = currentCommission === 6 && event.date < fixedDate2016;
                const isIncrementAndGradeAwardSameDay = incrementOnGradeAwardDateGO && is6thPCPeriod && event.date.getUTCMonth() === currentIncrementMonth;

                if (isIncrementAndGradeAwardSameDay) {
                    // 1. Apply annual increment first
                    const { newPay: payAfterAnnual, newPipb: pipbAfterAnnual } = getIncrement(currentPay, currentLevel, 1, 6, currentGradePay);
                    currentPay = payAfterAnnual;
                    if (pipbAfterAnnual !== undefined) currentPipb = pipbAfterAnnual;
                    remarks.push(`Annual Increment applied first as per ${incrementOnGradeAwardDateGO.goNumberAndDate.en}.`);
                    
                    // 2. Then apply grade award on the new pay
                    const steps = (event.type === 'SELECTION_GRADE' && event.data.twoIncrements) || 
                                  (event.type === 'SPECIAL_GRADE' && event.data.twoIncrements) ? 2 : 1;
                    const { newPay: payAfterGrade, newPipb: pipbAfterGrade } = getIncrement(currentPay, currentLevel, steps, 6, currentGradePay);
                    currentPay = payAfterGrade;
                    if (pipbAfterGrade !== undefined) currentPipb = pipbAfterGrade;

                    remarks.push(`${gradeType} (${steps} increment(s)) applied on incremented pay.`);
                    didIncrementThisMonth = true;

                } else if (isPost2016 && currentCommission === 7) {
                    const splitLevel = gradeFixationSplitGO ? (gradeFixationSplitGO.rule as any).details.splitLevel : null;
                    const isNewRuleApplicable = gradeFixationSplitGO && event.date >= parseDateUTC(gradeFixationSplitGO.effectiveFrom)!;

                    if (isNewRuleApplicable && currentLevel <= splitLevel) {
                        // New logic: 1 notional increment + fix in next level
                        const { newPay: payAfterNotionalInc } = getIncrement(currentPay, currentLevel, 1, 7);
                        const newLevel = currentLevel + 1;
                        
                        if (PAY_MATRIX[newLevel]) {
                            const newPay = findPayInMatrix(payAfterNotionalInc, newLevel);
                            currentPay = newPay;
                            currentLevel = newLevel;
                            remarks.push(`${gradeType} awarded. Pay fixed in next level (Lvl ${newLevel}) as per ${gradeFixationSplitGO.goNumberAndDate.en}.`);
                            didIncrementThisMonth = true;
                        } else {
                            remarks.push(`Cannot apply new ${gradeType} rule: Next level ${newLevel} does not exist. Please review rules.`);
                        }

                    } else {
                        // Existing logic (G.O.Ms.No.40/2021): move two cells forward in the same level.
                        const levelPayScale = PAY_MATRIX[currentLevel];
                        if (!levelPayScale) {
                            remarks.push(`Cannot apply ${gradeType}: Invalid pay matrix level ${currentLevel}.`);
                        } else {
                            const currentIndex = levelPayScale.indexOf(currentPay);
                            if (currentIndex === -1) {
                                remarks.push(`Cannot apply ${gradeType}: Current pay ${currentPay} not found in Level ${currentLevel} matrix.`);
                            } else {
                                const newIndex = Math.min(currentIndex + 2, levelPayScale.length - 1);
                                const newPay = levelPayScale[newIndex];

                                if (newPay > currentPay) {
                                    currentPay = newPay;
                                    remarks.push(`${gradeType} awarded. Pay fixed two cells ahead in Level ${currentLevel}. Ref: G.O.Ms.No.40/2021`);
                                } else {
                                    remarks.push(`${gradeType} awarded, but already at maximum pay in Level ${currentLevel}.`);
                                }
                                didIncrementThisMonth = true;
                            }
                        }
                    }
                } else {
                    // Pre-2016 or 6th PC logic (standard case, no same-day increment)
                    const steps = (event.type === 'SELECTION_GRADE' && event.data.twoIncrements) || 
                                  (event.type === 'SPECIAL_GRADE' && event.data.twoIncrements) ? 2 : 1;
                    
                    if (currentCommission <= 5) {
                        const scale = currentCommission === 4 ? current4thPCScaleString! : current5thPCScaleString!;
                        currentPay = getIncrementForSlabScale(currentPay, scale, steps);
                    } else { // 6th PC
                        const { newPay, newPipb } = getIncrement(currentPay, currentLevel, steps, 6, currentGradePay);
                        currentPay = newPay;
                        if (newPipb !== undefined) currentPipb = newPipb;
                    }
                    remarks.push(`${gradeType} (${steps} increment(s)) applied.`);
                    didIncrementThisMonth = true;
                }
            } else if (event.type === 'SUPER_GRADE' && !didIncrementThisMonth) {
                // Super Grade logic (1 increment)
                const steps = 1;
                if(currentCommission <= 5) {
                    const scale = currentCommission === 4 ? current4thPCScaleString! : current5thPCScaleString!;
                    currentPay = getIncrementForSlabScale(currentPay, scale, steps);
                } else {
                    const { newPay, newPipb } = getIncrement(currentPay, currentLevel, steps, currentCommission as 6 | 7, currentGradePay);
                    currentPay = newPay;
                    if(newPipb !== undefined) currentPipb = newPipb;
                }
                remarks.push(`Super Grade applied.`);
                didIncrementThisMonth = true;
            }

        } // End of event loop for the month

        // --- Annual Increment ---
        if (currentDate.getUTCMonth() === currentIncrementMonth && !didIncrementThisMonth) {
             const cutoffDate = new Date(currentDate);
             cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - (incrementEligibilityMonths ?? 6));
             if (effectiveDojForIncrement <= cutoffDate) {
                // Check if probation is declared (only for the first increment)
                if (!firstIncrementApplied && probDate && currentDate < probDate) {
                    remarks.push('Annual Increment deferred pending probation declaration.');
                } else if (deferredPromotionFixation && deferredPromotionFixation.oldLevel === currentLevel) {
                    // This is the increment date for the deferred promotion
                    const oldBasic = currentPay;
                    const oldLevel = currentLevel;
                    const newLevel = parseInt(deferredPromotionFixation.promotion.level!, 10);

                    // 1. Grant annual increment in the lower post
                    const { newPay: payAfterAnnualInc } = getIncrement(oldBasic, oldLevel, 1, 7);
                    remarks.push('Annual Increment applied in lower post.');

                    // 2. Fix pay in higher level based on pay after annual increment
                    const newBasic = findPayInMatrix(payAfterAnnualInc, newLevel);

                    currentPay = newBasic;
                    currentLevel = newLevel;

                    remarks.push(`Pay fixed on promotion to ${deferredPromotionFixation.promotion.post} under Rule 22(b) option.`);
                    promotionFixations.push({
                        newPost: deferredPromotionFixation.promotion.post, oldLevel, newLevel,
                        promotionDate: parseDateUTC(deferredPromotionFixation.promotion.date)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
                        optionUnderRule22b: 'Date of Next Increment',
                        effectiveDate: currentDate.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
                        oldBasic, payAfterAnnualIncrement: payAfterAnnualInc,
                        payAfterNotionalIncrement: payAfterAnnualInc, 
                        newBasic,
                        goReference: `Rule 22(b), TNRPR 2017 (${promotionRule22bGO?.goNumberAndDate.en})`,
                        fixationMethod: 'One annual increment granted in lower level; pay fixed at next higher cell in new level.'
                    });

                    deferredPromotionFixation = null; // Clear the flag
                    didIncrementThisMonth = true;
                    if (!firstIncrementApplied) firstIncrementApplied = true;

                } else { // Normal annual increment
                    if(currentCommission <= 5) {
                        const scale = currentCommission === 4 ? current4thPCScaleString! : current5thPCScaleString!;
                        currentPay = getIncrementForSlabScale(currentPay, scale);
                    } else {
                        const { newPay, newPipb } = getIncrement(currentPay, currentLevel, 1, currentCommission as 6 | 7, currentGradePay);
                        currentPay = newPay;
                        if(newPipb !== undefined) currentPipb = newPipb;
                    }
                    remarks.push('Annual Increment applied.');
                    didIncrementThisMonth = true;
                    if (!firstIncrementApplied) {
                        firstIncrementApplied = true;
                    }
                }
             }
        }
        
        // --- Store Monthly Calculation ---
        if (currentDate >= calcStartDate) {
            const year = currentDate.getUTCFullYear();
            if (!yearlyCalculationsMap.has(year)) yearlyCalculationsMap.set(year, []);

            const currentDaRate = getDARate(currentDate, currentCommission);
            
            // Add remark for DA change
            const previousMonthDate = new Date(currentDate);
            previousMonthDate.setUTCMonth(previousMonthDate.getUTCMonth() - 1);
            const previousDaRate = getDARate(previousMonthDate, currentCommission);
            if (currentDaRate !== previousDaRate && currentDate >= new Date('2016-07-01T00:00:00Z')) {
                remarks.push(`DA revised to ${currentDaRate}%.`);
            }

            const daAmount = Math.round(currentPay * (currentDaRate / 100));
            const { hra, revised: hraRevised, goRef: hraGoRef } = getHra(currentPay, cityGrade, currentDate, currentDaRate, hraRevisionGO);
            if (hraRevised && hraGoRef) {
                remarks.push(`HRA revised as per ${hraGoRef} (DA>=50%).`);
            }
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
            probationPeriod: data.probationPeriod,
            accountTestPassDate: data.accountTestPassDate ? parseDateUTC(data.accountTestPassDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            departmentTestPassDate: data.departmentTestPassDate ? parseDateUTC(data.departmentTestPassDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            dateOfBirth: parseDateUTC(employeeDetails.dateOfBirth)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
            dateOfJoining: doj.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
            dateOfJoiningInOffice: parseDateUTC(employeeDetails.dateOfJoiningInOffice)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
            dateOfRelief: reliefDate ? reliefDate.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            retirementDate: retirementDateStr,
            joiningPost: joiningPostName || 'N/A',
            promotions: promotions.map(p => ({post: p.post, date: parseDateUTC(p.date)!.toLocaleDateString('en-GB', { timeZone: 'UTC' })})),
            payRevisions: appliedRevisions.map(r => ({ description: r.description, date: r.date.toLocaleDateString('en-GB', { timeZone: 'UTC' }) })),
            selectionGradeDate: selectionGradeDate ? parseDateUTC(selectionGradeDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            specialGradeDate: specialGradeDate ? parseDateUTC(specialGradeDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            superGradeDate: superGradeDate ? parseDateUTC(superGradeDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            probationDeclarationDate: probationDeclarationDate ? parseDateUTC(probationDeclarationDate)!.toLocaleDateString('en-GB', { timeZone: 'UTC' }) : undefined,
            stagnationIncrementDates: stagnationIncrementDates.length > 0 ? stagnationIncrementDates : undefined,
        },
        fixation5thPC,
        fixation6thPC,
        fixation7thPC,
        promotionFixations: promotionFixations.length > 0 ? promotionFixations : undefined,
        yearlyCalculations,
        appliedRevisions,
    };
};

export const calculatePension = (data: PensionInput): PensionResult => {
    const { dateOfBirth, dateOfJoining, retirementDate, lastTenMonthsPay, commutationPercentage, qualifyingServiceYears, qualifyingServiceMonths } = data;

    if (!dateOfBirth || !dateOfJoining || !retirementDate || lastTenMonthsPay.some(p => p.basicPay === undefined)) {
        throw new Error("Please fill all required fields: Name, Dates, and all 10 Basic Pay entries.");
    }

    const dor = parseDateUTC(retirementDate)!;
    const dob = parseDateUTC(dateOfBirth)!;
    const doj = parseDateUTC(dateOfJoining)!;

    // --- Calculations ---
    let ageAtRetirement = dor.getUTCFullYear() - dob.getUTCFullYear();
    if (dor.getUTCMonth() < dob.getUTCMonth() || (dor.getUTCMonth() === dob.getUTCMonth() && dor.getUTCDate() < dob.getUTCDate())) {
        ageAtRetirement--;
    }
    const ageForCommutation = ageAtRetirement + 1;

    let qsYears = qualifyingServiceYears ?? 0;
    let qsMonths = qualifyingServiceMonths ?? 0;
    let qualifyingServiceStr: string;

    if (qualifyingServiceYears === undefined || qualifyingServiceMonths === undefined) {
        let diff = dor.getTime() - doj.getTime();
        let years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        let months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * (365.25 / 12)));
        qsYears = years;
        qsMonths = months;
        qualifyingServiceStr = `${years} years, ${months} months`;
    } else {
        qualifyingServiceStr = `${qsYears} years, ${qsMonths} months (Override)`;
    }

    const totalValidPays = lastTenMonthsPay.filter(p => p.basicPay! > 0);
    if(totalValidPays.length !== 10) throw new Error("Please enter a valid Basic Pay for all 10 months.");
    const sumOfPay = totalValidPays.reduce((acc, curr) => acc + curr.basicPay!, 0);
    const averageEmoluments = sumOfPay / 10;
    
    const fullPension = Math.round(averageEmoluments / 2);

    // DCRG Calculation
    const daRateOnRetirement = getDARate(dor, 7); // Assuming 7th PC for DA rates on retirement
    const lastBasicPay = lastTenMonthsPay[9].basicPay!;
    const lastPayPlusDA = lastBasicPay + Math.round(lastBasicPay * (daRateOnRetirement / 100));

    const qualifyingServiceInHalfYears = Math.min(Math.floor((qsYears + qsMonths / 12) * 2), 66);
    let dcrg = Math.round((lastPayPlusDA / 4) * qualifyingServiceInHalfYears);
    const DCRG_CAP = 2000000;
    dcrg = Math.min(dcrg, DCRG_CAP);

    let benefits: PensionResult['benefits'] = {
        fullPension,
        dcrg,
        totalLumpSum: dcrg,
    };

    if (commutationPercentage === '33.33') {
        const commutationFactor = COMMUTATION_FACTORS[ageForCommutation] || 0;
        if(commutationFactor === 0) throw new Error(`Commutation factor not available for age ${ageForCommutation}. Please check rules.`);
        const commutedPortion = Math.floor(fullPension / 3);
        const commutedValue = Math.round(commutedPortion * 12 * commutationFactor);
        const residuaryPension = fullPension - commutedPortion;
        
        benefits = {
            ...benefits,
            commutedValue,
            residuaryPension,
            totalLumpSum: dcrg + commutedValue,
        };
    }
    
    return {
        inputs: {
            retirementDate: dor.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
            ageAtRetirement,
            ageForCommutation,
        },
        calculations: {
            averageEmoluments,
            qualifyingService: qualifyingServiceStr,
            daRateOnRetirement,
            lastPayPlusDA,
        },
        benefits,
    };
};

export const calculateGPF = (data: GPFInput): GPFResult => {
    const { openingBalance = 0, subscription = 0, basicPay = 0, isSubscriptionPercentage, transactions, interestRate, calculationYear } = data;

    if (!calculationYear) throw new Error("Please select a financial year.");
    
    const startYear = parseInt(calculationYear, 10);
    const financialYear = `${startYear}-${(startYear + 1).toString().slice(-2)}`;

    const monthlySubscription = isSubscriptionPercentage 
        ? Math.round((basicPay * subscription) / 100) 
        : subscription;

    let runningBalance = openingBalance;
    let progressiveTotal = 0;
    const yearlyBreakdown: GPFMonthlyCalculation[] = [];
    
    let totalSubscriptions = 0;
    let totalWithdrawals = 0;
    let totalRefunds = 0;

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const currentMonth = (monthIndex + 3) % 12; // 0=Jan, 3=Apr
        const currentYear = monthIndex < 9 ? startYear : startYear + 1;
        
        const monthDate = new Date(Date.UTC(currentYear, currentMonth, 1));
        const monthLabel = monthDate.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

        const monthlyTransactions = transactions.filter(t => {
            const tDate = parseDateUTC(t.date);
            return tDate && tDate.getUTCFullYear() === currentYear && tDate.getUTCMonth() === currentMonth;
        });

        const monthlyWithdrawals = monthlyTransactions
            .filter(t => (t.type === 'advance' || t.type === 'withdrawal') && t.amount)
            .reduce((sum, t) => sum + t.amount!, 0);

        const monthlyRefunds = monthlyTransactions
            .filter(t => t.type === 'refund' && t.amount)
            .reduce((sum, t) => sum + t.amount!, 0);

        const openingForMonth = runningBalance;
        const closingForInterest = openingForMonth + monthlySubscription + monthlyRefunds - monthlyWithdrawals;
        
        progressiveTotal += closingForInterest;
        runningBalance = closingForInterest;
        
        totalSubscriptions += monthlySubscription;
        totalWithdrawals += monthlyWithdrawals;
        totalRefunds += monthlyRefunds;

        yearlyBreakdown.push({
            month: monthLabel,
            opening: openingForMonth,
            subscription: monthlySubscription,
            withdrawals: monthlyWithdrawals,
            refunds: monthlyRefunds,
            closingForInterest: closingForInterest,
            runningTotal: progressiveTotal,
        });
    }
    
    const totalInterest = Math.floor(progressiveTotal * (interestRate / 100) / 12);
    const closingBalance = runningBalance + totalInterest;

    return {
        inputs: {
            financialYear,
            interestRate,
            openingBalance,
        },
        yearlyBreakdown,
        totals: {
            totalSubscriptions,
            totalWithdrawals,
            totalRefunds,
            totalInterest,
        },
        closingBalance
    };
};

export const calculateLeave = (data: LeaveInput): LeaveResult => {
  const { initialElBalance = 0, initialHplBalance = 0, basicPay = 0, transactions } = data;

  if (basicPay <= 0) {
    throw new Error("Please provide a valid Basic Pay for surrender calculations.");
  }
  
  let el = initialElBalance;
  let hpl = initialHplBalance;
  const transactionLog: LeaveTransaction[] = [];

  const currentDaRate = getDARate(new Date(), 7); // Use latest 7th PC DA rate
  const EL_MAX_ACCUMULATION = 300;

  for (const t of transactions) {
    const days = t.days ?? 0;
    if (days <= 0) continue;

    let logEntry: LeaveTransaction = { ...t, description: '', id: t.id };

    switch (t.type) {
      case 'avail':
        if (t.leaveType === 'el') {
          const debit = Math.min(el, days);
          el -= debit;
          logEntry.description = `Availed ${debit} days of Earned Leave.`;
        } else if (t.leaveType === 'hpl') {
          const debit = Math.min(hpl, days);
          hpl -= debit;
          logEntry.description = `Availed ${debit} days of Half Pay Leave.`;
        } else if (t.leaveType === 'commuted') {
          const hplDebit = days * 2;
          const actualDebit = Math.min(hpl, hplDebit);
          hpl -= actualDebit;
          logEntry.description = `Availed ${actualDebit / 2} days of Commuted Leave (debited ${actualDebit} HPL).`;
        }
        break;
      case 'surrender':
        const debit = Math.min(el, days);
        if (debit > 0) {
          el -= debit;
          const daAmount = Math.round(basicPay * (currentDaRate / 100));
          const oneDaySalary = (basicPay + daAmount) / 30;
          const surrenderAmount = Math.round(oneDaySalary * debit);
          logEntry.amount = surrenderAmount;
          logEntry.description = `Surrendered ${debit} days of EL for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(surrenderAmount)}.`;
        } else {
          logEntry.description = `Attempted to surrender ${days} days of EL, but balance was zero.`;
        }
        break;
      case 'credit':
        // As per rules, credit is 15 EL and 10 HPL per half year
        const elCredit = 15;
        const hplCredit = 10;
        
        el = Math.min(el + elCredit, EL_MAX_ACCUMULATION);
        hpl += hplCredit;
        logEntry.description = `Credited ${elCredit} days EL and ${hplCredit} days HPL for half-year.`;
        break;
    }
    transactionLog.push(logEntry);
  }

  return {
    inputs: {
      initialEl: initialElBalance,
      initialHpl: initialHplBalance,
    },
    finalBalances: {
      finalEl: el,
      finalHpl: hpl,
    },
    transactionLog,
  };
};