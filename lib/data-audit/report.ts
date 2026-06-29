import type { AuditIssue, AuditReport, AuditSeverity } from "@/lib/data-audit/types";

const severityOrder: Record<AuditSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function countIssuesBySeverity(issues: AuditIssue[]) {
  return issues.reduce(
    (counts, issue) => {
      counts[issue.severity] += 1;
      return counts;
    },
    { critical: 0, warning: 0, info: 0 },
  );
}

export function hasCriticalIssues(issues: AuditIssue[]): boolean {
  return issues.some((issue) => issue.severity === "critical");
}

export function sortAuditIssues(issues: AuditIssue[]): AuditIssue[] {
  return [...issues].sort((left, right) => {
    const severityDiff = severityOrder[left.severity] - severityOrder[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.message.localeCompare(right.message, "bg");
  });
}

export function formatIssueLine(issue: AuditIssue): string {
  return `[${issue.severity}] ${issue.message}`;
}

export function formatAuditReport(report: AuditReport): string {
  const counts = countIssuesBySeverity(report.issues);
  const lines: string[] = [];
  const result = hasCriticalIssues(report.issues) ? "FAIL" : "PASS";

  lines.push(`Data audit: ${result}`);
  lines.push(`Critical issues: ${counts.critical}`);
  lines.push(`Warnings: ${counts.warning}`);
  lines.push(`Info: ${counts.info}`);

  const statEntries = Object.entries(report.stats).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  if (statEntries.length > 0) {
    lines.push("");
    lines.push("Counts:");
    for (const [key, value] of statEntries) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  const sortedIssues = sortAuditIssues(report.issues);
  if (sortedIssues.length > 0) {
    lines.push("");
    lines.push("Issues:");
    for (const issue of sortedIssues) {
      lines.push(formatIssueLine(issue));
    }
  }

  return lines.join("\n");
}
