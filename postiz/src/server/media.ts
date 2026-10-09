import { promises as fs } from 'fs';
import path from 'path';
import { uploadsDir } from './storage';

export interface MediaRef {
  path: string;
  type: 'image' | 'video';
  name: string;
}

export interface LoadedMedia {
  buffer: Buffer;
  mime: string;
  filename: string;
  type: 'image' | 'video';
}

const mimeFromName = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    default:
      return 'image/jpeg';
  }
};

// Reads a media file of a post: an upload, a data url or a remote url
export const loadMedia = async (media: MediaRef): Promise<LoadedMedia> => {
  if (media.path.startsWith('/api/uploads/')) {
    const name = path.basename(media.path);
    const buffer = await fs.readFile(path.join(uploadsDir, name));
    return { buffer, mime: mimeFromName(name), filename: name, type: media.type };
  }
  if (media.path.startsWith('data:')) {
    const [meta, data] = media.path.split(',');
    const mime = meta.slice(5).split(';')[0] || 'image/jpeg';
    const buffer = meta.includes(';base64') ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data));
    const ext = mime.split('/')[1]?.replace('svg+xml', 'svg') || 'jpg';
    return { buffer, mime, filename: `${media.name || 'image'}.${ext}`.replace(/\.(\w+)\.\1$/, '.$1'), type: media.type };
  }
  if (/^https?:\/\//.test(media.path)) {
    const res = await fetch(media.path);
    if (!res.ok) throw new Error(`Could not download ${media.path}`);
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return { buffer: Buffer.from(await res.arrayBuffer()), mime, filename: media.name || 'file', type: media.type };
  }
  throw new Error(`This media can't be published (${media.name}). Upload it again from the media library.`);
};
