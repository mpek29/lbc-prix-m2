/**
 * The vocabulary of the domain.
 *
 * These are branded-by-convention aliases rather than nominal types: the goal
 * is to make signatures self-documenting, not to fight the compiler. Every
 * value of these types is guaranteed finite and strictly positive, parsers are
 * responsible for rejecting anything else before it reaches this layer.
 */

/** An amount of money, in euros. */
export type Euros = number;

/** A floor area, in square metres. */
export type SquareMetres = number;

/** A price per unit of area, in euros per square metre. */
export type EurosPerSquareMetre = number;

/** The two facts we need from a classified ad, and nothing more. */
export interface Listing {
  /** The site's own identifier, when we can read it. Diagnostics only. */
  readonly id: string | null;
  readonly price: Euros;
  readonly area: SquareMetres;
}
