import { BadgeCheck, Shield, User } from 'lucide-react';
import type { UserProfile } from '../types';

const ROLE_LABEL: Record<UserProfile['role'], string> = {
  employee: 'Nhân viên',
  hr: 'HR',
  leadership: 'Leadership',
};

interface Props {
  user: UserProfile;
}

export function ProfilePage({ user }: Props) {
  const displayName = user.full_name || user.display_name || user.username;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', color: 'var(--foreground)', fontWeight: 700 }}>Hồ sơ cá nhân</h1>
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>Thông tin tài khoản và dữ liệu nhân sự đang liên kết</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0">
            <User size={24} color="white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif' }}>{displayName}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Shield size={12} /> {ROLE_LABEL[user.role]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">@{user.username}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            ['Mã nhân viên', user.employee_number || '—'],
            ['Code', user.employee_code || '—'],
            ['Expertise Group', user.expertise_group || '—'],
            ['Expertise Segment', user.expertise_segment || '—'],
            ['Chức danh nguồn', user.raw_title || '—'],
            ['Title chuẩn hóa', user.title || '—'],
          ].map(([label, value]) => (
            <div key={label} className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 500 }}>{label}</div>
              <div className="text-sm font-semibold text-foreground">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 flex gap-2">
          <BadgeCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            “Nghề nghiệp của tôi” dùng chức danh nguồn của hồ sơ này để resolve expertise, track và level trên Career Path Diagram.
          </div>
        </div>
      </div>
    </div>
  );
}
