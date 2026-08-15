import {
  FinancialIncidentSeverity,
  FinancialIncidentStatus,
} from "@prisma/client";
import { AlertTriangle, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FinancialIncident } from "@prisma/client";

const SEVERITY_VARIANT: Record<
  FinancialIncidentSeverity,
  "destructive" | "default" | "secondary" | "outline"
> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "default",
  LOW: "secondary",
};

const STATUS_LABEL: Record<FinancialIncidentStatus, string> = {
  OPEN: "Открыт",
  INVESTIGATING: "Расследование",
  RESOLVED: "Исправлен",
  IGNORED: "Игнорирован",
};

function formatDate(iso: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function AdminFinancialIncidentsPanel(props: {
  incidents: FinancialIncident[];
  counts: Record<string, number>;
}) {
  const { incidents, counts } = props;
  const openCritical = counts.CRITICAL ?? 0;
  const openHigh = counts.HIGH ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((severity) => (
          <Card key={severity}>
            <CardHeader className="pb-2">
              <CardDescription>{severity}</CardDescription>
              <CardTitle className="font-heading text-2xl">
                {counts[severity] ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              открытых / в расследовании
            </CardContent>
          </Card>
        ))}
      </div>

      {(openCritical > 0 || openHigh > 0) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <ShieldAlert className="size-5 text-destructive" />
            <div>
              <CardTitle className="font-heading text-base">
                Требуется немедленное внимание
              </CardTitle>
              <CardDescription>
                {openCritical} CRITICAL, {openHigh} HIGH — выплаты и checkout
                приостановить до устранения.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <AlertTriangle className="size-5" />
            Financial Incident Center
          </CardTitle>
          <CardDescription>
            Что произошло, почему, что затронуто, что делать, статус исправления.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Активных инцидентов нет. Reconciliation engine работает штатно.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Affected</TableHead>
                  <TableHead>Remediation</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell>
                      <Badge variant={SEVERITY_VARIANT[incident.severity]}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{STATUS_LABEL[incident.status]}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{incident.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {incident.description}
                      </div>
                      {incident.cause ? (
                        <div className="mt-1 text-xs">
                          <span className="text-muted-foreground">Причина: </span>
                          {incident.cause}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[180px] text-xs">
                      {incident.affectedSummary ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs">
                      {incident.remediation ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(incident.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
