import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ResetReportPanelProps {
  report: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ReportBody: React.FC<{ report: any }> = ({ report }) => {
  if (!report) return null;
  const tables = report.tables || [];
  const trade = tables.filter((t: any) => t.kind === 'trade');
  const learning = tables.filter((t: any) => t.kind === 'learning');
  const totalDeleted = tables.reduce((s: number, t: any) => s + (t.deleted || 0), 0);
  const errors = report.errors || {};
  const errorCount = Object.keys(errors).length;

  const Row = ({ t }: { t: any }) => (
    <div className="flex items-center justify-between text-xs font-mono py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{t.table}</span>
      <span>
        <span className="text-muted-foreground">{t.before}</span>
        <span className="mx-2">→</span>
        <span className="text-emerald-500">−{t.deleted}</span>
      </span>
    </div>
  );

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        {errorCount === 0 ? (
          <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Success</Badge>
        ) : (
          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {errorCount} errors</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {new Date(report.timestamp).toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border p-2">
          <div className="text-[10px] text-muted-foreground uppercase">Balance</div>
          <div className="font-mono">
            ${report.account_before?.balance?.toFixed?.(2) ?? '?'} → <span className="text-primary">${report.account_after?.balance?.toFixed?.(2) ?? '?'}</span>
          </div>
        </div>
        <div className="rounded border p-2">
          <div className="text-[10px] text-muted-foreground uppercase">Rows deleted</div>
          <div className="font-mono text-emerald-500">{totalDeleted}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold mb-1">Trade tables</div>
        <div className="rounded border p-2">{trade.map((t: any) => <Row key={t.table} t={t} />)}</div>
      </div>

      <div>
        <div className="text-xs font-semibold mb-1">Learning state</div>
        <div className="rounded border p-2">{learning.map((t: any) => <Row key={t.table} t={t} />)}</div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        Preserved as audit trail: {(report.preserved_tables || []).join(', ')}
      </div>

      {errorCount > 0 && (
        <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs">
          <div className="font-semibold text-destructive mb-1">Errors</div>
          {Object.entries(errors).map(([k, v]) => (
            <div key={k} className="font-mono"><span className="text-destructive">{k}:</span> {String(v)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ResetReportPanel: React.FC<ResetReportPanelProps> = ({ report, open, onOpenChange }) => {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reset complete</DialogTitle>
            <DialogDescription>Per-table deletion report</DialogDescription>
          </DialogHeader>
          <ReportBody report={report} />
        </DialogContent>
      </Dialog>

      {report && (
        <Card className="border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Last reset</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportBody report={report} />
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ResetReportPanel;
