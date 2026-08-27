import { Prisma } from "@prisma/client";

/**
 * Immutable Money Value Object in Indonesian Rupiah (IDR).
 * Uses high precision decimal arithmetic to prevent floating-point inaccuracies.
 */
export class Money {
  private readonly _amount: Prisma.Decimal;

  constructor(amount: Prisma.Decimal | number | string | Money) {
    if (amount instanceof Money) {
      this._amount = amount.amount;
    } else if (amount instanceof Prisma.Decimal) {
      this._amount = amount;
    } else {
      this._amount = new Prisma.Decimal(amount.toString());
    }
  }

  /**
   * Creates a Money instance.
   */
  static from(amount: Money | Prisma.Decimal | number | string): Money {
    if (amount instanceof Money) {
      return amount;
    }
    return new Money(amount);
  }

  /**
   * Returns a zero Money instance (Rp 0).
   */
  static zero(): Money {
    return new Money(0);
  }

  /**
   * Returns internal Decimal amount.
   */
  get amount(): Prisma.Decimal {
    return this._amount;
  }

  /**
   * Returns numerical value rounded to 2 decimal places.
   */
  toNumber(): number {
    return Number(this._amount.toFixed(2));
  }

  /**
   * Returns integer value (rounded).
   */
  toInteger(): number {
    return Math.round(this.toNumber());
  }

  /**
   * Addition: this + other
   */
  add(other: Money | number | string | Prisma.Decimal): Money {
    const o = Money.from(other);
    return new Money(this._amount.plus(o.amount));
  }

  /**
   * Subtraction: this - other
   */
  subtract(other: Money | number | string | Prisma.Decimal): Money {
    const o = Money.from(other);
    return new Money(this._amount.minus(o.amount));
  }

  /**
   * Multiplication: this * multiplier
   */
  multiply(multiplier: number | string | Prisma.Decimal): Money {
    const m = new Prisma.Decimal(multiplier.toString());
    return new Money(this._amount.times(m));
  }

  /**
   * Division: this / divisor
   */
  divide(divisor: number | string | Prisma.Decimal): Money {
    const d = new Prisma.Decimal(divisor.toString());
    if (d.isZero()) {
      throw new Error("Division by zero in Money.divide");
    }
    return new Money(this._amount.dividedBy(d));
  }

  /**
   * Rounds money to the nearest integer or specific decimal places.
   */
  round(decimalPlaces = 0): Money {
    return new Money(this._amount.toDecimalPlaces(decimalPlaces, Prisma.Decimal.ROUND_HALF_UP));
  }

  /**
   * Floor money down to the nearest integer.
   */
  floor(): Money {
    return new Money(this._amount.floor());
  }

  /**
   * Ceiling money up to the nearest integer.
   */
  ceil(): Money {
    return new Money(this._amount.ceil());
  }

  /**
   * Floors money to a specific increment (e.g. Rp 100.000 for principal rounding).
   * Formula: FLOOR(amount / increment) * increment
   */
  floorTo(increment: Money | number | string): Money {
    const inc = Money.from(increment);
    if (inc.isZero()) return this;
    const units = this._amount.dividedBy(inc.amount).floor();
    return new Money(units.times(inc.amount));
  }

  /**
   * Ceils money to a specific increment.
   */
  ceilTo(increment: Money | number | string): Money {
    const inc = Money.from(increment);
    if (inc.isZero()) return this;
    const units = this._amount.dividedBy(inc.amount).ceil();
    return new Money(units.times(inc.amount));
  }

  /**
   * Standard round to a specific increment.
   */
  roundTo(increment: Money | number | string): Money {
    const inc = Money.from(increment);
    if (inc.isZero()) return this;
    const units = this._amount.dividedBy(inc.amount).round();
    return new Money(units.times(inc.amount));
  }

  /**
   * Compares equality with another Money instance.
   */
  equals(other: Money | number | string | Prisma.Decimal): boolean {
    const o = Money.from(other);
    return this._amount.equals(o.amount);
  }

  /**
   * Greater than: this > other
   */
  greaterThan(other: Money | number | string | Prisma.Decimal): boolean {
    const o = Money.from(other);
    return this._amount.greaterThan(o.amount);
  }

  /**
   * Greater than or equal: this >= other
   */
  greaterThanOrEqual(other: Money | number | string | Prisma.Decimal): boolean {
    const o = Money.from(other);
    return this._amount.greaterThanOrEqualTo(o.amount);
  }

  /**
   * Less than: this < other
   */
  lessThan(other: Money | number | string | Prisma.Decimal): boolean {
    const o = Money.from(other);
    return this._amount.lessThan(o.amount);
  }

  /**
   * Less than or equal: this <= other
   */
  lessThanOrEqual(other: Money | number | string | Prisma.Decimal): boolean {
    const o = Money.from(other);
    return this._amount.lessThanOrEqualTo(o.amount);
  }

  isZero(): boolean {
    return this._amount.isZero();
  }

  isPositive(): boolean {
    return this._amount.isPositive() && !this._amount.isZero();
  }

  isNegative(): boolean {
    return this._amount.isNegative();
  }

  /**
   * Formats money as Indonesian Rupiah string (e.g. "Rp 200.000.000").
   */
  format(options: { withSymbol?: boolean; fractionDigits?: number } = {}): string {
    const withSymbol = options.withSymbol ?? true;
    const fractionDigits = options.fractionDigits ?? 0;

    const num = this.toNumber();
    const formattedNum = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(num);

    return withSymbol ? `Rp ${formattedNum}` : formattedNum;
  }

  toString(): string {
    return this._amount.toString();
  }

  toJSON(): number {
    return this.toNumber();
  }
}
