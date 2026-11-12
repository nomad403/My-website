/** Epoch milliseconds in D1; Date at the existing domain boundary. No date strings or local timezone. */
export function milliseconds(value: Date): number {
 const n = value.getTime()
 if (!Number.isSafeInteger(n)) throw new Error("Invalid database date")
 return n
}
export function date(value: number): Date {
 if (!Number.isSafeInteger(value)) throw new Error("Invalid database date")
 const result = new Date(value)
 if (Number.isNaN(result.getTime())) throw new Error("Invalid database date")
 return result
}
export function nullableDate(value: number | null): Date | null {
 return value === null ? null : date(value)
}
/** PostgreSQL UUID values are canonical lowercase. Preserve that boundary for text storage. */
export function uuid(value: string): string {
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid database identifier")
 return value.toLowerCase()
}
