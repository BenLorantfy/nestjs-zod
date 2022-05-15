/*
 * It's sad, but TS can't merge "z" exports properly - it becomes "any"
 * For that reason, we have a manually-created declaration file with working re-exports
 */
export * from './dist/z-only-override'
export * as z from './dist/z-only-override'
