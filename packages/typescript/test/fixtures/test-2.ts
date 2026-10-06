/**
 * Player in the room
 */
export interface Player {
  /**
   * The name of player
   *
   * @see https://github.com/kitretsusaisama/decent-docs
   * @defaultValue Henry
   */
  name: string;

  /**
   * @example
   * ```js
   * console.log("Hello World")
   * ```
   * @remarks `timestamp`
   * Returned by API
   */
  age: number;

  /**
   * @internal
   */
  privateValue: string;
}
