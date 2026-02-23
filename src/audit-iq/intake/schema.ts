import { z } from "zod";

export const AuditBriefSchema = z.object({
  company: z.object({
    name: z.string().min(1, "Company name is required"),
    industry: z.string().min(1, "Industry is required"),
    stage: z.enum(["pre-revenue", "early", "growth", "mature"]),
    teamSize: z.number().int().min(1),
    annualRevenue: z.number().nonnegative().optional(),
    foundedYear: z.number().int().min(1800).max(2100).optional(),
  }),

  operations: z.object({
    hasDocumentedProcesses: z.boolean(),
    hasAutomation: z.boolean(),
    avgCycleTimeDays: z.number().nonnegative().optional(),
    primaryBottleneck: z.string().optional(),
  }),

  finance: z.object({
    hasCashFlowVisibility: z.boolean(),
    hasMonthlyClose: z.boolean(),
    burnRateMonths: z.number().nonnegative().optional(),
    revenueGrowthPct: z.number().optional(),
    primaryFinancialRisk: z.string().optional(),
  }),

  marketing: z.object({
    hasIcp: z.boolean(),
    hasRepeatableAcquisition: z.boolean(),
    primaryChannel: z.string().optional(),
    conversionRatePct: z.number().min(0).max(100).optional(),
    brandStrength: z.enum(["none", "emerging", "established"]).optional(),
  }),

  team: z.object({
    hasOrChart: z.boolean(),
    hasSinglePointOfFailure: z.boolean(),
    keyPersonDependency: z.string().optional(),
    cultureRating: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .optional(),
  }),

  systems: z.object({
    hasCrm: z.boolean(),
    hasProjectManagement: z.boolean(),
    hasDataBackup: z.boolean(),
    toolStackHealth: z.enum(["fragmented", "adequate", "optimized"]).optional(),
  }),

  risk: z.object({
    hasContractTemplates: z.boolean(),
    hasInsurance: z.boolean(),
    hasComplianceReview: z.boolean(),
    topExistentialRisk: z.string().optional(),
  }),
});

export type AuditBriefInput = z.input<typeof AuditBriefSchema>;
export type AuditBriefParsed = z.output<typeof AuditBriefSchema>;
