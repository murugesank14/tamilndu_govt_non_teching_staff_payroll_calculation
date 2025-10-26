export interface Promotion {
  id: string; // for key prop
  date: string;
  post: string;
  gradePay?: number; // for pre-2016
  level?: string; // for post-2016
}

export interface AnnualIncrementChange {
  id: string;
  effectiveDate: string;
  incrementMonth: 'jan' | 'apr' | 'jul' | 'oct';
}

export interface EmployeeInput {
  employeeName: string;
  fatherName: string;
  employeeNo: string;
  cpsGpfNo: string;
  dateOfBirth: string;
  retirementAge: '58' | '60';
  dateOfJoining: string;
  dateOfJoiningInOffice: string;
  annualIncrementChanges: AnnualIncrementChange[];

  // Pay at time of joining
  joiningPostId?: string;
  basicPay2005?: number; // For pre-2006 joiners
  joiningPayInPayBand?: number; // For 6th PC joiners
  joiningScaleId?: string; // For pre-2006 OR 6th PC joiners
  joiningLevel?: string; // For 7th PC joiners

  selectionGradeDate: string;
  specialGradeDate: string;
  superGradeDate: string;

  promotions: Promotion[];

  cityGrade: CityGrade;
  
  calculationStartDate: string;
  calculationEndDate: string;
}

export interface PayScale {
  id: string;
  scale: string;
  payBand: string;
  gradePay: number;
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
    dateOfBirth: string;
    dateOfJoining: string;
    dateOfJoiningInOffice: string;
    joiningPost?: string;
    retirementDate: string;
    retirementAge: '58' | '60';
    promotions: { post: string; date: string }[];
    selectionGradeDate?: string;
    specialGradeDate?: string;
    superGradeDate?: string;
}


export interface PayrollResult {
  employeeDetails: EmployeeDetails;
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
  yearlyCalculations: PayrollYear[];
}