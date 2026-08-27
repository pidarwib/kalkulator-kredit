/**
 * Immutable Tenor Value Object for loan duration.
 * Manages loan months, decimal years, and insurance lookup tenor years (ceiling rule).
 */
export class Tenor {
  private readonly _months: number;

  private constructor(months: number) {
    if (!Number.isInteger(months) || months < 0) {
      throw new Error(`Invalid tenor months: ${months}. Tenor must be a non-negative integer.`);
    }
    this._months = months;
  }

  /**
   * Creates a Tenor from months.
   */
  static fromMonths(months: number | Tenor): Tenor {
    if (months instanceof Tenor) {
      return months;
    }
    return new Tenor(months);
  }

  /**
   * Creates a Tenor from years.
   */
  static fromYears(years: number): Tenor {
    return new Tenor(Math.round(years * 12));
  }

  /**
   * Returns a zero tenor (0 months).
   */
  static zero(): Tenor {
    return new Tenor(0);
  }

  get months(): number {
    return this._months;
  }

  /**
   * Exact years as a decimal (e.g. 18 months -> 1.5 years).
   */
  get years(): number {
    return Number((this._months / 12).toFixed(2));
  }

  /**
   * Insurance lookup tenor in years per BUSINESS_RULES.md Section 23.1:
   * Tenor Tahun Asuransi = CEILING(Tenor Bulan / 12)
   * Examples:
   * 12 months -> 1 year
   * 24 months -> 2 years
   * 25 months -> 3 years
   * 60 months -> 5 years
   * 120 months -> 10 years
   */
  get insuranceTenorYears(): number {
    if (this._months === 0) return 0;
    return Math.ceil(this._months / 12);
  }

  addMonths(additionalMonths: number | Tenor): Tenor {
    const m = additionalMonths instanceof Tenor ? additionalMonths.months : additionalMonths;
    return new Tenor(this._months + m);
  }

  subtractMonths(deductMonths: number | Tenor): Tenor {
    const m = deductMonths instanceof Tenor ? deductMonths.months : deductMonths;
    const result = this._months - m;
    if (result < 0) {
      throw new Error("Resulting tenor cannot be negative.");
    }
    return new Tenor(result);
  }

  equals(other: Tenor | number): boolean {
    const m = other instanceof Tenor ? other.months : other;
    return this._months === m;
  }

  greaterThan(other: Tenor | number): boolean {
    const m = other instanceof Tenor ? other.months : other;
    return this._months > m;
  }

  greaterThanOrEqual(other: Tenor | number): boolean {
    const m = other instanceof Tenor ? other.months : other;
    return this._months >= m;
  }

  lessThan(other: Tenor | number): boolean {
    const m = other instanceof Tenor ? other.months : other;
    return this._months < m;
  }

  lessThanOrEqual(other: Tenor | number): boolean {
    const m = other instanceof Tenor ? other.months : other;
    return this._months <= m;
  }

  isZero(): boolean {
    return this._months === 0;
  }

  /**
   * Formats tenor description (e.g. "120 Bulan (10 Tahun)").
   */
  format(): string {
    const y = this._months / 12;
    if (Number.isInteger(y)) {
      return `${this._months} Bulan (${y} Tahun)`;
    }
    return `${this._months} Bulan (${y.toFixed(1)} Tahun)`;
  }

  toString(): string {
    return `${this._months} months`;
  }

  toJSON(): number {
    return this._months;
  }
}
