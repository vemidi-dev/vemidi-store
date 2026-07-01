import assert from "node:assert/strict";
import test from "node:test";

import { findDuplicateSlugs, runDataAuditChecks } from "@/lib/data-audit/checks";
import {
  countIssuesBySeverity,
  formatAuditReport,
  formatIssueLine,
  hasCriticalIssues,
} from "@/lib/data-audit/report";
import type { AuditDataset } from "@/lib/data-audit/types";

function emptyDataset(overrides: Partial<AuditDataset> = {}): AuditDataset {
  return {
    products: [],
    productCategories: [],
    productImages: [],
    personalizationFields: [],
    productWishTemplates: [],
    wishTemplates: [],
    categories: [],
    categoryRelatedCategories: [],
    productFaqGroups: null,
    productFaqItems: null,
    faqGroups: null,
    faqItems: null,
    ...overrides,
  };
}

test("formatAuditReport returns PASS when there are no critical issues", () => {
  const output = formatAuditReport({
    issues: [
      {
        severity: "warning",
        code: "sample_warning",
        message: "sample warning",
      },
    ],
    stats: { products: 1 },
  });

  assert.match(output, /^Data audit: PASS/);
  assert.match(output, /Critical issues: 0/);
  assert.match(output, /Warnings: 1/);
  assert.match(output, /\[warning\] sample warning/);
});

test("formatAuditReport returns FAIL when critical issues exist", () => {
  const output = formatAuditReport({
    issues: [
      {
        severity: "critical",
        code: "published_without_slug",
        message: 'product gift-box published without slug',
      },
    ],
    stats: {},
  });

  assert.match(output, /^Data audit: FAIL/);
  assert.match(output, /Critical issues: 1/);
});

test("formatIssueLine prefixes severity", () => {
  assert.equal(
    formatIssueLine({
      severity: "critical",
      code: "duplicate_slug",
      message: 'product duplicate slug "gift" (2 records)',
    }),
    '[critical] product duplicate slug "gift" (2 records)',
  );
});

test("hasCriticalIssues and countIssuesBySeverity classify severities", () => {
  const issues = [
    { severity: "critical" as const, code: "a", message: "a" },
    { severity: "warning" as const, code: "b", message: "b" },
    { severity: "info" as const, code: "c", message: "c" },
  ];

  assert.equal(hasCriticalIssues(issues), true);
  assert.deepEqual(countIssuesBySeverity(issues), {
    critical: 1,
    warning: 1,
    info: 1,
  });
});

test("findDuplicateSlugs reports duplicate product slugs", () => {
  const issues = findDuplicateSlugs(
    [
      { id: "p1", slug: "gift-box" },
      { id: "p2", slug: "Gift-Box" },
    ],
    "product",
  );

  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.severity, "critical");
  assert.match(issues[0]?.message ?? "", /duplicate slug "gift-box"/);
});

test("runDataAuditChecks flags published products missing categories and wish links", () => {
  const report = runDataAuditChecks(
    emptyDataset({
      products: [
        {
          id: "p1",
          slug: "gift-box",
          name: "Gift box",
          subtitle: "",
          status: "published",
          primary_category_id: null,
          image_url: null,
        },
      ],
      personalizationFields: [
        {
          product_id: "p1",
          allows_wish_templates: true,
        },
      ],
      productWishTemplates: [],
    }),
  );

  assert.equal(hasCriticalIssues(report.issues), true);
  assert.ok(
    report.issues.some((issue) => issue.code === "published_without_category"),
  );
  assert.ok(
    report.issues.some((issue) => issue.code === "published_without_primary_category"),
  );
  assert.ok(
    report.issues.some(
      (issue) => issue.code === "product_wishes_enabled_without_assignments",
    ),
  );
  assert.ok(
    report.issues.some((issue) => issue.code === "published_without_subtitle"),
  );
});
