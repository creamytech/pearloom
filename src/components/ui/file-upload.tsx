'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / ui/file-upload.tsx
// Custom drag-and-drop file upload zone — replaces <input type="file">.
// Glass panel with drag state, file preview, and progress.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  onChange: (files: File[]) => void;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FileUpload({
  accept = 'image/*',
  multiple = false,
  maxSize = 10,
  onChange,
  label,
  className,
  children,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);

    const valid: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > maxSize * 1024 * 1024) {
        setError(`${file.name} exceeds ${maxSize}MB limit`);
        continue;
      }
      valid.push(file);
    }

    const next = multiple ? [...files, ...valid] : valid.slice(0, 1);
    setFiles(next);
    onChange(next);
  }, [files, maxSize, multiple, onChange]);

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    onChange(next);
  };

  return (
    <div className={className}>
      {label && (
        <span className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)] mb-1.5">
          {label}
        </span>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative rounded-[var(--pl-radius-lg)] border-2 border-dashed transition-all duration-200 cursor-pointer',
          'flex flex-col items-center justify-center text-center p-6 min-h-[120px]',
          dragging
            ? 'border-[var(--pl-olive)] bg-[rgba(163,177,138,0.08)]'
            : 'border-[var(--pl-divider)] bg-[var(--pl-cream-deep)]/40 hover:border-[var(--pl-olive)] hover:bg-[rgba(163,177,138,0.04)]',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        {children || (
          <>
            <motion.div
              animate={{ y: dragging ? -4 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-10 h-10 rounded-xl bg-[var(--pl-olive-mist)] flex items-center justify-center mb-3"
            >
              <Upload size={18} className="text-[var(--pl-olive)]" />
            </motion.div>
            <p className="text-[0.85rem] font-semibold text-[var(--pl-ink-soft)] mb-1">
              {dragging ? 'Drop files here' : 'Click or drag files'}
            </p>
            <p className="text-[0.72rem] text-[var(--pl-muted)]">
              {accept === 'image/*' ? 'PNG, JPG, WebP' : accept} — Max {maxSize}MB
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-[0.72rem] text-[var(--pl-warning)] mt-2 font-medium">{error}</p>
      )}

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 flex flex-col gap-2 overflow-hidden"
          >
            {files.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-[var(--pl-divider)]"
              >
                <div className="w-8 h-8 rounded-md bg-[var(--pl-cream-deep)] flex items-center justify-center flex-shrink-0">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon size={14} className="text-[var(--pl-olive)]" />
                  ) : (
                    <FileText size={14} className="text-[var(--pl-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.78rem] font-medium text-[var(--pl-ink)] truncate">{file.name}</p>
                  <p className="text-[0.62rem] text-[var(--pl-muted)]">
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center border-none bg-transparent cursor-pointer text-[var(--pl-muted)] hover:text-[var(--pl-warning)]"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
