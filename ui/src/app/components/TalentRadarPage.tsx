import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, Clock, Download,
  FileSpreadsheet, TrendingDown, Upload, Users, Copy, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  downloadAnalysisReport,
  getBranchEligibleAlerts,
  getDependencyReports,
  getPaymentStatus,
  getPyramid,
  getStagnationAlerts,
  initiatePayment,
} from '../api';
import type {
  BranchEligibleAlert,
  DependencyReport,
  PaymentInitiateResponse,
  PaymentStatus,
  PyramidEntry,
  StagnationAlert,
} from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const TRACK_COLORS = ['#99dcbf', '#33b97e', '#007e47'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);
  return { copied, copy };
}

// ── Sub-components ───────────────────────────────────────────────────────────

type PyramidRow = {
  level: string;
  Professional: number;
  Management: number;
  Leadership: number;
  total: number;
};

function KpiCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, { text: string }> = {
    blue:   { text: 'text-emerald-700' },
    amber:  { text: 'text-emerald-700' },
    purple: { text: 'text-emerald-700' },
    emerald:{ text: 'text-emerald-700' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 500 }}>{label}</div>
      <div className={`text-2xl ${c.text}`} style={{ fontWeight: 700, fontFamily: 'Plus Jakarta Sans,Inter,sans-serif' }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function SeverityBadge({ score }: { score: number }) {
  if (score >= 8.5) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-200 text-emerald-900 border border-emerald-300">● Nguy hiểm</span>;
  if (score >= 7) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">● Cao</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">● Trung bình</span>;
}

const PyramidBar = ({ level, value, maxValue }: { level: string; value: number; maxValue: number }) => {
  const pct = (value / maxValue) * 100;
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="text-xs text-muted-foreground w-14 text-right shrink-0" style={{ fontWeight: 500 }}>{level}</div>
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-sm h-7 flex items-center justify-center">
          <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #33b97e, #00a85e)', borderRadius: 4, height: '100%', transition: 'width 0.6s ease' }} />
        </div>
      </div>
      <div className="text-xs text-muted-foreground w-10 shrink-0" style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
};

// ── Paid Upload Section ──────────────────────────────────────────────────────

type UploadStep = 'idle' | 'uploading' | 'awaiting_payment' | 'polling' | 'ready' | 'downloading' | 'done' | 'error';

interface PaidUploadState {
  step: UploadStep;
  file: File | null;
  payment: PaymentInitiateResponse | null;
  paymentStatus: PaymentStatus | null;
  errorMsg: string | null;
}

function CopyableField({ label, value, id, copied, copy }: {
  label: string; value: string; id: string;
  copied: string | null; copy: (v: string, k: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium flex-1 break-all">{value}</span>
      <button
        onClick={() => copy(value, id)}
        className="p-1.5 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground shrink-0"
        title="Sao chép"
      >
        {copied === id ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function PaidUploadSection() {
  const [state, setState] = useState<PaidUploadState>({
    step: 'idle', file: null, payment: null, paymentStatus: null, errorMsg: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { copied, copy } = useCopyToClipboard();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleFileSelect = useCallback((file: File) => {
    setState({ step: 'idle', file, payment: null, paymentStatus: null, errorMsg: null });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!state.file) return;
    setState(s => ({ ...s, step: 'uploading', errorMsg: null }));
    try {
      const payment = await initiatePayment(state.file);
      setState(s => ({ ...s, step: 'awaiting_payment', payment }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload thất bại';
      // Try to parse JSON error detail
      let detail = msg;
      try { const parsed = JSON.parse(msg); detail = parsed.detail || msg; } catch {}
      setState(s => ({ ...s, step: 'error', errorMsg: detail }));
    }
  }, [state.file]);

  const startPolling = useCallback(() => {
    if (!state.payment) return;
    setState(s => ({ ...s, step: 'polling' }));
    const ref = state.payment.reference;

    pollRef.current = setInterval(async () => {
      try {
        const status = await getPaymentStatus(ref);
        if (status.status === 'paid') {
          stopPolling();
          setState(s => ({ ...s, step: 'ready', paymentStatus: 'paid' }));
        } else if (status.status === 'expired') {
          stopPolling();
          setState(s => ({ ...s, step: 'error', errorMsg: 'Phiên thanh toán đã hết hạn. Vui lòng thử lại.' }));
        }
      } catch {
        // ignore transient errors during polling
      }
    }, 5000);
  }, [state.payment, stopPolling]);

  const handleDownload = useCallback(async () => {
    if (!state.payment) return;
    setState(s => ({ ...s, step: 'downloading' }));
    try {
      const blob = await downloadAnalysisReport(state.payment.reference);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `talent_radar_${state.payment.reference}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState(s => ({ ...s, step: 'done' }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tải báo cáo thất bại';
      let detail = msg;
      try { const parsed = JSON.parse(msg); detail = parsed.detail || msg; } catch {}
      setState(s => ({ ...s, step: 'error', errorMsg: detail }));
    }
  }, [state.payment]);

  const handleReset = useCallback(() => {
    stopPolling();
    setState({ step: 'idle', file: null, payment: null, paymentStatus: null, errorMsg: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [stopPolling]);

  const { step, file, payment } = state;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-emerald-50/50">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
          <FileSpreadsheet size={18} className="text-emerald-700" />
        </div>
        <div className="flex-1">
          <h2 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 15 }}>
            Phân tích dữ liệu nhân sự của bạn
          </h2>
          <p className="text-xs text-muted-foreground">Tải lên file Excel/CSV → Thanh toán {formatVnd(3000)} → Tải báo cáo</p>
        </div>
        {step !== 'idle' && (
          <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground underline">
            Làm mới
          </button>
        )}
      </div>

      <div className="p-5">
        {/* STEP: idle or file selected */}
        {(step === 'idle') && (
          <div className="flex flex-col gap-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
            >
              <Upload size={28} className="text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Kéo thả hoặc nhấp để chọn file</p>
                <p className="text-xs text-muted-foreground mt-1">Hỗ trợ: .xlsx, .xls, .csv — Tối đa 10MB</p>
              </div>
              {file && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                  <FileSpreadsheet size={13} />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border flex flex-col gap-1.5">
              <div><strong>Cột cần có trong file:</strong> Mã NV (hoặc ID), Chức danh (hoặc Title). Tùy chọn: Nhóm chuyên môn, Phân khúc, Nguồn tuyển.</div>
              <div className="flex items-center gap-3">
                <span>Chưa có file mẫu?</span>
                <a
                  href="/templates/hr_data_template.xlsx"
                  download
                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 underline underline-offset-2 font-medium"
                  onClick={e => e.stopPropagation()}
                >
                  <Download size={11} />
                  Tải template Excel
                </a>
                <a
                  href="/templates/hr_data_template.csv"
                  download
                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 underline underline-offset-2 font-medium"
                  onClick={e => e.stopPropagation()}
                >
                  <Download size={11} />
                  Tải template CSV
                </a>
              </div>
            </div>

            {file && (
              <button
                onClick={handleUpload}
                className="self-start px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Upload size={14} />
                Tải lên và tạo lệnh thanh toán
              </button>
            )}
          </div>
        )}

        {/* STEP: uploading */}
        {step === 'uploading' && (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <RefreshCw size={18} className="animate-spin text-emerald-600" />
            <span className="text-sm">Đang tải file lên và xử lý...</span>
          </div>
        )}

        {/* STEP: awaiting_payment */}
        {step === 'awaiting_payment' && payment && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Clock size={15} />
              Chuyển khoản theo thông tin bên dưới, sau đó nhấn &quot;Tôi đã chuyển khoản&quot;
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-1 divide-y divide-border">
              <CopyableField label="Ngân hàng" value={payment.bank_info.bank_name} id="bank" copied={copied} copy={copy} />
              <CopyableField label="Số tài khoản" value={payment.bank_info.account_number} id="acct" copied={copied} copy={copy} />
              <CopyableField label="Chủ tài khoản" value={payment.bank_info.account_name} id="owner" copied={copied} copy={copy} />
              <CopyableField label="Số tiền" value={formatVnd(payment.bank_info.amount_vnd)} id="amount" copied={copied} copy={copy} />
              <CopyableField label="Nội dung CK" value={payment.bank_info.transfer_content} id="content" copied={copied} copy={copy} />
            </div>

            <div className="text-xs text-muted-foreground">
              ⏱ Phiên có hiệu lực trong <strong>{payment.expires_in_minutes} phút</strong>.
              Hệ thống sẽ tự động nhận khi ngân hàng ghi nhận giao dịch.
            </div>

            <div className="flex gap-3">
              <button
                onClick={startPolling}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={14} />
                Tôi đã chuyển khoản — Chờ xác nhận
              </button>
            </div>
          </div>
        )}

        {/* STEP: polling */}
        {step === 'polling' && payment && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 py-4">
              <RefreshCw size={18} className="animate-spin text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Đang chờ xác nhận thanh toán...</p>
                <p className="text-xs text-muted-foreground">Mã giao dịch: <code className="font-mono">{payment.reference}</code></p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2 border border-border">
              Hệ thống tự động nhận thông báo từ ngân hàng và xác nhận. Thường trong 1–2 phút sau khi chuyển khoản thành công.
            </div>
          </div>
        )}

        {/* STEP: ready */}
        {step === 'ready' && payment && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
              <CheckCircle2 size={16} className="text-emerald-600" />
              Thanh toán xác nhận thành công! Nhấn tải báo cáo để nhận file phân tích.
            </div>
            <button
              onClick={handleDownload}
              className="self-start px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Download size={15} />
              Tải báo cáo Excel (.xlsx)
            </button>
            <p className="text-xs text-muted-foreground">⚠️ Báo cáo chỉ được tải <strong>một lần</strong> — hệ thống không lưu trữ.</p>
          </div>
        )}

        {/* STEP: downloading */}
        {step === 'downloading' && (
          <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
            <RefreshCw size={18} className="animate-spin text-emerald-600" />
            <span className="text-sm">Đang tạo và tải báo cáo...</span>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
              <CheckCircle2 size={16} />
              Báo cáo đã được tải về thành công!
            </div>
            <button onClick={handleReset} className="self-start text-xs text-muted-foreground hover:text-foreground underline">
              Phân tích file mới
            </button>
          </div>
        )}

        {/* STEP: error */}
        {step === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {state.errorMsg || 'Có lỗi xảy ra. Vui lòng thử lại.'}
            </div>
            <button onClick={handleReset} className="self-start px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/60 transition-colors">
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Internal Radar Dashboard ─────────────────────────────────────────────────

function InternalRadarDashboard() {
  const [expertiseFilter, setExpertiseFilter] = useState('Tất cả');
  const [pyramidEntries, setPyramidEntries] = useState<PyramidEntry[]>([]);
  const [branchAlerts, setBranchAlerts] = useState<BranchEligibleAlert[]>([]);
  const [stagnationAlerts, setStagnationAlerts] = useState<StagnationAlert[]>([]);
  const [dependencyReports, setDependencyReports] = useState<DependencyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getBranchEligibleAlerts(), getStagnationAlerts(), getDependencyReports()])
      .then(([branchData, stagnationData, dependencyData]) => {
        if (!active) return;
        setBranchAlerts(branchData);
        setStagnationAlerts(stagnationData);
        setDependencyReports(dependencyData);
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu radar.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getPyramid(expertiseFilter === 'Tất cả' ? undefined : expertiseFilter)
      .then(data => { if (!active) return; setPyramidEntries(data); })
      .catch(err => { if (!active) return; setError(err instanceof Error ? err.message : 'Lỗi tải pyramid.'); });
    return () => { active = false; };
  }, [expertiseFilter]);

  const pyramidData = useMemo((): PyramidRow[] => {
    const levels = [6, 5, 4, 3, 2, 1];
    const base: PyramidRow[] = levels.map(level => ({ level: `Level ${level}`, Professional: 0, Management: 0, Leadership: 0, total: 0 }));
    for (const entry of pyramidEntries) {
      const idx = levels.indexOf(entry.level);
      if (idx < 0) continue;
      const row = base[idx];
      if (entry.track === 'Professional') row.Professional += entry.count;
      if (entry.track === 'Management') row.Management += entry.count;
      if (entry.track === 'Leadership') row.Leadership += entry.count;
      row.total += entry.count;
    }
    return base;
  }, [pyramidEntries]);

  const maxPyramid = Math.max(1, ...pyramidData.map(d => d.total));
  const totalEmployees = useMemo(() => pyramidEntries.reduce((s, e) => s + e.count, 0), [pyramidEntries]);

  const dependencyStats = useMemo(() => {
    let totalExternal = 0;
    let totalInternal = 0;
    const bySegment = dependencyReports.map(report => {
      const ratio = Math.min(Math.max(report.external_hire_ratio, 0), 1);
      const internal = report.internal_pipeline_count;
      const total = ratio < 1 ? internal / (1 - ratio) : internal;
      const external = Math.max(0, total - internal);
      totalExternal += external;
      totalInternal += internal;
      return { segment: report.segment, external_hire: Math.round(external), internal, total: Math.round(total) };
    });
    const total = totalExternal + totalInternal;
    return { externalRatio: total ? totalExternal / total : 0, internalCount: totalInternal, bySegment };
  }, [dependencyReports]);

  if (error) return <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>;
  if (loading) return <div className="p-3 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">Đang tải dữ liệu radar...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Tổng nhân sự" value={totalEmployees} sub="Demo data" color="blue" />
        <KpiCard label="Cảnh báo rẽ nhánh" value={branchAlerts.length} sub="Cần xem xét ngay" color="amber" />
        <KpiCard label="Rủi ro stagnation" value={stagnationAlerts.length} sub="Nhân sự chững lại" color="purple" />
        <KpiCard label="Tỷ lệ tuyển ngoài" value={`${Math.round(dependencyStats.externalRatio * 100)}%`} sub="Mục tiêu: ≤35%" color="emerald" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                <Users size={14} className="text-blue-600" />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 15 }}>Kim tự tháp tổ chức</h3>
                <p className="text-xs text-muted-foreground">Phân bổ nhân sự theo cấp độ</p>
              </div>
            </div>
            <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
              <SelectTrigger className="w-[120px] h-8 bg-transparent text-xs">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả</SelectItem>
                <SelectItem value="Technical">Technical</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-2">
            {pyramidData.map(row => <PyramidBar key={row.level} level={row.level} value={row.total} maxValue={maxPyramid} />)}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={pyramidData.slice().reverse()} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="Professional" stackId="a" fill={TRACK_COLORS[0]} radius={[0,0,0,0]} />
                <Bar dataKey="Management" stackId="a" fill={TRACK_COLORS[1]} />
                <Bar dataKey="Leadership" stackId="a" fill={TRACK_COLORS[2]} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={14} className="text-amber-600" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 15 }}>Đủ điều kiện rẽ nhánh</h3>
              <p className="text-xs text-muted-foreground">Nhân sự ở đỉnh track chưa chuyển hướng</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Mã NV', 'Expertise', 'Cấp hiện tại', 'Tháng chững', 'Hành động'].map(h => (
                    <th key={h} className="text-left px-2 py-2 text-muted-foreground" style={{ fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchAlerts.length === 0 && (
                  <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">Chưa có cảnh báo rẽ nhánh.</td></tr>
                )}
                {branchAlerts.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-2 py-2.5 font-medium">{row.employee_id}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{row.expertise_code}</td>
                    <td className="px-2 py-2.5"><span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-xs">L{row.current_level}</span></td>
                    <td className="px-2 py-2.5"><span className="font-medium text-emerald-700">{row.months_stagnant} tháng</span></td>
                    <td className="px-2 py-2.5"><button className="text-primary hover:underline text-xs">Xem xét</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center">
              <TrendingDown size={14} className="text-red-600" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 15 }}>Rủi ro chững lại</h3>
              <p className="text-xs text-muted-foreground">Xếp hạng nhân sự theo điểm rủi ro</p>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Mã NV', 'Điểm rủi ro', 'Level', 'Tháng chững', 'Mức độ'].map(h => (
                  <th key={h} className="text-left px-2 py-2 text-muted-foreground" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stagnationAlerts.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">Chưa có cảnh báo stagnation.</td></tr>
              )}
              {stagnationAlerts.map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-2 py-2.5 font-medium">{row.employee_id}</td>
                  <td className="px-2 py-2.5"><span className={`font-bold ${row.score >= 8.5 ? 'text-emerald-900' : row.score >= 7 ? 'text-emerald-800' : 'text-emerald-700'}`}>{row.score}</span></td>
                  <td className="px-2 py-2.5"><span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-xs">L{row.current_level}</span></td>
                  <td className="px-2 py-2.5 text-muted-foreground">{row.months_stagnant}T</td>
                  <td className="px-2 py-2.5"><SeverityBadge score={row.score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-purple-50 flex items-center justify-center">
              <BarChart3 size={14} className="text-purple-600" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 15 }}>Phân tích phụ thuộc</h3>
              <p className="text-xs text-muted-foreground">Tỷ lệ tuyển ngoài vs nội bộ theo segment</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-md bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground mb-0.5" style={{ fontWeight: 500 }}>Tỷ lệ tuyển ngoài</div>
              <div className="text-xl text-emerald-600" style={{ fontWeight: 700 }}>{Math.round(dependencyStats.externalRatio * 100)}%</div>
              <div className="text-xs text-muted-foreground">Mục tiêu: ≤35%</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground mb-0.5" style={{ fontWeight: 500 }}>Pipeline nội bộ</div>
              <div className="text-xl text-emerald-600" style={{ fontWeight: 700 }}>{dependencyStats.internalCount}</div>
              <div className="text-xs text-muted-foreground">nhân sự sẵn sàng</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={dependencyStats.bySegment} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="segment" tick={{ fontSize: 11, fill: '#64748B' }} width={48} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Bar dataKey="external_hire" name="Tuyển ngoài" fill="#33b97e" radius={[0,4,4,0]} />
              <Bar dataKey="internal" name="Nội bộ" fill="#00a85e" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'upload' | 'internal';

export function TalentRadarPage() {
  const [tab, setTab] = useState<Tab>('upload');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', color: 'var(--foreground)', fontWeight: 700 }}>Talent Radar</h1>
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>Phân tích nhân sự và cảnh báo rủi ro tài năng</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border w-fit">
        {([
          { key: 'upload' as Tab, label: 'Phân tích dữ liệu của bạn' },
          { key: 'internal' as Tab, label: 'Dữ liệu nội bộ (Demo)' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key
                ? 'bg-white shadow-sm text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' && <PaidUploadSection />}
      {tab === 'internal' && <InternalRadarDashboard />}
    </div>
  );
}
