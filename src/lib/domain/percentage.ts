import { Prisma } from "@prisma/client";
import { Money } from "./money";

/**
 * Immutable Percentage Value Object.
 * Represents fractional/decimal values (e.g. 0.108 for 10.8%, 0.90 for 90%).
 */
export class Percentage {
  private readonly _decimal: Prisma.Decimal;

  private constructor(decimal: Prisma.Decimal | number | string) {
    if (decimal instanceof Prisma.Decimal) {
      this._decimal = decimal;
    } else {
      this._decimal = new Prisma.Decimal(decimal.toString());
    }
  }

  /**
   * Creates a Percentage from decimal fraction (e.g. 0.108 for 10.8%).
   */
  static fromDecimal(decimal: Percentage | Prisma.Decimal | number | string): Percentage {
    if (decimal instanceof Percentage) {
      return decimal;
    }
    return new Percentage(decimal);
  }

  /**
   * Creates a Percentage from percent number (e.g. 10.8 for 10.8%).
   */
  static fromPercent(percent: number | string | Prisma.Decimal): Percentage {
    const p = new Prisma.Decimal(percent.toString());
    return new Percentage(p.dividedBy(100));
  }

  /**
   * Creates a Percentage from basis points (e.g. 1080 bps for 10.8%).
   */
  static fromBasisPoints(bps: number): Percentage {
    return new Percentage(new Prisma.Decimal(bps).dividedBy(10000));
  }

  /**
   * Returns a zero Percentage instance (0%).
   */
  static zero(): Percentage {
    return new Percentage(0);
  }

  /**
   * Returns internal Decimal value (e.g. 0.108).
   */
  get decimal(): Prisma.Decimal {
    return this._decimal;
  }

  /**
   * Returns decimal as JavaScript number.
   */
  toDecimal(): number {
    return Number(this._decimal.toString());
  }

  /**
   * Returns percent value (e.g. 10.8 for 0.108).
   */
  toPercent(): number {
    return Number(this._decimal.times(100).toString());
  }

  /**
   * Returns basis points (e.g. 1080 for 0.108).
   */
  toBasisPoints(): number {
    return Math.round(Number(this._decimal.times(10000).toString()));
  }

  /**
   * Applies this percentage to a Money amount: Money * percentage.
   */
  applyTo(money: Money | number | string | Prisma.Decimal): Money {
    const m = Money.from(money);
    return m.multiply(this._decimal);
  }

  /**
   * Addition: this + other
   */
  add(other: Percentage | number | string | Prisma.Decimal): Percentage {
    const o = Percentage.fromDecimal(other);
    return new Percentage(this._decimal.plus(o.decimal));
  }

  /**
   * Subtraction: this - other
   */
  subtract(other: Percentage | number | string | Prisma.Decimal): Percentage {
    const o = Percentage.fromDecimal(other);
    return new Percentage(this._decimal.minus(o.decimal));
  }

  /**
   * Multiplication: this * factor
   */
  multiply(factor: number | string | Prisma.Decimal): Percentage {
    const f = new Prisma.Decimal(factor.toString());
    return new Percentage(this._decimal.times(f));
  }

  /**
   * Division: this / divisor
   */
  divide(divisor: number | string | Prisma.Decimal): Percentage {
    const d = new Prisma.Decimal(divisor.toString());
    if (d.isZero()) {
      throw new Error("Division by zero in Percentage.divide");
    }
    return new Percentage(this._decimal.dividedBy(d));
  }

  equals(other: Percentage | number | string | Prisma.Decimal): boolean {
    const o = Percentage.fromDecimal(other);
    return this._decimal.equals(o.decimal);
  }

  greaterThan(other: Percentage | number | string | Prisma.Decimal): boolean {
    const o = Percentage.fromDecimal(other);
    return this._decimal.greaterThan(o.decimal);
  }

  greaterThanOrEqual(other: Percentage | number | string | Prisma.Decimal): boolean {
    const o = Percentage.fromDecimal(other);
    return this._decimal.greaterThanOrEqualTo(o.decimal);
  }

  lessThan(other: Percentage | number | string | Prisma.Decimal): boolean {
    const o = Percentage.fromDecimal(other);
    return this._decimal.lessThan(o.decimal);
  }

  lessThanOrEqual(other: Percentage | number | string | Prisma.Decimal): boolean {
    const o = Percentage.fromDecimal(other);
    return this._decimal.lessThanOrEqualTo(o.decimal);
  }

  isZero(): boolean {
    return this._decimal.isZero();
  }

  isPositive(): boolean {
    return this._decimal.isPositive() && !this._decimal.isZero();
  }

  /**
   * Formats percentage string (e.g. "10,80%" or "10.8%").
   */
  format(fractionDigits = 2): string {
    const pct = this.toPercent();
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(pct);
    return `${formatted}%`;
  }

  toString(): string {
    return this._decimal.toString();
  }

  toJSON(): number {
    return this.toDecimal();
  }
}
