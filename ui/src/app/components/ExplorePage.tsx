import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CareerPathDiagram } from './CareerPathDiagram';
import { getCareerPath, getExpertises } from '../api';
import type { CareerPath, Expertise } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Props {
  canEditTitles?: boolean;
}

export function ExplorePage({ canEditTitles = false }: Props) {
  const [selectedCode, setSelectedCode] = useState('');
  const [segment, setSegment] = useState('Tất cả');
  const [group, setGroup] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [expertises, setExpertises] = useState<Expertise[]>([]);
  const [path, setPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [pathLoading, setPathLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getExpertises()
      .then(data => {
        if (!active) return;
        setExpertises(data);
        const current = data.find(item => item.code === selectedCode);
        if (!current) {
          const preferred = data.find(item => item.enable) || data[0];
          setSelectedCode(preferred?.code ?? '');
        }
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách chuyên môn.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCode) return;
    let active = true;
    setPathLoading(true);
    setError(null);
    getCareerPath(selectedCode)
      .then(data => {
        if (!active) return;
        setPath(data);
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Không thể tải lộ trình.');
      })
      .finally(() => {
        if (active) setPathLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCode]);

  const segments = useMemo(() => {
    const unique = Array.from(new Set(expertises.map(item => item.segment))).sort();
    return ['Tất cả', ...unique];
  }, [expertises]);

  const groups = useMemo(() => {
    const unique = Array.from(new Set(expertises.map(item => item.group))).sort();
    return ['Tất cả', ...unique];
  }, [expertises]);

  const filtered = useMemo(() => expertises.filter(e => {
    if (segment !== 'Tất cả' && e.segment !== segment) return false;
    if (group !== 'Tất cả' && e.group !== group) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [expertises, segment, group, search]);

  const selected = expertises.find(e => e.code === selectedCode);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', color: 'var(--foreground)', fontWeight: 700 }}>Khám phá lộ trình nghề nghiệp</h1>
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>Duyệt các kiến trúc nghề nghiệp theo chuyên môn</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Tìm kiếm chuyên môn</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nhập tên chuyên môn..."
              className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-input-background text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Segment filter */}
        <div className="min-w-[140px]">
          <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Segment</label>
          <div className="relative">
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="w-full h-9 bg-input-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {segments.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Group filter */}
        <div className="min-w-[140px]">
          <label className="block text-xs text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Nhóm chuyên môn</label>
          <div className="relative">
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="w-full h-9 bg-input-background text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground self-end pb-2">
          {filtered.length} chuyên môn
        </div>
      </div>

      <div className="flex gap-4" style={{ minHeight: 0 }}>
        {/* Expertise list */}
        <div className="w-56 shrink-0 bg-card rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="px-3 py-2.5 border-b border-border bg-muted/40">
            <span className="text-xs text-muted-foreground" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chuyên môn</span>
          </div>
          <div className="overflow-y-auto flex-1" style={{ maxHeight: 500 }}>
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Đang tải danh sách...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Không có kết quả</div>
            ) : filtered.map(e => (
              <button
                key={e.code}
                onClick={() => e.enable && setSelectedCode(e.code)}
                disabled={!e.enable}
                className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors text-sm ${
                  e.code === selectedCode
                    ? 'bg-primary text-primary-foreground'
                    : e.enable
                    ? 'hover:bg-accent text-foreground'
                    : 'text-muted-foreground opacity-40 cursor-not-allowed'
                }`}
              >
                <div style={{ fontWeight: e.code === selectedCode ? 600 : 400 }}>{e.name}</div>
                <div className={`text-xs mt-0.5 ${e.code === selectedCode ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {e.group} · {e.segment}
                  {!e.enable && ' · Vô hiệu'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Diagram */}
        <div className="flex-1 min-w-0">
          {selected && (
            <div className="mb-3 flex items-center gap-3">
              <div>
                <h2 style={{ fontFamily: 'Plus Jakarta Sans,Inter,sans-serif', color: 'var(--foreground)', fontWeight: 700, fontSize: 18 }}>
                  {selected.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{selected.group}</span>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{selected.segment}</span>
                  <span className="text-xs text-muted-foreground">{selected.code}</span>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}
          {pathLoading && !error && (
            <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
              Đang tải lộ trình...
            </div>
          )}
          {path && !pathLoading && !error && (
            <CareerPathDiagram
              nodes={path.nodes}
              edges={path.edges}
              canEditTitles={canEditTitles}
            />
          )}
        </div>
      </div>
    </div>
  );
}
