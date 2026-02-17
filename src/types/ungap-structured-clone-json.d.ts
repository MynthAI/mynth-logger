declare module "@ungap/structured-clone/json" {
  export function stringify(
    value: unknown,
    replacer?:
      | ((this: unknown, key: string, value: unknown) => unknown)
      | (number | string)[]
      | null,
    space?: string | number,
  ): string;
}
