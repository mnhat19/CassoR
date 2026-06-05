import { useRef, useState, useEffect } from 'react';
import { Info, X, Edit2, Save, XCircle } from 'lucide-react';
import type { CareerNode, CareerEdge, TrackName, EdgeType } from '../types';
import { updateTitle } from '../api';

const TRACKS: TrackName[] = ['Trainee', 'Intern', 'Professional', 'Management', 'Leadership'];
const LEVELS = [6, 5, 4, 3, 2, 1];

const TRACK_COLORS: Record<TrackName, { bg: string; text: string; border: string }> = {
  Trainee:     { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  Intern:      { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  Professional:{ bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  Management:  { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  Leadership:  { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
};

const EDGE_COLORS: Record<EdgeType, string> = {
  up:           '#00a85e',
  branch:       '#6ee7b7',
  bidirectional:'#022c22',
};

const LEGEND_ITEMS = [
  { type: 'up' as EdgeType,           label: 'Lộ trình thăng tiến',  color: EDGE_COLORS.up,           dash: false },
  { type: 'branch' as EdgeType,       label: 'Lộ trình rẽ nhánh',    color: EDGE_COLORS.branch,       dash: false },
  { type: 'bidirectional' as EdgeType,label: 'Chuyển hai chiều',     color: EDGE_COLORS.bidirectional,dash: true },
];

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill={color} />
    </marker>
  );
}

interface Props {
  nodes: CareerNode[];
  edges: CareerEdge[];
  currentNodeId?: string;
  canEditTitles?: boolean;
}

export function CareerPathDiagram({ nodes, edges, currentNodeId, canEditTitles = false }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 });
  const [showLegend, setShowLegend] = useState(true);
  const [selectedNode, setSelectedNode] = useState<CareerNode | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ desc: '', general_requirement: '', exp_requirement: '' });

  const handleEditClick = () => {
    if (!selectedNode) return;
    setEditForm({
      desc: selectedNode.desc || '',
      general_requirement: selectedNode.general_requirement || '',
      exp_requirement: selectedNode.exp_requirement || '',
    });
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    if (!selectedNode || !selectedNode.db_id) return;
    setIsSaving(true);
    try {
      await updateTitle(selectedNode.db_id, editForm);
      selectedNode.desc = editForm.desc;
      selectedNode.general_requirement = editForm.general_requirement;
      selectedNode.exp_requirement = editForm.exp_requirement;
      setIsEditing(false);
    } catch (e) {
      alert("Lỗi khi lưu: " + e);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setGridSize({ w: entries[0].contentRect.width, h: entries[0].contentRect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const getPos = (track: TrackName, level: number) => {
    const col = TRACKS.indexOf(track);
    const row = LEVELS.indexOf(level);
    if (col === -1 || row === -1 || gridSize.w === 0) return null;
    return {
      x: (col + 0.5) * (gridSize.w / 5),
      y: (row + 0.5) * (gridSize.h / 6),
    };
  };

  return (
    <div className="relative bg-white rounded-lg border border-border flex flex-col overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 180px)', minHeight: 600 }}>
      {/* Header Tracks */}
      <div className="grid grid-cols-5 bg-slate-50 border-b border-border shrink-0 z-10 relative shadow-sm">
        {TRACKS.map(track => (
          <div key={track} className="h-10 flex items-center justify-center border-r border-border last:border-0"
               style={{ background: TRACK_COLORS[track].bg, borderBottom: `2px solid ${TRACK_COLORS[track].border}` }}>
            <span style={{ color: TRACK_COLORS[track].text, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {track}
            </span>
          </div>
        ))}
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 relative flex" style={{ background: '#F8FAFC' }}>
        
        {/* Y-Axis Level Labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col z-10 pointer-events-none">
          {LEVELS.map(level => (
            <div key={level} className="flex-1 flex items-center justify-center">
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100/80 px-1.5 rounded">L{level}</span>
            </div>
          ))}
        </div>

        <div ref={gridRef} className="flex-1 grid grid-cols-5 grid-rows-6 w-full h-full relative">
          
          {/* Vertical Separators */}
          <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
            {TRACKS.map((track, i) => (
              <div key={i} className="border-r border-slate-200 border-dashed h-full last:border-0" />
            ))}
          </div>

          {/* SVG Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            <defs>
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <ArrowMarker key={type} id={`arrow-${type}`} color={color} />
              ))}
              <marker id="arrow-bidi-start" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto-start-reverse">
                <path d="M0,0 L0,6 L8,3 z" fill={EDGE_COLORS.bidirectional} />
              </marker>
            </defs>
            
            {gridSize.w > 0 && edges.map((edge, i) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              // Only draw edges between active nodes
              if (!fromNode.active || !toNode.active) return null;

              const from = getPos(fromNode.track, fromNode.level);
              const to = getPos(toNode.track, toNode.level);
              if (!from || !to) return null;

              const color = EDGE_COLORS[edge.type];
              const isBidi = edge.type === 'bidirectional';
              const isDashed = edge.type === 'bidirectional';
              const markerId = `arrow-${edge.type}`;

              // Dynamic calculation for offsets based on cell size
              const cellW = gridSize.w / 5;
              const cellH = gridSize.h / 6;
              const cardW = Math.min(cellW - 20, 160); // 20px for p-2.5 (10px padding * 2)
              const cardH = Math.min(cellH - 20, 72);
              const offsetX = cardW / 2;
              const offsetY = cardH / 2;

              let d = '';
              const isSameCol = Math.abs(from.x - to.x) < 10;
              
              if (isSameCol) {
                // Vertical connection
                const fromY = from.y > to.y ? from.y - offsetY : from.y + offsetY;
                const toY = from.y > to.y ? to.y + offsetY : to.y - offsetY;
                d = `M ${from.x} ${fromY} L ${to.x} ${toY}`;
              } else {
                // Horizontal/Diagonal connection (orthogonal step)
                const fromX = from.x < to.x ? from.x + offsetX : from.x - offsetX;
                const toX = from.x < to.x ? to.x - offsetX : to.x + offsetX;
                const midX = (fromX + toX) / 2;
                d = `M ${fromX} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${toX} ${to.y}`;
              }

              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isBidi ? 2.5 : 2}
                  strokeDasharray={isDashed ? '6 5' : undefined}
                  markerEnd={`url(#${markerId})`}
                  markerStart={isBidi ? `url(#arrow-bidi-start)` : undefined}
                  opacity={0.8}
                />
              );
            })}
          </svg>

          {/* Grid Cells & Nodes */}
          {LEVELS.map(level => (
            TRACKS.map(track => {
              const node = nodes.find(n => n.track === track && n.level === level);
              const isCurrent = node?.id === currentNodeId;
              const tc = TRACK_COLORS[track];

              return (
                <div key={`${track}-${level}`} className="relative p-2.5 flex items-center justify-center z-20">
                  {node && node.active && (
                    <button
                      onClick={() => setSelectedNode(node)}
                      className={`w-full h-full max-w-[160px] max-h-[72px] rounded-lg border-2 flex flex-col items-center justify-center p-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                        isCurrent ? 'shadow-sm' : 'bg-white shadow-sm hover:border-slate-400'
                      }`}
                      style={{
                        background: isCurrent ? tc.bg : '#FFFFFF',
                        borderColor: isCurrent ? tc.border : '#E2E8F0',
                        boxShadow: isCurrent ? `0 0 0 3px ${tc.border}40, 0 4px 12px rgba(0,0,0,0.08)` : undefined,
                      }}
                    >
                      {isCurrent && (
                        <span style={{ position: 'absolute', top: -10, background: tc.text, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Hiện tại
                        </span>
                      )}
                      <span className="text-[12px] font-semibold leading-tight line-clamp-2" style={{ color: isCurrent ? tc.text : '#1E293B' }}>
                        {node.title}
                      </span>
                    </button>
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* Node Detail Popover Overlay */}
      {selectedNode && (
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedNode(null); setIsEditing(false); }}>
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-start shrink-0" style={{ background: TRACK_COLORS[selectedNode.track].bg }}>
              <div>
                <h3 className="font-bold text-lg leading-tight" style={{ color: TRACK_COLORS[selectedNode.track].text }}>{selectedNode.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/60" style={{ color: TRACK_COLORS[selectedNode.track].text }}>{selectedNode.track}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/60 text-slate-700">Level {selectedNode.level}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && canEditTitles && selectedNode.db_id && (
                  <button onClick={handleEditClick} className="p-1.5 bg-white/60 hover:bg-white rounded transition-colors text-slate-700 shadow-sm" title="Chỉnh sửa">
                    <Edit2 size={16} />
                  </button>
                )}
                {isEditing && (
                  <button onClick={handleSaveClick} disabled={isSaving} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors text-emerald-700 shadow-sm" title="Lưu">
                    <Save size={16} />
                  </button>
                )}
                <button onClick={() => { setSelectedNode(null); setIsEditing(false); }} className="p-1.5 bg-white/60 hover:bg-white rounded transition-colors text-slate-700 shadow-sm shrink-0">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 text-sm text-slate-600 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-slate-900 mb-1 block">Mô tả công việc</label>
                    <textarea 
                      value={editForm.desc} 
                      onChange={e => setEditForm(prev => ({...prev, desc: e.target.value}))}
                      className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[80px]"
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <label className="font-semibold text-slate-900 mb-1 block">Yêu cầu chung</label>
                    <textarea 
                      value={editForm.general_requirement} 
                      onChange={e => setEditForm(prev => ({...prev, general_requirement: e.target.value}))}
                      className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[60px]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-900 mb-1 block">Yêu cầu kinh nghiệm</label>
                    <textarea 
                      value={editForm.exp_requirement} 
                      onChange={e => setEditForm(prev => ({...prev, exp_requirement: e.target.value}))}
                      className="w-full p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[60px]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Mô tả công việc</h4>
                    <p className="whitespace-pre-wrap">{selectedNode.desc || "Đang cập nhật..."}</p>
                  </div>
                  
                  {(selectedNode.general_requirement || selectedNode.exp_requirement) && (
                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="font-semibold text-slate-900 mb-1">Yêu cầu</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {selectedNode.general_requirement && (
                          <li>{selectedNode.general_requirement}</li>
                        )}
                        {selectedNode.exp_requirement && (
                          <li>{selectedNode.exp_requirement}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legend Toggle */}
      <div className="absolute bottom-4 right-4 z-40">
        {!showLegend ? (
          <button onClick={() => setShowLegend(true)} className="bg-white/90 backdrop-blur border border-slate-200 shadow-sm p-2 rounded-full hover:bg-slate-50 text-slate-600 transition-all">
            <Info size={20} />
          </button>
        ) : (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 shadow-lg w-64 relative">
            <button onClick={() => setShowLegend(false)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100">
              <X size={14} />
            </button>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Chú giải sơ đồ</p>
            <div className="space-y-2.5">
              {LEGEND_ITEMS.map(item => (
                <div key={item.type} className="flex items-center gap-2.5">
                  <svg width="32" height="10" className="shrink-0">
                    <line x1="0" y1="5" x2="32" y2="5" stroke={item.color} strokeWidth={2} strokeDasharray={item.dash ? '5 3' : undefined} />
                    <polygon points="26,2 32,5 26,8" fill={item.color} />
                  </svg>
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 mt-2">
                <div className="w-8 h-3.5 bg-[#EFF6FF] border-2 border-[#BFDBFE] rounded shrink-0" />
                <span className="text-xs font-medium text-slate-600">Vị trí của bạn</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
