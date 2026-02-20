import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const CONTENT = {
  payments: {
    title: "Payments & Transactions",
    points: [
      "All transactions view",
      "Gateway performance signals",
      "Settlement and refund monitoring",
      "Dispute and chargeback visibility",
    ],
  },
  billing: {
    title: "Billing & Subscriptions",
    points: [
      "Plan and pricing controls",
      "Merchant subscription visibility",
      "Trial and failed billing monitoring",
      "Usage and monetization metrics",
    ],
  },
  plugins: {
    title: "Plugin / App Marketplace",
    points: [
      "Plugin approval and suspension workflow",
      "Permission scopes and vendor governance",
      "Plugin usage and failure monitoring",
      "Emergency kill-switch controls",
    ],
  },
  api: {
    title: "API & Integrations",
    points: [
      "API routes and version governance",
      "Rate limiting policy controls",
      "Credential revocation and rotation",
      "Webhook and abuse monitoring",
    ],
  },
  risk: {
    title: "Risk / Fraud Monitoring",
    points: [
      "Fraud and anomaly signals",
      "Suspicious merchant tracking",
      "High-risk transaction visibility",
      "Refund abuse and velocity checks",
    ],
  },
  config: {
    title: "Platform Configuration",
    points: [
      "Global feature flags and policies",
      "Gateway and tax defaults",
      "Provider settings",
      "System-wide limits and quotas",
    ],
  },
  reports: {
    title: "Reporting & Intelligence",
    points: [
      "Revenue and merchant growth analytics",
      "Payment and refund performance",
      "Plugin ecosystem metrics",
      "Security and API traffic reporting",
    ],
  },
};

export default function PlatformModule({ moduleKey = "reports" }) {
  const module = CONTENT[moduleKey] || CONTENT.reports;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{module.title}</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Platform-owner control surface. Store-level daily operations are intentionally excluded.
        </p>
      </div>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {module.points.map((point) => (
            <p key={point}>- {point}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
