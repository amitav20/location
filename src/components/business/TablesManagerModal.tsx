/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { toast, confirmAction } from '../Toaster';
import { ShopTable } from '../../types';
import {
  Coffee,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  Trash2,
  Utensils,
  X,
  ExternalLink
} from 'lucide-react';

interface TablesManagerModalProps {
  businessId: string;
  onClose: () => void;
}

export function TablesManagerModal({ businessId, onClose }: TablesManagerModalProps) {
  const [tables, setTables] = useState<ShopTable[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [label, setLabel] = useState<string>('');
  const [type, setType] = useState<'table' | 'counter'>('table');
  const [filterType, setFilterType] = useState<'all' | 'table' | 'counter'>('all');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const list = await api.getShopTables(businessId);
      setTables(list);
    } catch (err: any) {
      toast.error(err.message || 'Could not load tables.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [businessId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error('Please enter a table or counter name.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.createShopTable(businessId, { label: label.trim(), type });
      toast.success('Table created with QR code!');
      setLabel('');
      setShowAddForm(false);
      fetchTables();
    } catch (err: any) {
      toast.error(err.message || 'Could not create table.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateCode = async (table: ShopTable) => {
    try {
      await api.updateShopTable(businessId, table.id, { newCode: true });
      toast.success('QR code regenerated.');
      fetchTables();
    } catch (err: any) {
      toast.error(err.message || 'Could not regenerate code.');
    }
  };

  const handleDelete = async (table: ShopTable) => {
    if (!(await confirmAction(`Delete ${table.label}? Existing QR stickers will no longer work.`, 'Delete'))) {
      return;
    }
    try {
      await api.deleteShopTable(businessId, table.id);
      toast.success('Table deleted.');
      setTables((prev) => prev.filter((t) => t.id !== table.id));
    } catch (err: any) {
      toast.error(err.message || 'Could not delete table.');
    }
  };

  const filteredTables = tables.filter((t) => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <QrCode size={18} className="text-teal-600" /> Tables & QR Codes
            </h3>
            <p className="text-xs text-gray-500">Self-ordering QR codes for dine-in tables and pickup counters</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              {(['all', 'table', 'counter'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all ${
                    filterType === tab ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'table' ? 'Tables' : 'Counters'}
                </button>
              ))}
            </div>

            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus size={14} /> Add Table / Counter
              </button>
            )}
          </div>

          {/* Add Table Form */}
          {showAddForm && (
            <form onSubmit={handleCreate} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <h5 className="font-bold text-xs uppercase tracking-wider text-gray-700">New Table or Counter</h5>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Label / Number</label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Table 14, Booth B, Counter 2"
                    className="w-full text-xs rounded-xl bg-white border border-gray-200 p-2.5 outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('table')}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        type === 'table' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      <Utensils size={14} /> Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('counter')}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        type === 'counter' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      <Coffee size={14} /> Counter
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {isSubmitting ? 'Creating...' : 'Create Table with QR Code'}
              </button>
            </form>
          )}

          {/* List */}
          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading tables...</div>
          ) : filteredTables.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No tables found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTables.map((t) => (
                <div key={t.id} className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between gap-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        {t.type === 'counter' ? <Coffee size={18} /> : <Utensils size={18} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">{t.label}</h4>
                        <span className="text-[11px] font-mono text-gray-500">Code: {t.code}</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-600">
                      {t.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                    <a
                      href={t.qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      <QrCode size={13} /> View QR <ExternalLink size={11} />
                    </a>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRegenerateCode(t)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200/50"
                        title="Regenerate QR Code"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete table"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
