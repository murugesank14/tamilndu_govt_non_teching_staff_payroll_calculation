export interface Post {
  id: string;
  name: string;
  scaleId: string;
  level: number;
}

export interface PayRevision2010 {
  postId: string;
  revisedScaleId: string;
  revisedLevel: number;
  description: string;
}

export interface Promotion {
  id: string; // for key prop
  date: string;
  post: string;
  gradePay?: number; // for pre-2016
  level?: string; // for post-2016
  rule22bOption?: 'promotionDate' | 'nextIncrementDate'; // For 7th PC promotions
}

export interface AnnualIncrementChange {
  id: string;
  effectiveDate: string;
  incrementMonth: 'jan' | 'apr' | 'jul' | 'oct';
}

export interface BreakInService {
  id: string;
  startDate: string;
  endDate: string;
}

export interface EmployeeInput {
  employeeName: string;
  fatherName: string;
  employeeNo: string;
  cpsGpfNo: string;
  panNumber: string;
  bankAccountNumber: string;
  dateOfBirth: string;
  retirementAge: '58' | '60';
  dateOfJoining: string;
  dateOfJoiningInOffice: string;
  dateOfRelief?: string;
  annualIncrementChanges: AnnualIncrementChange[];

  // Pay at time of joining
  joiningPostId?: string;
  joiningPostCustomName?: string;
  joiningBasicPay4thPC?: number; // For pre-1996 joiners
  joiningScaleId4thPC?: string; // For pre-1996 joiners
  joiningBasicPay5thPC?: number; // For pre-2006 joiners
  joiningScaleId5thPC?: string; // For pre-2006 joiners
  joiningPayInPayBand?: number; // For 6th PC joiners
  joiningScaleId6thPC?: string; // For 6th PC joiners
  joiningLevel?: string; // For 7th PC joiners

  selectionGradeDate: string;
  selectionGradeTwoIncrements: boolean;
  specialGradeDate: string;
  specialGradeTwoIncrements: boolean;
  superGradeDate: string;
  probationDeclarationDate?: string;
  stagnationIncrementDate?: string;
  probationPeriod?: number;
  accountTestPassDate?: string;
  departmentTestPassDate?: string;

  promotions: Promotion[];
  breaksInService: BreakInService[];
  incrementEligibilityMonths: number;

  cityGrade: CityGrade;
  
  calculationStartDate: string;
  calculationEndDate: string;

  // For Last Pay Certificate (LPC)
  festivalAdvance?: number;
  carAdvance?: number;

  twoWheelerAdvance?: number;
  computerAdvance?: number;
  otherPayables?: number;
}

export interface PayScale4thPC {
  id: string;
  scale: string;
}

export interface PayScale {
  id: string;
  scale: string;
  payBand: string;
  gradePay: number;
}

export interface PayScale5thPC {
  id: string;
  scale: string;
}

export enum CityGrade {
  GRADE_I_A = 'Grade I(a)',
  GRADE_I_B = 'Grade I(b)',
  GRADE_II = 'Grade II',
  GRADE_III = 'Grade III',
  GRADE_IV = 'Grade IV (Unclassified)',
}

export interface PayrollPeriod {
  period: string;
  basicPay: number;
  daRate: number;
  daAmount: number;
  hra: number;
  grossPay: number;
  remarks: string[];
  commission: 4 | 5 | 6 | 7;
  payInPayBand?: number; // Optional for 6th PC
  gradePay?: number; // Optional for 6th PC
}

export interface PayrollYear {
  year: number;
  periods: PayrollPeriod[];
}

export interface EmployeeDetails {
    employeeName: string;
    fatherName: string;
    employeeNo: string;
    cpsGpfNo: string;
    panNumber: string;
    bankAccountNumber: string;
    dateOfBirth: string;
    dateOfJoining: string;
    dateOfJoiningInOffice: string;
    dateOfRelief?: string;
    joiningPost?: string;
    retirementDate: string;
    retirementAge: '58' | '60';
    promotions: { post: string; date: string }[];
    payRevisions: { description: string; date: string }[];
    selectionGradeDate?: string;
    specialGradeDate?: string;
    superGradeDate?: string;
    probationDeclarationDate?: string;
    probationPeriod?: number;
    accountTestPassDate?: string;
    departmentTestPassDate?: string;
    stagnationIncrementDates?: string[];
    // For Last Pay Certificate (LPC)
    festivalAdvance?: number;
    carAdvance?: number;
    twoWheelerAdvance?: number;
    computerAdvance?: number;
    otherPayables?: number;
}

export interface PromotionFixation {
    newPost: string;
    oldLevel: number;
    newLevel: number;
    promotionDate: string;
    optionUnderRule22b: 'Date of Promotion' | 'Date of Next Increment';
    effectiveDate: string;
    oldBasic: number;
    payAfterNotionalIncrement: number;
    payAfterAnnualIncrement?: number;
    newBasic: number;
    goReference: string;
    fixationMethod: string;
}

export interface PayrollResult {
  employeeDetails: EmployeeDetails;
  fixation5thPC?: {
    basicPay1995: number;
    da1995: number;
    fitmentBenefit: number;
    totalPay: number;
    initialRevisedPay: number;
  };
  fixation6thPC?: {
    basicPay2005: number;
    multipliedPay: number;
    initialPayInPayBand: number;
    initialGradePay: number;
    initialRevisedBasicPay: number;
  };
  fixation7thPC?: {
    oldBasicPay: number;
    multipliedPay: number;
    initialRevisedPay: number;
    level: number;
  };
  promotionFixations?: PromotionFixation[];
  yearlyCalculations: PayrollYear[];
  appliedRevisions: { description: string, date: Date }[];
}

export type RuleType = 
  | { type: 'DA_REVISION'; rate: number; commission: 7 | 6 | 5 | 4 }
  | { type: 'HRA_REVISION_DA_50_PERCENT' }
  | { type: 'LEAVE_RULE_CHANGE'; leaveType: 'UnearnedLeavePrivateAffairs'; maxDays: 360 }
  | { type: 'SERVICE_RULE_AMENDMENT'; details: string }
  | { type: 'PAY_COMMISSION_FIXATION'; fitmentFactor: number }
  | { type: 'PROMOTION_RULE'; rule: string; details: any };

export interface GovernmentOrder {
  id: string;
  department: { en: string; ta: string };
  goNumberAndDate: { en: string; ta: string };
  subject: { en: string; ta: string };
  keyPoints: { en: string; ta: string };
  effectiveFrom: string; // YYYY-MM-DD
  category: 'Establishment' | 'Technical' | 'Service' | string; // Allow for combined strings like 'Establishment + Service'
  remarks: { en: string; ta: string };
  rule?: RuleType;
}

// --- Pension Calculator Types ---
export interface LastTenMonthsPay {
  id: string;
  month: string; // e.g., "YYYY-MM"
  basicPay: number | undefined;
}

export interface PensionInput {
  employeeName: string;
  dateOfBirth: string;
  dateOfJoining: string;
  retirementDate: string;
  lastTenMonthsPay: LastTenMonthsPay[];
  commutationPercentage: '0' | '33.33';
  qualifyingServiceYears?: number;
  qualifyingServiceMonths?: number;
}

export interface PensionResult {
  inputs: {
    retirementDate: string;
    ageAtRetirement: number;
    ageForCommutation: number;
  };
  calculations: {
    averageEmoluments: number;
    qualifyingService: string;
    daRateOnRetirement: number;
    lastPayPlusDA: number;
  };
  benefits: {
    fullPension: number;
    dcrg: number;
    commutedValue?: number;
    residuaryPension?: number;
    totalLumpSum: number;
  };
}

// --- GPF Calculator Types ---
export interface GPFTransaction {
  id: string;
  type: 'advance' | 'withdrawal' | 'refund';
  date: string; // YYYY-MM-DD
  amount: number | undefined;
  installments?: number | undefined; // For temporary advance
}

export interface GPFInput {
  employeeName: string;
  basicPay: number | undefined;
  openingBalance: number | undefined;
  subscription: number | undefined;
  isSubscriptionPercentage: boolean;
  transactions: GPFTransaction[];
  interestRate: number;
  calculationYear: string; // e.g., "2023" for FY 2023-24
}

export interface GPFMonthlyCalculation {
  month: string; // e.g., "April 2023"
  opening: number;
  subscription: number;
  withdrawals: number;
  refunds: number;
  closingForInterest: number;
  runningTotal: number;
}

export interface GPFResult {
  inputs: {
    financialYear: string;
    interestRate: number;
    openingBalance: number;
  };
  yearlyBreakdown: GPFMonthlyCalculation[];
  totals: {
    totalSubscriptions: number;
    totalWithdrawals: number;
    totalRefunds: number;
    totalInterest: number;
  };
  closingBalance: number;
}

// --- Leave Calculator Types ---
export interface LeaveTransaction {
  id: string;
  type: 'avail' | 'surrender' | 'credit';
  leaveType?: 'el' | 'hpl' | 'commuted'; // For 'avail' type
  days: number | undefined;
  description: string;
  amount?: number; // Calculated for surrenders
}

export interface LeaveInput {
  employeeName: string;
  basicPay: number | undefined;
  initialElBalance: number | undefined;
  initialHplBalance: number | undefined;
  transactions: Omit<LeaveTransaction, 'description' | 'amount'>[];
}

export interface LeaveResult {
  inputs: {
    initialEl: number;
    initialHpl: number;
  };
  finalBalances: {
    finalEl: number;
    finalHpl: number;
  };
  transactionLog: LeaveTransaction[];
}

// --- Audit Para & Recovery Tracker Types ---
export interface AuditPara {
  id: string;
  year: string;
  auditType: 'Local Fund' | 'AG' | 'Internal';
  paraNumber: string;
  subject: string;
  officerResponsible: string;
  recoveryAmount: number;
  irregularityNature: 'Establishment' | 'Works' | 'Revenue' | 'Others';
  recoveryProgress: number;
  complianceStatus: 'Not Submitted' | 'Submitted' | 'Dropped';
  remarks: string;
}

// --- Pay Slip Types ---
export type DeductionCategory = 'statutory' | 'non-statutory';

export interface PaySlipDeduction {
  name: string;
  nameTa: string;
  amount: number;
  category: DeductionCategory;
}
