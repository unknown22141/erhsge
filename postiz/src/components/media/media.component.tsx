'use client';

import clsx from 'clsx';
import { FC, useCallback, useMemo, useRef, useState } from 'react';
import { useDb } from '@/lib/db';
import { MediaItem } from '@/lib/types';
import { DeleteCircleIcon, NoMediaIcon } from '@/components/ui/icons';
import { deleteDialog, openModal, useModals } from '@/components/ui/modal';
import { useToaster } from '@/components/ui/toaster';

const uploadBlob = async (blob: Blob, name: string) => {
  const form = new FormData();
  form.append('file', blob, name);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).path as string;
};

// Uploads a file to the local server; big pictures are scaled down first
export const readMediaFile = async (file: File): Promise<{ path: string; type: 'image' | 'video' }> => {
  if (file.type.startsWith('video/')) {
    return { path: await uploadBlob(file, file.name), type: 'video' };
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Unsupported file');
  }
  if (file.type === 'image/gif' || file.size < 900 * 1024) {
    return { path: await uploadBlob(file, file.name), type: 'image' };
  }
  const blob = await new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 2048;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read image'))), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = URL.createObjectURL(file);
  });
  return { path: await uploadBlob(blob, file.name.replace(/\.[^.]+$/, '') + '.jpg'), type: 'image' };
};

const PAGE_SIZE = 18;

export const MediaPreview: FC<{ media: MediaItem; className?: string }> = ({ media, className }) =>
  media.type === 'video' ? (
    <video src={media.path} className={clsx('w-full h-full object-cover', className)} muted loop autoPlay playsInline />
  ) : (
    <img src={media.path} className={clsx('w-full h-full object-cover', className)} alt={media.name} />
  );

export const MediaBox: FC<{
  standalone?: boolean;
  onSelect?: (media: MediaItem[]) => void;
  onClose?: () => void;
  type?: 'image' | 'video';
}> = ({ standalone, onSelect, onClose, type }) => {
  const media = useDb((s) => s.media);
  const addMedia = useDb((s) => s.addMedia);
  const deleteMedia = useDb((s) => s.deleteMedia);
  const toaster = useToaster();
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      media
        .filter((m) => !type || m.type === type)
        .filter((m) => m.name.toLowerCase().includes(search.toLowerCase())),
    [media, search, type]
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setLoading(true);
      let added = 0;
      for (const file of Array.from(files)) {
        try {
          const { path, type } = await readMediaFile(file);
          addMedia({ name: file.name, path, type });
          added++;
        } catch {
          toaster.show(`Could not upload ${file.name}`, 'warning');
        }
      }
      setLoading(false);
      setPage(0);
      if (added) toaster.show(`${added} file${added > 1 ? 's' : ''} uploaded`, 'success');
    },
    [addMedia, toaster]
  );

  const toggle = (item: MediaItem) => () => {
    if (standalone) {
      openModal({
        title: item.name,
        closeOnClickOutside: true,
        size: '80%',
        children: (
          <div className="w-full flex justify-center">
            {item.type === 'video' ? (
              <video src={item.path} controls autoPlay className="max-h-[70vh] rounded-[12px]" />
            ) : (
              <img src={item.path} className="max-h-[70vh] rounded-[12px]" alt="" />
            )}
          </div>
        ),
      });
      return;
    }
    setSelected((list) =>
      list.find((p) => p.id === item.id) ? list.filter((p) => p.id !== item.id) : [...list, item]
    );
  };

  const remove = (item: MediaItem) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await deleteDialog('Are you sure you want to delete the image?')) {
      deleteMedia(item.id);
      toaster.show('Media deleted', 'success');
    }
  };

  const btn = (
    <button
      onClick={() => fileRef.current?.click()}
      className="relative cursor-pointer bg-btnPrimary text-white flex gap-[8px] h-[44px] px-[18px] justify-center items-center rounded-[8px] transition-transform active:scale-95"
    >
      {loading && (
        <div className="absolute left-[50%] top-[50%] -translate-y-[50%] -translate-x-[50%]">
          <div className="animate-spin h-[20px] w-[20px] border-4 border-white border-t-transparent rounded-full" />
        </div>
      )}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={clsx(loading && 'invisible')}>
        <path d="M10 13.3333V3.33333M10 3.33333L6.66667 6.66667M10 3.33333L13.3333 6.66667M3.33333 13.3333V14.6667C3.33333 15.7712 4.22876 16.6667 5.33333 16.6667H14.6667C15.7712 16.6667 16.6667 15.7712 16.6667 14.6667V13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className={loading ? 'invisible' : undefined}>Upload</div>
    </button>
  );

  return (
    <div
      className="flex flex-col flex-1 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/70 z-[300] rounded-[12px] transition-all items-center justify-center flex text-white text-[16px] border-2 border-dashed border-[#612BD3]',
          dragging ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        Drop your files here to upload
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="flex flex-col flex-1">
        <div className="flex gap-[8px] mb-[16px] mobile:flex-wrap">
          <div className="flex-1 mobile:basis-full">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search media"
              className="w-full h-[44px] px-[14px] rounded-[8px] bg-newBgColorInner border border-newColColor text-[14px] outline-none focus:border-[#612BD3] transition-colors"
            />
          </div>
          {!!filtered.length && <div className="flex gap-[8px]">{btn}</div>}
        </div>
        <div
          className={clsx(
            'flex-1 relative min-h-[300px]',
            !visible.length && 'bg-newTextColor/[0.02] rounded-[12px]'
          )}
        >
          <div
            className={clsx(
              'absolute -left-[3px] -top-[3px] withp3 h-full overflow-x-hidden overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner',
              !visible.length && 'flex justify-center items-center gap-[20px] flex-col'
            )}
          >
            {!visible.length && (
              <>
                <NoMediaIcon />
                <div className="text-[20px] font-[600]">
                  {search ? 'No media matches your search' : "You don't have any media yet"}
                </div>
                <div className="whitespace-pre-line text-newTextColor/[0.6] text-center">
                  {'Select or upload pictures (maximum 1 GB per upload).\nYou can also drag & drop pictures.'}
                </div>
                <div className="flex gap-[8px]">{btn}</div>
              </>
            )}
            {visible.map((item, index) => {
              const selectedIndex = selected.findIndex((p) => p.id === item.id);
              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${index * 25}ms` }}
                  className="group px-[3px] py-[3px] float-left rounded-[6px] w8-max mobile:!w-1/2 mobile:!max-w-[50%] aspect-square cursor-pointer opacity-0 animate-fadeIn"
                >
                  <div
                    className={clsx(
                      'w-full h-full rounded-[6px] border-[4px] relative transition-colors',
                      selectedIndex > -1 ? 'border-[#612BD3]' : 'border-transparent'
                    )}
                    onClick={toggle(item)}
                  >
                    {selectedIndex > -1 ? (
                      <div className="text-white flex z-[101] justify-center items-center text-[14px] font-[500] w-[24px] h-[24px] rounded-full bg-[#612BD3] absolute -bottom-[10px] -end-[10px] animate-scaleIn">
                        {selectedIndex + 1}
                      </div>
                    ) : (
                      <DeleteCircleIcon
                        className="cursor-pointer hidden z-[100] group-hover:block absolute -top-[5px] -end-[5px]"
                        onClick={remove(item)}
                      />
                    )}
                    <div className="absolute bottom-[10px] start-[10px] end-[10px] z-[100] truncate text-end text-white text-[12px] drop-shadow opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.name}
                    </div>
                    <div className="w-full h-full rounded-[6px] overflow-hidden relative">
                      <MediaPreview media={item} className="transition-transform duration-300 group-hover:scale-105" />
                      {item.type === 'video' && (
                        <div className="absolute top-[6px] start-[6px] bg-black/60 rounded-[4px] px-[6px] text-[11px] text-white">
                          VIDEO
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {pages > 1 && (
          <div className="flex items-center gap-[4px] justify-center mt-[15px] text-[14px]">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="h-[40px] px-[16px] rounded-[8px] hover:bg-boxHover disabled:opacity-30"
            >
              Previous
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={clsx(
                  'h-[40px] w-[40px] rounded-[8px]',
                  i === page ? 'bg-[#612BD3] text-white' : 'hover:bg-boxHover'
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
              className="h-[40px] px-[16px] rounded-[8px] hover:bg-boxHover disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
        {!standalone && (
          <div className="flex justify-end mt-[32px] gap-[8px]">
            <button
              onClick={onClose}
              className="cursor-pointer h-[52px] px-[20px] items-center justify-center border border-newTextColor/10 flex rounded-[10px]"
            >
              Cancel
            </button>
            {!!filtered.length && (
              <button
                onClick={() => onSelect?.(selected)}
                disabled={selected.length === 0}
                className="cursor-pointer text-white disabled:opacity-80 disabled:cursor-not-allowed h-[52px] px-[20px] items-center justify-center bg-[#612BD3] flex rounded-[10px]"
              >
                Add selected media{selected.length ? ` (${selected.length})` : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const useMediaLibrary = () => {
  const modals = useModals();
  return useCallback(
    (onSelect: (media: MediaItem[]) => void) => {
      const id = modals.openModal({
        title: 'Media Library',
        closeOnClickOutside: true,
        size: 'min(1100px, 95vw)',
        children: (close) => (
          <div className="flex flex-col h-[70vh]">
            <MediaBox
              onClose={close}
              onSelect={(media) => {
                onSelect(media);
                close();
              }}
            />
          </div>
        ),
      });
      return id;
    },
    [modals]
  );
};
