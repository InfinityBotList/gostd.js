export type int64 = number;
export type uint64 = number;
export type int32 = number;
export type uint32 = number;
export type int16 = number;
export type uint16 = number;
export type int8 = number;
export type uint8 = number;
export type byte = number;
export type int = int64;
export const nil = null;
export type error = Error | null;

export function int64ToNumber(i: int64): number {
    return Number(i);
}

export function uint64ToNumber(i: uint64): number {
    return Number(i);
}

export function numberToInt64(n: number): int64 {
    return Number(n);
}

export function numberToUint64(n: number): uint64 {
    return Number(n);
}

// Basic go builtins
export const min = Math.min;
export const max = Math.max;

// Base runtime errors
export enum RuntimeErrors {
    NotImplemented = "runtime: not implemented",
}