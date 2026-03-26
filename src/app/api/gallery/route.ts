// ─────────────────────────────────────────────────────────────
// everglow / api/gallery/route.ts — Guest photo gallery
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getGalleryPhotos, addGalleryPhoto } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { GalleryPhoto } from '@/types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET() {
  const photos = await getGalleryPhotos();
  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = (formData.get('uploadedBy') as string) || 'guest';
    const caption = formData.get('caption') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images are allowed.' }, { status: 400 });
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Save file
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const photo: GalleryPhoto = {
      id: `photo-${Date.now()}`,
      url: `/uploads/${filename}`,
      thumbnailUrl: `/uploads/${filename}`,
      uploadedBy,
      caption: caption || undefined,
      width: 0,
      height: 0,
      uploadedAt: new Date().toISOString(),
    };

    await addGalleryPhoto(photo);

    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload photo.' }, { status: 500 });
  }
}
