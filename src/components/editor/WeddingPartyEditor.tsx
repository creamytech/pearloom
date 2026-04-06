'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/WeddingPartyEditor.tsx
// Editor panel for adding/editing wedding party members.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WeddingPartyMember } from '@/types';

const ROLES: Array<{ value: WeddingPartyMember['role']; label: string }> = [
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
  { value: 'maid-of-honor', label: 'Maid of Honor' },
  { value: 'best-man', label: 'Best Man' },
  { value: 'bridesmaid', label: 'Bridesmaid' },
  { value: 'groomsman', label: 'Groomsman' },
  { value: 'flower-girl', label: 'Flower Girl' },
  { value: 'ring-bearer', label: 'Ring Bearer' },
  { value: 'officiant', label: 'Officiant' },
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' },
];

interface WeddingPartyEditorProps {
  members: WeddingPartyMember[];
  onChange: (members: WeddingPartyMember[]) => void;
}

export function WeddingPartyEditor({ members, onChange }: WeddingPartyEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addMember = () => {
    const newMember: WeddingPartyMember = {
      id: `party-${Date.now()}`,
      name: '',
      role: 'bridesmaid',
      order: members.length,
    };
    onChange([...members, newMember]);
    setEditingId(newMember.id);
  };

  const updateMember = (id: string, updates: Partial<WeddingPartyMember>) => {
    onChange(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMember = (id: string) => {
    onChange(members.filter(m => m.id !== id).map((m, i) => ({ ...m, order: i })));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: '8px',
    border: '1.5px solid var(--pl-divider)', background: 'white',
    fontSize: '0.82rem', color: 'var(--pl-ink)', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--pl-muted)',
    marginBottom: '4px', display: 'block',
  };

  return (
    <div style={{ padding: '12px' }}>
      <div className="pl-panel-label" style={{ marginBottom: '12px' }}>
        <Users size={10} /> Wedding Party ({members.length})
      </div>

      {/* Member list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        {members.map((member) => (
          <div key={member.id} className="pl-panel-card" style={{ padding: '10px' }}>
            {editingId === member.id ? (
              /* Edit mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={labelStyle}>Name</span>
                  <input
                    type="text" value={member.name}
                    onChange={(e) => updateMember(member.id, { name: e.target.value })}
                    placeholder="Full name"
                    style={inputStyle} autoFocus
                    className="pl-focus-glow"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <span style={labelStyle}>Role</span>
                    <select
                      value={member.role}
                      onChange={(e) => updateMember(member.id, { role: e.target.value as WeddingPartyMember['role'] })}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <span style={labelStyle}>Relationship</span>
                    <input
                      type="text" value={member.relationship || ''}
                      onChange={(e) => updateMember(member.id, { relationship: e.target.value })}
                      placeholder="Bride's sister"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <span style={labelStyle}>Short Bio</span>
                  <textarea
                    value={member.bio || ''}
                    onChange={(e) => updateMember(member.id, { bio: e.target.value })}
                    placeholder="A few words about this person..."
                    style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button variant="primary" size="xs" onClick={() => setEditingId(null)}>Done</Button>
                  <Button variant="ghost" size="xs" onClick={() => removeMember(member.id)}>
                    <Trash2 size={11} /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => setEditingId(member.id)}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'var(--pl-olive-mist)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-olive-deep)',
                  flexShrink: 0,
                }}>
                  {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-ink)' }}>
                    {member.name || 'Unnamed'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--pl-olive)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {ROLES.find(r => r.value === member.role)?.label}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeMember(member.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', padding: '4px' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={addMember} icon={<Plus size={12} />} className="w-full">
        Add Party Member
      </Button>
    </div>
  );
}
