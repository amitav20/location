/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast, confirmAction } from '../Toaster';
import { Spinner, Avatar } from '../common/ui';
import {
  BadgeCheck,
  Check,
  CornerDownRight,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  X
} from 'lucide-react';
import type { Review } from '../../types';

interface ReviewsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
}

export function ReviewsManagerModal({
  isOpen,
  onClose,
  businessId,
  businessName
}: ReviewsManagerModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getReviews(businessId);
      setReviews(data);
    } catch (err: any) {
      toast.error('Failed to load reviews: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && businessId) {
      fetchReviews();
    }
  }, [isOpen, businessId]);

  const handleGenerateAiReply = async (reviewId: string, tone: 'professional' | 'warm' | 'apologetic' = 'warm') => {
    setGeneratingAi(true);
    try {
      const draft = await api.suggestReviewReply(reviewId, tone);
      setReplyText(draft);
      toast.success('AI drafted a ' + tone + ' response!');
    } catch (err: any) {
      toast.error('AI Suggestion failed: ' + (err.message || 'Error'));
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await api.replyToReview(reviewId, replyText.trim());
      toast.success('Reply published!');
      setActiveReplyId(null);
      setReplyText('');
      fetchReviews();
    } catch (err: any) {
      toast.error('Failed to submit reply: ' + (err.message || 'Error'));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    const ok = await confirmAction('Delete store reply?');
    if (!ok) return;
    try {
      await api.deleteReviewReply(reviewId);
      toast.success('Reply deleted');
      fetchReviews();
    } catch (err: any) {
      toast.error('Failed to delete: ' + (err.message || 'Error'));
    }
  };

  const handleDispute = async (reviewId: string) => {
    const reason = window.prompt('Reason for disputing this review (fraud, harassment, competitor spam):');
    if (!reason || !reason.trim()) return;

    try {
      await api.disputeReview(reviewId, reason.trim());
      toast.success('Review submitted to moderators for audit.');
    } catch (err: any) {
      toast.error('Failed to dispute: ' + (err.message || 'Error'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Reviews & AI Reply Assistant</h2>
              <p className="text-xs text-white/80">{businessName} • Customer Ratings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Spinner className="w-8 h-8 text-teal-600" />
              <p className="text-sm">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No customer reviews submitted yet.</p>
            </div>
          ) : (
            reviews.map((r) => {
              const isReplying = activeReplyId === r.id;

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={r.userPhoto} name={r.userName} className="w-10 h-10" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {r.userName}
                          </span>
                          {r.isVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <BadgeCheck className="w-3 h-3" /> Verified Buyer
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= r.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-slate-400 ml-1.5">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDispute(r.id)}
                      title="Dispute Review"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>

                  {r.comment && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 pl-13">
                      "{r.comment}"
                    </p>
                  )}

                  {/* Existing Reply */}
                  {r.reply && (
                    <div className="ml-8 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                          <CornerDownRight className="w-3.5 h-3.5" /> Response from {businessName}:
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {r.reply.body}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteReply(r.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete reply"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Reply Form */}
                  {!r.reply && (
                    <div className="pt-2">
                      {!isReplying ? (
                        <button
                          onClick={() => {
                            setActiveReplyId(r.id);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 text-xs font-semibold hover:bg-teal-100 flex items-center gap-1.5 transition-colors"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" /> Reply to Review
                        </button>
                      ) : (
                        <div className="space-y-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Craft Store Response
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">AI Assist:</span>
                              <button
                                onClick={() => handleGenerateAiReply(r.id, 'warm')}
                                disabled={generatingAi}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" /> Warm
                              </button>
                              <button
                                onClick={() => handleGenerateAiReply(r.id, 'professional')}
                                disabled={generatingAi}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" /> Professional
                              </button>
                              <button
                                onClick={() => handleGenerateAiReply(r.id, 'apologetic')}
                                disabled={generatingAi}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" /> Apologetic
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type public response or click an AI button above..."
                            rows={3}
                            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setActiveReplyId(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSendReply(r.id)}
                              disabled={submittingReply || !replyText.trim()}
                              className="px-4 py-1 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {submittingReply ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              Post Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-medium text-sm hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
