/**
 * Format axe-core violations for readable test output.
 *
 * Usage: import and use in test assertions to get detailed failure messages
 * instead of the raw violation array.
 *
 * Example:
 *   expect(
 *     results.violations,
 *     `Accessibility violations found:\n\n${formatViolations(results.violations)}`
 *   ).toEqual([]);
 */

interface AxeNode {
  html: string;
  failureSummary?: string;
}

interface AxeViolation {
  id: string;
  impact?: string | null;
  description: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export function formatViolations(violations: AxeViolation[]): string {
  if (violations.length === 0) return 'No violations found.';

  return violations
    .map((v) => {
      const nodeDetails = v.nodes
        .map(
          (n) =>
            `    - ${n.html}\n      ${n.failureSummary ?? 'No summary available'}`
        )
        .join('\n');
      return `[${v.impact ?? 'unknown'}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n  Nodes:\n${nodeDetails}`;
    })
    .join('\n\n');
}
