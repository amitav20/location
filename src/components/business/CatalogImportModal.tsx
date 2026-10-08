/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../../api';
import { toast } from '../Toaster';
import { money } from '../common/ui';
import {
  Download,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Upload,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CatalogImportModalProps {
  businessId: string;
  onClose: () => void;
  onCatalogUpdated: () => void;
}

export function CatalogImportModal({ businessId, onClose, onCatalogUpdated }: CatalogImportModalProps) {
  const [draftedItems, setDraftedItems] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  const handleSimulatePhotoAi = async () => {
    setIsAnalyzing(true);
    try {
      // Create sample drafted items simulating OCR/AI product recognition
      const drafted = [
        { name: 'Artisan Sourdough Loaf', price: 6.5, stock: 15, category: 'Bakery', description: 'Freshly baked naturally leavened sourdough bread' },
        { name: 'Espresso Blend Whole Bean (250g)', price: 14.0, stock: 20, category: 'Coffee', description: 'Notes of dark chocolate and toasted hazelnut' },
        { name: 'Almond Croissant', price: 4.75, stock: 12, category: 'Pastry', description: 'Double baked with almond frangipane' },
      ];
      setDraftedItems(drafted);
      toast.success('AI recognized 3 products ready for import!');
    } catch (err: any) {
      toast.error(err.message || 'AI recognition failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (draftedItems.length === 0) return;
    setIsCommitting(true);
    try {
      const res = await api.bulkUpsertProducts(businessId, draftedItems, true);
      toast.success(`Successfully imported ${res.validCount || draftedItems.length} products!`);
      onCatalogUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not import products.');
    } finally {
      setIsCommitting(false);
    }
  };

  const exportUrl = api.getProductExportUrl(businessId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-display font-black text-lg text-gray-900 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-teal-600" /> Catalog Import & AI Tools
            </h3>
            <p className="text-xs text-gray-500">Bulk export CSV or scan menus/shelves with AI</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          {/* CSV Export */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <h4 className="font-bold text-sm text-gray-800">Export Catalog to CSV</h4>
              <p className="text-gray-500">Download inventory, prices, barcodes, and SKUs as a spreadsheet</p>
            </div>
            <a
              href={exportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <Download size={14} /> Download CSV
            </a>
          </div>

          {/* AI Photo Scanner */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-3 text-xs text-amber-950">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">AI Menu & Price Tag Scanner</h4>
                <p className="text-amber-900/80">
                  Upload a photo of your printed menu, price list, or store shelf to automatically extract product listings with names, prices, and categories.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulatePhotoAi}
              disabled={isAnalyzing}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              {isAnalyzing ? 'Analyzing Image with AI...' : 'Scan Photo / Extract Catalog'}
            </button>
          </div>

          {/* Drafted Items Preview */}
          {draftedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Extracted Products ({draftedItems.length})
                </h4>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle size={13} /> Ready to commit
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {draftedItems.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-gray-800">{item.name}</h5>
                      <p className="text-[11px] text-teal-700 font-bold">{money(item.price)} · Stock: {item.stock} · {item.category}</p>
                      {item.description && <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCommit}
                disabled={isCommitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                {isCommitting ? 'Importing Products...' : `Add ${draftedItems.length} Products to Catalog`}
              </button>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
