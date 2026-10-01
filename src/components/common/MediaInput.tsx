/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import { api, MediaKind, UploadResult } from '../../api';
import { toast } from '../Toaster';

interface MediaInputProps {
  value: string;
  onChange: (url: string, kind?: MediaKind) => void;
  /** Which file types the picker offers */
  accept?: MediaKind[];
  /**
   * Also allow pasting a link. Only profile photos and covers accept links; posts, stories, events,
   * shops and products need a file uploaded to our server.
   */
  allowLinks?: boolean;
  placeholder?: string;
  /** Tailwind classes for the link input so it matches the surrounding form */
  inputClassName?: string;
  showPreview?: boolean;
}

const ACCEPT_ATTR: Record<MediaKind, string> = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/*'
};

const LABEL: Record<MediaKind, string> = { image: 'photo', video: 'video', audio: 'audio file' };

/** Upload a file from the device (and, where allowed, paste a link instead). */
export function MediaInput({
  value,
  onChange,
  accept = ['image'],
  allowLinks = false,
  placeholder = 'Paste an image link',
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
  const what = accept.map((k) => LABEL[k]).join(' or ');

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {allowLinks ? (
          <input
            type="url"
            value={value}
            onChange={(e) => {
              setKind(undefined);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            className={`flex-1 min-w-0 ${inputClassName}`}
          />
        ) : null}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className={`${allowLinks ? 'shrink-0 px-3' : 'flex-1 py-2.5'} rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5`}
        >
          {allowLinks ? <Upload size={14} /> : <ImagePlus size={15} />}
          {isUploading ? 'Uploading...' : allowLinks ? 'Upload' : value ? `Change ${what}` : `Upload a ${what}`}
        </button>
        <input ref={fileRef} type="file" accept={accept.map((k) => ACCEPT_ATTR[k]).join(',')} onChange={handleFile} className="hidden" />
      </div>

      {showPreview && value && accept.some((k) => k !== 'audio') && (
        <div className="relative inline-block">
          {looksLikeVideo ? (
            <video src={value} className="h-24 rounded-xl bg-black" muted controls />
          ) : (
            <img src={value} alt="" className="h-24 rounded-xl object-cover bg-gray-100" referrerPolicy="no-referrer" />
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
