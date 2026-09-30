/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { api, UploadResult } from '../../api';
import { toast } from '../Toaster';

type MediaKind = 'image' | 'video' | 'audio';

interface MediaInputProps {
  value: string;
  onChange: (url: string, kind?: MediaKind) => void;
  /** Which file types the picker offers */
  accept?: MediaKind[];
  placeholder?: string;
  /** Tailwind classes for the text input so it matches the surrounding form */
  inputClassName?: string;
  showPreview?: boolean;
}

const ACCEPT_ATTR: Record<MediaKind, string> = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/*'
};

/** Paste a link or upload a file from the device (#28). */
export function MediaInput({
  value,
  onChange,
  accept = ['image'],
  placeholder = 'Paste a link or upload a file',
  inputClassName = 'w-full text-xs rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-teal-500',
  showPreview = true
}: MediaInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [kind, setKind] = useState<MediaKind | undefined>();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploading(true);
    try {
      const result: UploadResult = await api.uploadFile(file);
      setKind(result.kind);
      onChange(result.url, result.kind);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const looksLikeVideo = kind === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setKind(undefined);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className={`flex-1 min-w-0 ${inputClassName}`}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="shrink-0 px-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Upload size={14} />
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept.map((k) => ACCEPT_ATTR[k]).join(',')}
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {showPreview && value && accept.some((k) => k !== 'audio') && (
        <div className="relative inline-block">
          {looksLikeVideo ? (
            <video src={value} className="h-20 rounded-xl bg-black" muted />
          ) : (
            <img src={value} alt="" className="h-20 rounded-xl object-cover bg-gray-100" referrerPolicy="no-referrer" />
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-500 hover:text-red-600"
            aria-label="Remove"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
