import { z } from "zod";
import { db } from "@/lib/db";
import {
  Money,
  Tenor,
  InterestRate,
  CalculationMethod,
} from "@/lib/domain";
import { Product, PaymentOffice, CreditParameter, FeeParameter } from "@prisma/client";

export interface CalculationInputError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
}

export interface AgeCalculationBreakdown {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  exactDecimalYears: number;
}

export interface RawCalculationInput {
  productId: string;
  paymentOfficeId?: string | null;
  birthDate: string | Date;
  calculationDate?: string | Date;
  netSalary: number | string | Money;
  otherIncome?: number | string | Money;
  requestedPrincipal: number | string | Money;
  tenorMonths: number;
  method: CalculationMethod | string;
  settlementPayoff?: number | string | Money;
  otherDeductions?: number | string | Money;
}

export interface ValidatedCalculationInput {
  productId: string;
  product: Product;
  bprId: string;
  paymentOfficeId: string | null;
  paymentOffice: PaymentOffice | null;
  birthDate: Date;
  calculationDate: Date;
  ageAtCalculation: AgeCalculationBreakdown;
  netSalary: Money;
  otherIncome: Money;
  totalIncome: Money;
  requestedPrincipal: Money;
  tenor: Tenor;
  method: CalculationMethod;
  settlementPayoff: Money;
  otherDeductions: Money;
  creditParameter: CreditParameter;
  feeParameter: FeeParameter;
  interestRate: InterestRate;
}

export interface CalculationValidationResult {
  isValid: boolean;
  errors: CalculationInputError[];
  data: ValidatedCalculationInput | null;
}

/**
 * Calculates exact calendar age in years, months, and days.
 */
export function calculateAgeBreakdown(
  birthDate: Date,
  calculationDate: Date = new Date()
): AgeCalculationBreakdown {
  let years = calculationDate.getFullYear() - birthDate.getFullYear();
  let months = calculationDate.getMonth() - birthDate.getMonth();
  let days = calculationDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    // Get days in the previous month
    const prevMonth = new Date(
      calculationDate.getFullYear(),
      calculationDate.getMonth(),
      0
    );
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalMonths = years * 12 + months;
  const exactDecimalYears = Number((years + months / 12 + days / 365.25).toFixed(2));

  return {
    years,
    months,
    days,
    totalMonths,
    exactDecimalYears,
  };
}

const rawInputSchema = z.object({
  productId: z
    .string({ required_error: "Product ID wajib diisi" })
    .uuid("Format Product ID tidak valid"),
  paymentOfficeId: z
    .string()
    .uuid("Format Payment Office ID tidak valid")
    .optional()
    .nullable(),
  birthDate: z.union([z.string(), z.date()], {
    required_error: "Tanggal lahir debitur wajib diisi",
  }),
  calculationDate: z.union([z.string(), z.date()]).optional(),
  netSalary: z
    .union([z.number(), z.string(), z.custom<Money>((val) => val instanceof Money)], {
      required_error: "Gaji bersih per bulan wajib diisi",
    })
    .refine((val) => {
      const num = val instanceof Money ? val.toNumber() : Number(val);
      return !isNaN(num) && num > 0;
    }, "Gaji bersih harus berupa angka lebih besar dari 0"),
  otherIncome: z
    .union([z.number(), z.string(), z.custom<Money>((val) => val instanceof Money)])
    .optional()
    .refine((val) => {
      if (val === undefined || val === null) return true;
      const num = val instanceof Money ? val.toNumber() : Number(val);
      return !isNaN(num) && num >= 0;
    }, "Penghasilan tambahan tidak boleh negatif"),
  requestedPrincipal: z
    .union([z.number(), z.string(), z.custom<Money>((val) => val instanceof Money)], {
      required_error: "Plafon pengajuan kredit wajib diisi",
    })
    .refine((val) => {
      const num = val instanceof Money ? val.toNumber() : Number(val);
      return !isNaN(num) && num > 0;
    }, "Plafon pengajuan harus berupa angka lebih besar dari 0"),
  tenorMonths: z
    .number({ required_error: "Tenor bulan wajib diisi" })
    .int("Tenor bulan harus berupa bilangan bulat positif")
    .min(1, "Tenor bulan minimal 1 bulan")
    .max(360, "Tenor bulan maksimal 360 bulan (30 tahun)"),
  method: z.enum(["FLAT", "ANNUITY"], {
    errorMap: () => ({
      message: "Metode perhitungan angsuran harus 'FLAT' atau 'ANNUITY'",
    }),
  }),
  settlementPayoff: z
    .union([z.number(), z.string(), z.custom<Money>((val) => val instanceof Money)])
    .optional()
    .refine((val) => {
      if (val === undefined || val === null) return true;
      const num = val instanceof Money ? val.toNumber() : Number(val);
      return !isNaN(num) && num >= 0;
    }, "Nilai pelunasan (payoff) tidak boleh negatif"),
  otherDeductions: z
    .union([z.number(), z.string(), z.custom<Money>((val) => val instanceof Money)])
    .optional()
    .refine((val) => {
      if (val === undefined || val === null) return true;
      const num = val instanceof Money ? val.toNumber() : Number(val);
      return !isNaN(num) && num >= 0;
    }, "Potongan lainnya tidak boleh negatif"),
});

export class CalculationInputValidator {
  /**
   * Validates calculation input fields and confirms prerequisite master data in DB.
   */
  static async validate(
    input: RawCalculationInput
  ): Promise<CalculationValidationResult> {
    const errors: CalculationInputError[] = [];

    // 1. Schema & Type Validation
    const parsed = rawInputSchema.safeParse(input);
    if (!parsed.success) {
      for (const err of parsed.error.errors) {
        errors.push({
          field: err.path.join("."),
          code: "INVALID_FIELD",
          message: err.message,
        });
      }
      return { isValid: false, errors, data: null };
    }

    const validRaw = parsed.data;

    // 2. Date parsing and boundary checks
    const calcDate = validRaw.calculationDate
      ? typeof validRaw.calculationDate === "string"
        ? new Date(validRaw.calculationDate)
        : validRaw.calculationDate
      : new Date();

    if (isNaN(calcDate.getTime())) {
      errors.push({
        field: "calculationDate",
        code: "INVALID_DATE",
        message: "Format tanggal perhitungan tidak valid.",
      });
    }

    const birthDate =
      typeof validRaw.birthDate === "string"
        ? new Date(validRaw.birthDate)
        : validRaw.birthDate;

    if (isNaN(birthDate.getTime())) {
      errors.push({
        field: "birthDate",
        code: "INVALID_DATE",
        message: "Format tanggal lahir tidak valid.",
      });
      return { isValid: false, errors, data: null };
    }

    if (birthDate >= calcDate) {
      errors.push({
        field: "birthDate",
        code: "FUTURE_BIRTH_DATE",
        message: "Tanggal lahir harus berada di masa lampau sebelum tanggal perhitungan.",
      });
    }

    const ageBreakdown = calculateAgeBreakdown(birthDate, calcDate);

    // Business Rule Check: Debtor minimum age is 18 years
    if (ageBreakdown.years < 18) {
      errors.push({
        field: "birthDate",
        code: "MINIMUM_AGE_VIOLATION",
        message: `Usia debitur (${ageBreakdown.years} tahun) belum memenuhi syarat minimum 18 tahun.`,
        value: ageBreakdown.years,
      });
    }

    // Business Rule Check: Debtor maximum nominal age is strictly before 85 years (e.g. max 84 years 11 months)
    if (ageBreakdown.years >= 85) {
      errors.push({
        field: "birthDate",
        code: "MAXIMUM_AGE_VIOLATION",
        message: `Usia debitur (${ageBreakdown.years} tahun) telah mencapai batas usia maksimum (sebelum 85 tahun).`,
        value: ageBreakdown.years,
      });
    }

    // 3. Database Master Data & Context Verification
    const product = await db.product.findUnique({
      where: { id: validRaw.productId },
      include: {
        creditParameters: {
          where: { isActive: true },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
        feeParameters: {
          where: { isActive: true },
          orderBy: { effectiveFrom: "desc" },
        },
      },
    });

    if (!product || product.status !== "ACTIVE" || product.deletedAt !== null) {
      errors.push({
        field: "productId",
        code: "PRODUCT_NOT_AVAILABLE",
        message: "Produk kredit yang dipilih tidak ditemukan atau tidak aktif.",
      });
      return { isValid: false, errors, data: null };
    }

    const activeCreditParam = product.creditParameters[0];
    if (!activeCreditParam) {
      errors.push({
        field: "productId",
        code: "CREDIT_PARAMETER_MISSING",
        message: `Parameter kredit aktif untuk produk '${product.name}' belum tersedia.`,
      });
    }

    // Determine appropriate Fee Parameter (matching paymentOfficeId if provided, or default)
    let selectedPaymentOffice: PaymentOffice | null = null;
    if (validRaw.paymentOfficeId) {
      selectedPaymentOffice = await db.paymentOffice.findUnique({
        where: { id: validRaw.paymentOfficeId },
      });

      if (!selectedPaymentOffice || selectedPaymentOffice.deletedAt !== null) {
        errors.push({
          field: "paymentOfficeId",
          code: "PAYMENT_OFFICE_NOT_FOUND",
          message: "Kantor bayar yang dipilih tidak ditemukan atau sudah tidak aktif.",
        });
      } else if (selectedPaymentOffice.bprId !== product.bprId) {
        errors.push({
          field: "paymentOfficeId",
          code: "INVALID_RELATIONSHIP",
          message: "Kantor bayar yang dipilih tidak terafiliasi dengan BPR produk kredit ini.",
        });
      }
    }

    // Match FeeParameter: specific to paymentOffice or default (paymentOfficeId: null)
    let activeFeeParam: FeeParameter | undefined;
    if (validRaw.paymentOfficeId) {
      activeFeeParam = product.feeParameters.find(
        (f) => f.paymentOfficeId === validRaw.paymentOfficeId
      );
    }
    if (!activeFeeParam) {
      activeFeeParam = product.feeParameters.find((f) => f.paymentOfficeId === null);
    }

    if (!activeFeeParam) {
      errors.push({
        field: "productId",
        code: "FEE_PARAMETER_MISSING",
        message: `Parameter biaya aktif untuk produk '${product.name}' belum dikonfigurasi.`,
      });
    }

    if (errors.length > 0 || !activeCreditParam || !activeFeeParam) {
      return { isValid: false, errors, data: null };
    }

    // 4. Transform into Clean Domain Objects
    const netSalaryMoney = Money.from(validRaw.netSalary as Money | number | string);
    const otherIncomeMoney = validRaw.otherIncome
      ? Money.from(validRaw.otherIncome as Money | number | string)
      : Money.zero();
    const totalIncomeMoney = netSalaryMoney.add(otherIncomeMoney);

    const requestedPrincipalMoney = Money.from(
      validRaw.requestedPrincipal as Money | number | string
    );

    const tenor = Tenor.fromMonths(validRaw.tenorMonths);
    const method = validRaw.method as CalculationMethod;

    const settlementPayoffMoney = validRaw.settlementPayoff
      ? Money.from(validRaw.settlementPayoff as Money | number | string)
      : Money.zero();

    const otherDeductionsMoney = validRaw.otherDeductions
      ? Money.from(validRaw.otherDeductions as Money | number | string)
      : Money.zero();

    const interestRate = InterestRate.fromAnnualRate(
      activeCreditParam.flatAnnualRate.toString()
    );

    return {
      isValid: true,
      errors: [],
      data: {
        productId: product.id,
        product,
        bprId: product.bprId,
        paymentOfficeId: validRaw.paymentOfficeId || null,
        paymentOffice: selectedPaymentOffice,
        birthDate,
        calculationDate: calcDate,
        ageAtCalculation: ageBreakdown,
        netSalary: netSalaryMoney,
        otherIncome: otherIncomeMoney,
        totalIncome: totalIncomeMoney,
        requestedPrincipal: requestedPrincipalMoney,
        tenor,
        method,
        settlementPayoff: settlementPayoffMoney,
        otherDeductions: otherDeductionsMoney,
        creditParameter: activeCreditParam,
        feeParameter: activeFeeParam,
        interestRate,
      },
    };
  }
}
