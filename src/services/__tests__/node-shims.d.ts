/**
 * Minimal compile-time type shims for Node's BUILT-IN test modules.
 * At runtime the real `node:test` / `node:assert` modules are used, so this
 * file only exists to keep the offline `tsc` type-check green without
 * installing `@types/node`.
 */

declare module "node:test" {
  export type TestFn = (t?: unknown) => void | Promise<void>;
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: TestFn): void;
  export function test(name: string, fn: TestFn): void;
  export function before(fn: TestFn): void;
  export function after(fn: TestFn): void;
  export function beforeEach(fn: TestFn): void;
  export function afterEach(fn: TestFn): void;
}

declare module "node:assert" {
  export function equal(actual: unknown, expected: unknown, message?: string): void;
  export function notEqual(actual: unknown, expected: unknown, message?: string): void;
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function ok(value: unknown, message?: string): asserts value;
  export function fail(message?: string): never;
  export function throws(fn: () => unknown, expected?: unknown, message?: string): void;
  export function doesNotThrow(fn: () => unknown, message?: string): void;
  export const strict: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    fail(message?: string): never;
    throws(fn: () => unknown, expected?: unknown, message?: string): void;
    doesNotThrow(fn: () => unknown, message?: string): void;
  };
}

declare module "node:assert/strict" {
  export function equal(actual: unknown, expected: unknown, message?: string): void;
  export function notEqual(actual: unknown, expected: unknown, message?: string): void;
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function ok(value: unknown, message?: string): asserts value;
  export function fail(message?: string): never;
  export function throws(fn: () => unknown, expected?: unknown, message?: string): void;
  export function doesNotThrow(fn: () => unknown, message?: string): void;
  const fallback: {
    equal(actual: unknown, expected: unknown, message?: string): void;
  };
  export default fallback;
}
