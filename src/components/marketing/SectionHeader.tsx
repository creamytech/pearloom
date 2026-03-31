'use client';

import { motion } from 'framer-motion';
import { colors, text } from '@/lib/design-tokens';
import { Pill } from '@/components/ui/Pill';

interface SectionHeaderProps {
  eyebrow?: string;
  eyebrowColor?: string;
  pill?: { label: string; sparkle?: boolean; variant?: 'olive' | 'plum' | 'dark' };
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  inView?: boolean;
  dark?: boolean;
  watermark?: string;
}

export function SectionHeader({
  eyebrow,
  eyebrowColor,
  pill,
  title,
  subtitle,
  inView = true,
  dark = false,
  watermark,
}: SectionHeaderProps) {
  const headingColor = dark ? colors.darkHeading : colors.ink;
  const subtitleColor = dark ? colors.darkText : colors.muted;

  return (
    <div className="text-center relative" style={{ marginBottom: '3rem' }}>
      {watermark && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--eg-font-heading)] font-bold select-none pointer-events-none"
          style={{ fontSize: 'clamp(5rem, 12vw, 10rem)', color: dark ? 'rgba(255,255,255,0.03)' : `${colors.ink}06`, lineHeight: 1 }}
        >
          {watermark}
        </div>
      )}

      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="mb-4"
        >
          <span
            style={{
              fontSize: text.xs,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: eyebrowColor || colors.olive,
            }}
          >
            {eyebrow}
          </span>
        </motion.div>
      )}

      {pill && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="mb-4 flex justify-center"
        >
          <Pill variant={pill.variant} sparkle={pill.sparkle}>
            {pill.label}
          </Pill>
        </motion.div>
      )}

      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1 }}
        className="font-[family-name:var(--eg-font-heading)] font-bold tracking-[-0.03em] leading-tight mb-3 relative"
        style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: headingColor }}
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="mx-auto relative"
          style={{ fontSize: '1rem', color: subtitleColor, lineHeight: 1.75, maxWidth: '520px' }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
