import { useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle2, AlertCircle, TrendingUp, User, Target, BookOpen } from 'lucide-react';
import { CareerPathDiagram } from './CareerPathDiagram';
import { getMyCareerPath, getPrecedents, resolveTitle } from '../api';
import type { CareerPath, PrecedentRow, TitleResolveResponse } from '../types';

function ConfidenceBadge({ value }: { value: number }) {
  if (value >= 0.85) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 size={11} /> Cao ({Math.round(value * 100)}%)
    </span>
  );
  if (value >= 0.6) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <AlertCircle size={11} /> Trung bình ({Math.round(value * 100)}%)
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <AlertCircle size={11} /> Thấp ({Math.round(value * 100)}%)
    </span>
  );
}

interface Props {
  canEditTitles?: boolean;
}

export function MyCareerPage({ canEditTitles = false }: Props) {
  const [titleInput, setTitleInput] = useState('');
  const [resolved, setResolved] = useState<TitleResolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [path, setPath] = useState<CareerPath | null>(null);
  const [precedents, setPrecedents] = useState<PrecedentRow[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setPageLoading(true);
    setPageError(null);
    Promise.all([getMyCareerPath(), getPrecedents()])
      .then(([careerPath, precedentRows]) => {
        if (!active) return;
        setPath(careerPath);
        setPrecedents(precedentRows);
      })
      .catch(err => {
        if (!active) return;
        setPageError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
      })
      .finally(() => {
        if (active) setPageLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleResolve() {
    if (!titleInput.trim()) return;
    setLoading(true);
    setResolveError(null);
    resolveTitle(titleInput.trim())
      .then(result => {
        setResolved(result);
      })
      .catch(err => {
        setResolveError(err instanceof Error ? err.message : 'Không thể phân tích chức danh.');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const currentNode = useMemo(() => {
    if (!path?.currentNodeId) return null;
    return path.nodes.find(node => node.id === path.currentNodeId) || null;
  }, [path]);

  const nextUpNode = useMemo(() => {
    if (!currentNode || !path) return null;
    const edge = path.edges.find(item => item.from === currentNode.id && item.type === 'up');
    return edge ? path.nodes.find(node => node.id === edge.to) || null : null;
  }, [currentNode, path]);

  const branchNode = useMemo(() => {
    if (!currentNode || !path) return null;
    const edge = path.edges.find(item => item.from === currentNode.id && item.type === 'branch');
    return edge ? path.nodes.find(node => node.id === edge.to) || null : null;
  }, [currentNode, path]);

  const ceilingNode = useMemo(() => {
    if (!currentNode || !path) return null;
    const sameTrack = path.nodes
      .filter(node => node.track === currentNode.track && node.active)
      .sort((a, b) => b.level - a.level);
    return sameTrack[0] || null;
  }, [currentNode, path]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', color: 'var(--foreground)', fontWeight: 700 }}>Lộ trình của tôi</h1>
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>Khám phá vị trí hiện tại và các bước tiến tiếp theo trong sự nghiệp</p>
      </div>

      {/* Section A: Title Resolver */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search size={16} className="text-primary" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--foreground)' }}>Phân tích chức danh</h2>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Nhập chức danh hiện tại để xác định vị trí trong kiến trúc nghề nghiệp</p>
          </div>
        </div>

        <div className="flex gap-3">
          <input
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleResolve()}
            placeholder="VD: Senior Software Engineer, Product Manager..."
            className="flex-1 px-3 py-2 rounded-md border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
          />
          <button
            onClick={handleResolve}
            disabled={!titleInput.trim() || loading}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {loading ? 'Đang phân tích...' : 'Phân tích chức danh'}
          </button>
        </div>

        {resolved && (
          <div className="mt-4 p-4 rounded-lg bg-secondary/40 border border-secondary flex flex-wrap gap-6">
            <div>
              <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Chức danh tương ứng</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)', fontFamily: 'Plus Jakarta Sans,Inter,sans-serif' }}>{resolved.matched_title || 'Chưa xác định'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Track</div>
              <div className="text-sm font-medium">{resolved.track || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Cấp độ</div>
              <div className="text-sm font-medium">{resolved.level ? `Level ${resolved.level}` : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1" style={{ fontWeight: 500 }}>Độ chính xác</div>
              <ConfidenceBadge value={resolved.confidence ?? 0} />
            </div>
          </div>
        )}
        {resolveError && (
          <div className="mt-3 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
            {resolveError}
          </div>
        )}
      </div>

      {/* Section B: My Career Path */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--foreground)' }}>Lộ trình nghề nghiệp của tôi</h2>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Vị trí hiện tại và các cơ hội thăng tiến</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 p-3 rounded-md bg-emerald-50 border border-emerald-200">
          <User size={16} className="text-emerald-600 shrink-0" />
          <div>
            <span className="text-sm text-emerald-800" style={{ fontWeight: 600 }}>
              Vị trí hiện tại: {currentNode?.title || '—'}
            </span>
            <span className="text-xs text-emerald-600 ml-2">
              · {currentNode?.track || '—'} · {currentNode?.level ? `Level ${currentNode.level}` : '—'}
            </span>
          </div>
        </div>

        {pageError && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            {pageError}
          </div>
        )}
        {pageLoading && !pageError && (
          <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
            Đang tải lộ trình cá nhân...
          </div>
        )}
        {path && !pageLoading && !pageError && (
          <CareerPathDiagram
            nodes={path.nodes}
            edges={path.edges}
            currentNodeId={path.currentNodeId}
            canEditTitles={canEditTitles}
          />
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            {
              icon: Target,
              label: 'Bước tiếp theo',
              value: nextUpNode?.title || '—',
              sub: nextUpNode ? `${nextUpNode.track} · L${nextUpNode.level}` : '—',
            },
            {
              icon: BookOpen,
              label: 'Cơ hội rẽ nhánh',
              value: branchNode?.title || '—',
              sub: branchNode ? `${branchNode.track} · L${branchNode.level}` : '—',
            },
            {
              icon: TrendingUp,
              label: 'Đỉnh track',
              value: ceilingNode?.title || '—',
              sub: ceilingNode ? `${ceilingNode.track} · L${ceilingNode.level}` : '—',
            },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground" style={{ fontWeight: 500 }}>{label}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--foreground)' }}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section C: Career Precedents */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <BookOpen size={16} className="text-purple-600" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--foreground)' }}>Tiền lệ nghề nghiệp</h2>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Lịch sử thăng tiến của nhân sự trong cùng chuyên môn</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Nguồn phát triển', 'Track', 'Level', 'Độ tuổi thăng tiến', 'Expertise'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs text-muted-foreground" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {precedents.filter(p => !path || p.expertise === path.expertise.code).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    Chưa có dữ liệu tiền lệ cho chuyên môn này.
                  </td>
                </tr>
              )}
              {precedents.filter(p => !path || p.expertise === path.expertise.code).map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {row.training_source || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm">{row.track || '—'}</td>
                  <td className="px-3 py-3">
                    <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-xs font-medium">{row.level ? `L${row.level}` : '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">
                    {row.age_at_promotion ? `${row.age_at_promotion} tuổi` : '—'}
                  </td>
                  <td className="px-3 py-3 text-sm">{row.expertise || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
