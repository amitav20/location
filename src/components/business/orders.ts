/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Short, human-readable order number from ids like "ord_<uuid>" or legacy "ord_<timestamp>_<n>"
export function formatOrderNumber(id: string) {
  return '#' + id.replace(/^ord_/, '').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
}
