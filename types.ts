export interface EmployeeInput {
  employeeName: string;
  cpsGpfNo: string;
  dateOfBirth: string;
  retirementAge: '58' | '60';
  dateOfJoining: string;

  basicPay2005: number;
  scaleId: string;
  
  selectionGradeDate: string;
  specialGradeDate: string;

  promotionDate: string;
  promotionPost: string;
  promotionLevel: string;

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
    cpsGpfNo: string;
    dateOfBirth: string;
    dateOfJoining: string;
    retirementDate: string;
    promotionDate?: string;
    promotionPost?: string;
}


export interface PayrollResult {
  employeeDetails: EmployeeDetails;
  fixation6thPC: {
    basicPay2005: number;
    multipliedPay: number;
    initialPayInPayBand: number;
    initialGradePay: number;
    initialRevisedBasicPay: number;
  };
  fixation7thPC: {
    oldBasicPay: number;
    multipliedPay: number;
    initialRevisedPay: number;
    level: number;
  };
  yearlyCalculations: PayrollYear[];
}