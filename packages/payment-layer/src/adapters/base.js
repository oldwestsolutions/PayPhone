/**
 * @typedef {Object} ExecutionAdapter
 * @property {string} name
 * @property {(payment: import('../types.js').Payment) => boolean} supports
 * @property {(payment: import('../types.js').Payment) => Promise<{ valid: boolean, error?: string }>} validate
 * @property {(payment: import('../types.js').Payment, ctx: object) => Promise<object>} estimate
 * @property {(payment: import('../types.js').Payment, ctx: object) => Promise<object>} execute
 */

export function createAdapter(name, { supports, validate, estimate, execute }) {
  return { name, supports, validate, estimate, execute };
}
