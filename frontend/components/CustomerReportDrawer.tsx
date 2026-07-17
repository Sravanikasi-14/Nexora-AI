"use client";

import * as React from "react";
import { X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface MarketingCampaign {
  name: string;
  target: string;
  channel: string;
  message: string;
}

interface SuggestedAutomation {
  type: string;
  trigger: string;
  template: string;
}

interface CustomerReport {
  executiveSummary: string;
  customerHealthScore: number;
  revenueAnalysis: string;
  salesTrends: string;
  customerSegmentsInfo: string;
  productPerformanceInfo: string;
  highValueCustomers: { name: string; email: string | null; phone: string | null; ltv: number }[];
  churnRiskInfo: string;
  growthOpportunities: string;
  recommendedMarketingCampaigns: MarketingCampaign[];
  aiRecommendations: string[];
  suggestedAutomations: SuggestedAutomation[];
}

interface CustomerReportDrawerProps {
  onClose: () => void;
  report: CustomerReport;
}

export default function CustomerReportDrawer({ onClose, report }: CustomerReportDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-screen border-l border-zinc-200 dark:border-zinc-800 p-6 overflow-y-auto flex flex-col justify-between relative shadow-premium bg-white dark:bg-zinc-950">
        <button
          className="absolute top-6 right-6 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
          onClick={onClose}
          title="Close Report"
        >
          <X size={18} />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">AI Customer Intelligence Report</Badge>
          </div>
          <h2 className="font-display text-xl font-semibold mb-6">Customer Intelligence Report</h2>

          {/* Executive Summary */}
          <Card className="mb-6 p-4 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider">Executive Summary</h4>
              <Badge variant="success" className="text-[10px]">Health Score: {report.customerHealthScore}/100</Badge>
            </div>
            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">{report.executiveSummary}</p>
            <div className="mt-2.5 text-[10px] text-zinc-400 dark:text-zinc-500 italic">
              Explanation: Reflects retention rates, active database sizes, and VIP cohorts stability.
            </div>
          </Card>

          {/* Data Insights */}
          <div className="space-y-4 mb-6">
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1">Revenue & Cohort Analysis</h4>
              <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-normal">{report.revenueAnalysis}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1">Customer Segmentation Narrative</h4>
              <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-normal">{report.customerSegmentsInfo}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1">Product Demand Performance</h4>
              <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-normal">{report.productPerformanceInfo}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider mb-1">Churn Risks Analysis</h4>
              <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-normal">{report.churnRiskInfo}</p>
            </div>
          </div>

          {/* VIP / High Value List */}
          <div className="mb-6">
            <h4 className="text-[10px] font-semibold text-accent2 uppercase tracking-wider mb-2">Top Value Customer Cohort</h4>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/20">
                    <TableHead className="py-2.5">Customer</TableHead>
                    <TableHead className="py-2.5">Contact</TableHead>
                    <TableHead className="py-2.5 text-right">LTV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.highValueCustomers?.map((cust, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-2.5 font-medium">{cust.name}</TableCell>
                      <TableCell className="py-2.5 text-zinc-400 dark:text-zinc-500">{cust.email || cust.phone || "—"}</TableCell>
                      <TableCell className="py-2.5 font-semibold text-right">₹{cust.ltv.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Marketing Campaigns */}
          <div className="mb-6">
            <h4 className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2.5">Recommended Marketing Campaigns</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {report.recommendedMarketingCampaigns?.map((camp, i) => (
                <Card key={i} className="p-3.5 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs flex flex-col gap-1 hover:border-zinc-300 dark:hover:border-zinc-700">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{camp.name}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-550">
                    <span className="font-semibold text-accent">Target:</span> {camp.target} | <span className="font-semibold text-accent2">Channel:</span> {camp.channel}
                  </p>
                  <p className="text-[11px] text-zinc-650 dark:text-zinc-350 italic mt-1 bg-white dark:bg-zinc-950 p-2 rounded-md border border-zinc-200 dark:border-zinc-800">
                    &quot;{camp.message}&quot;
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="mb-6">
            <h4 className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-2">Strategic Recommendations</h4>
            <ul className="flex flex-col gap-2 text-xs">
              {report.aiRecommendations?.map((rec, i) => (
                <li key={i} className="flex gap-2 text-zinc-550 dark:text-zinc-400 leading-normal">
                  <span className="text-accent">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Suggested Automations */}
          <div className="mb-6">
            <h4 className="text-[10px] font-semibold text-accent2 uppercase tracking-wider mb-2">Suggested Automations</h4>
            <div className="flex flex-col gap-2">
              {report.suggestedAutomations?.map((aut, i) => (
                <Card key={i} className="p-3 bg-zinc-50/50 dark:bg-zinc-900/10 text-xs flex flex-col gap-1 hover:border-zinc-300 dark:hover:border-zinc-700">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-accent2">{aut.type}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Trigger: {aut.trigger}</span>
                  </div>
                  <p className="text-[11px] text-zinc-650 dark:text-zinc-350 italic mt-1 bg-white dark:bg-zinc-950 p-2 rounded-md border border-zinc-200 dark:border-zinc-800">
                    Template: &quot;{aut.template}&quot;
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-8 flex justify-end">
          <Button onClick={onClose}>
            Close Report
          </Button>
        </div>
      </div>
    </div>
  );
}
