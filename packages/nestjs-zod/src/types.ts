export interface UnknownSchema {
    parse(input: unknown, options?: { reportInput?: boolean }): unknown;
    encode?(input: unknown, options?: { reportInput?: boolean }): unknown;
    array?: () => UnknownSchema;
}

/**
 * RequiredBy
 * @desc From `T` make a set of properties by key `K` become required
 * @example
 *    type Props = {
 *      name?: string;
 *      age?: number;
 *      visible?: boolean;
 *    };
 *
 *    // Expect: { name: string; age: number; visible: boolean; }
 *    type Props = RequiredBy<Props>;
 *
 *    // Expect: { name?: string; age: number; visible: boolean; }
 *    type Props = RequiredBy<Props, 'age' | 'visible'>;
 */
export type RequiredBy<
  T extends object,
  K extends keyof T = keyof T
> = Omit<T, K> & Required<Pick<T, K>>;
