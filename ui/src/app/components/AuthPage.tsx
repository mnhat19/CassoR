import { useState } from 'react';
import { Lock, UserPlus } from 'lucide-react';
import { login, register } from '../api';
import type { AuthResponse } from '../types';

interface Props {
  onAuthenticated: (response: AuthResponse) => void;
}

export function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('employee');
  const [password, setPassword] = useState('ChangeMe123!');
  const [displayName, setDisplayName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = mode === 'login'
        ? await login(username.trim(), password)
        : await register({
            username: username.trim(),
            password,
            display_name: displayName.trim() || undefined,
            employee_code: employeeCode.trim() || undefined,
          });
      onAuthenticated(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xác thực.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="w-full max-w-sm bg-card border border-border rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {mode === 'login' ? <Lock size={18} className="text-primary" /> : <UserPlus size={18} className="text-primary" />}
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif' }}>
              {mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
            </h1>
            <p className="text-sm text-muted-foreground">CASSOR HRM Platform</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Tên đăng nhập"
            className="w-full px-3 py-2 rounded-md border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            type="password"
            placeholder="Mật khẩu"
            className="w-full px-3 py-2 rounded-md border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          {mode === 'register' && (
            <>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Tên hiển thị"
                className="w-full px-3 py-2 rounded-md border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <input
                value={employeeCode}
                onChange={e => setEmployeeCode(e.target.value)}
                placeholder="Mã nhân viên, ví dụ demo_employee"
                className="w-full px-3 py-2 rounded-md border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !username.trim() || !password.trim()}
          className="mt-5 w-full px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </button>

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-3 w-full text-sm text-primary hover:underline"
        >
          {mode === 'login' ? 'Tạo tài khoản nhân viên mới' : 'Đã có tài khoản'}
        </button>

        <div className="mt-5 rounded-md bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <div className="font-medium text-foreground/70">Tài khoản mẫu (đăng nhập):</div>
          <div>employee · hr · leadership — mật khẩu: <span className="font-mono">ChangeMe123!</span></div>
          {mode === 'register' && (
            <>
              <div className="font-medium text-foreground/70 pt-1">Mã nhân viên hợp lệ:</div>
              <div className="font-mono">demo_employee · demo_lead · demo_hr</div>
              <div className="font-mono">demo_tech_lead · demo_product · demo_accounting</div>
              <div className="font-mono">demo_support · demo_intern</div>
              <div className="pt-1 text-muted-foreground/70">(Để trống nếu chưa có mã nhân viên)</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
