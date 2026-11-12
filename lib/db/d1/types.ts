/** Minimal structural subset of the official Workers D1 binding API. No REST credentials. */
export type D1Value = string | number | null
export type D1Result<T = Record<string, unknown>> = { results: T[]; success: boolean; meta: { changes: number } }
export interface D1Statement {
 bind(...values: D1Value[]): D1Statement
 first<T = Record<string, unknown>>(): Promise<T | null>
 all<T = Record<string, unknown>>(): Promise<D1Result<T>>
 run<T = Record<string, unknown>>(): Promise<D1Result<T>>
}
export interface D1Connection {
 prepare(query: string): D1Statement
 batch<T = Record<string, unknown>>(statements: D1Statement[]): Promise<D1Result<T>[]>
}
/** Use one primary-first session per request if read replication is enabled. Never cache globally. */
export interface D1Binding extends D1Connection {
 withSession(constraint: "first-primary"): D1Connection
}
