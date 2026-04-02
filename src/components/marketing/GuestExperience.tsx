'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Wand2,
  Users,
  MessageCircle,
  Heart,
  Layers,
  GripVertical,
  Globe,
  BarChart2,
  Mail,
  LayoutGrid,
  Plane,
  UserPlus,
  Bot,
  Languages,
  Calendar,
  Hash,
  TimerReset,
  BookImage,
  RefreshCcw,
  Camera,
} from 'lucide-react';
import { colors as C, text, sectionPadding, layout } from '@/lib/design-tokens';

type FeatureItem = { icon: React.ElementType; label: string };
type FeatureGroup = {
  groupIcon: React.ElementType;
  title: string;
  accent: string;
  items: FeatureItem[];
};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    groupIcon: Wand2,
    title: 'Site Building',
    accent: C.olive,
    items: [
      { icon: Wand2,       label: 'AI generation in seconds'     },
      { icon: Layers,      label: '19 block types'               },
      { icon: GripVertical,label: 'Drag & drop visual editor'    },
      { icon: Globe,       label: 'Custom domain support'        },
    ],
  },
  {
    groupIcon: Users,
    title: 'Guest Management',
    accent: C.plum,
    items: [
      { icon: Mail,        label: 'RSVP collection'              },
      { icon: LayoutGrid,  label: 'Interactive seating chart'    },
      { icon: UserPlus,    label: 'CSV bulk import'              },
      { icon: BarChart2,   label: 'Analytics & RSVP insights'    },
    ],
  },
  {
    groupIcon: MessageCircle,
    title: 'Communication',
    accent: C.gold,
    items: [
      { icon: MessageCircle, label: 'Bulk email invitations'     },
      { icon: Bot,           label: 'AI guest concierge'         },
      { icon: Languages,     label: '9-language translations'    },
      { icon: Calendar,      label: 'Save the Date cards'        },
    ],
  },
  {
    groupIcon: Heart,
    title: 'After the Day',
    accent: C.plum,
    items: [
      { icon: TimerReset,  label: 'Time capsule messages'        },
      { icon: BookImage,   label: 'Guest photo guestbook'        },
      { icon: RefreshCcw,  label: 'Anniversary mode'             },
      { icon: Camera,      label: 'Community memory wall'        },
    ],
  },
];

export function GuestExperience() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.06 });

  return (
    <section
      ref={ref}
      id="features"
      style={{
        background: C.cream,
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
        borderTop: `1px solid ${C.divider}`,
      }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start gap-10 mb-14">
          <motion.div
            className="lg:w-[38%]"
            initial={{ opacity: 0, x: -18 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <p style={{
              fontSize: '0.68rem', fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: C.olive, marginBottom: '1rem',
            }}>
              Platform Features
            </p>
            <h2
              className="font-heading font-bold tracking-tight leading-[1.1]"
              style={{ fontSize: 'clamp(2rem,3.5vw,2.75rem)', color: C.ink, marginBottom: '1rem' }}
            >
              Everything built in.{' '}
              <em style={{ color: C.plum, fontStyle: 'italic' }}>Nothing bolted on.</em>
            </h2>
            <p style={{ fontSize: text.base, color: C.muted, lineHeight: 1.75, maxWidth: '340px' }}>
              From your first photo upload to your anniversary ten years later, Pearloom handles every detail of your celebration.
            </p>
          </motion.div>

          {/* Hashtag + voice callout pills */}
          <motion.div
            className="lg:w-[62%] flex flex-wrap gap-2 lg:pt-2"
            initial={{ opacity: 0, x: 18 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.12 }}
          >
            {[
              { icon: Hash,      label: 'Hashtag generator', accent: C.olive },
              { icon: Bot,       label: 'Voice-trained AI', accent: C.plum  },
              { icon: Languages, label: '9 languages',       accent: C.gold  },
              { icon: BarChart2, label: 'Live analytics',    accent: C.olive },
              { icon: Camera,    label: 'Photo moderation',  accent: C.plum  },
              { icon: Calendar,  label: 'Save the Date',     accent: C.gold  },
            ].map((pill, i) => {
              const Icon = pill.icon;
              return (
                <motion.div
                  key={pill.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.35 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '6px 13px',
                    borderRadius: '100px',
                    background: `${pill.accent}12`,
                    border: `1px solid ${pill.accent}28`,
                    fontSize: '0.8rem', fontWeight: 600,
                    color: pill.accent,
                  }}
                >
                  <Icon size={13} />
                  {pill.label}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Feature groups grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURE_GROUPS.map((group, gi) => {
            const GroupIcon = group.groupIcon;
            return (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: gi * 0.08 + 0.3, duration: 0.55 }}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${C.divider}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 4px rgba(43,30,20,0.04)',
                }}
              >
                {/* Group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '34px', height: '34px',
                    borderRadius: '9px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${group.accent}18`,
                    flexShrink: 0,
                  }}>
                    <GroupIcon size={15} color={group.accent} />
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: group.accent,
                  }}>
                    {group.title}
                  </span>
                </div>

                {/* Feature items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {group.items.map((item, ii) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: gi * 0.08 + ii * 0.05 + 0.4, duration: 0.4 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                      >
                        <div style={{
                          width: '28px', height: '28px',
                          borderRadius: '7px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `${group.accent}10`,
                          flexShrink: 0,
                        }}>
                          <ItemIcon size={13} color={group.accent} />
                        </div>
                        <span style={{ fontSize: text.sm, color: C.ink, fontWeight: 500 }}>
                          {item.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
