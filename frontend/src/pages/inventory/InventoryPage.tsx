import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  Search,
  CheckCircle,
} from 'lucide-react';
import { inventoryApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { InventoryItem } from '../../types';

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'consumed' | 'received' | 'adjustment'>('consumed');
  const [adjustQty, setAdjustQty] = useState(5);
  const [adjustReason, setAdjustReason] = useState('Daily hotel floor consumption');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', categoryFilter, lowStockOnly],
    queryFn: () =>
      inventoryApi.getItems({
        category: categoryFilter,
        low_stock: lowStockOnly ? 'true' : undefined,
      }),
  });

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustQty(5);
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await inventoryApi.adjustStock({
        item_id: selectedItem.id,
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason,
      });
      setIsAdjustModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to adjust stock');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Central Hotel Warehousing"
        title="Inventory & Stock Management"
        description="Monitor operating supplies, housekeeping chemicals, Egyptian linens, F&B provisions, and automated reorder threshold triggers."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hotel-line pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {['', 'Linen', 'Amenities', 'Housekeeping', 'F&B', 'Maintenance'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                categoryFilter === cat
                  ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                  : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
              }`}
            >
              {cat === '' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
            lowStockOnly
              ? 'border-rose-500 bg-rose-950/60 text-rose-300'
              : 'border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <span>Low Stock Alerts Only</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="py-3.5 px-4 font-medium">SKU</th>
                <th className="py-3.5 px-4 font-medium">Item Name</th>
                <th className="py-3.5 px-4 font-medium">Department</th>
                <th className="py-3.5 px-4 font-medium">Stock Status</th>
                <th className="py-3.5 px-4 font-medium">Threshold</th>
                <th className="py-3.5 px-4 font-medium">Unit Cost</th>
                <th className="py-3.5 px-4 font-medium text-right">Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {items.map((item) => {
                const isLow = item.current_stock <= item.minimum_stock;
                return (
                  <tr key={item.id} className="hover:bg-[#f7f8f4] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-hotel-accent">
                      {item.sku}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-hotel-text">{item.name}</td>
                    <td className="py-3.5 px-4 text-hotel-muted">{item.category}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm font-bold text-hotel-gold">
                          {item.current_stock} {item.unit}
                        </span>
                        {isLow && (
                          <span className="flex items-center gap-1 rounded bg-rose-950/80 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/40">
                            <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                            <span>Low Stock</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-hotel-muted text-[11px]">
                      Min: {item.minimum_stock} • Reorder: {item.reorder_quantity}
                    </td>
                    <td className="py-3.5 px-4 font-serif text-hotel-text">
                      {item.cost_per_unit.toLocaleString()} BDT
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(item)}
                        className="rounded-lg border border-hotel-line bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-hotel-muted hover:text-hotel-text hover:bg-white/[0.08] transition-colors"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST STOCK MODAL */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Inventory Stock Movement"
        subtitle={selectedItem?.name}
        maxWidth="md"
      >
        {selectedItem && (
          <form onSubmit={handleExecuteAdjust} className="space-y-4 text-xs">
            <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-3 text-hotel-text">
              <span className="text-hotel-muted text-[10px] uppercase">Current On-Hand</span>
              <div className="font-serif text-xl font-bold text-hotel-gold">
                {selectedItem.current_stock} {selectedItem.unit}
              </div>
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Movement Type *</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                <option value="consumed">Deduct / Consumption (Floor Usage)</option>
                <option value="received">Receive Goods (Restocked)</option>
                <option value="adjustment">Physical Audit Count Adjustment</option>
              </select>
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Quantity ({selectedItem.unit}) *</label>
              <input
                required
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Reason / Allocation</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
              >
                Post Stock Movement
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

