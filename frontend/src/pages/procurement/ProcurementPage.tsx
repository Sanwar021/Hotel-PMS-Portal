import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  CheckCircle,
  FileText,
  DollarSign,
  Building,
} from 'lucide-react';
import { inventoryApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { PurchaseOrder, Supplier } from '../../types';

export const ProcurementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);

  // New PO form
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItemName, setPoItemName] = useState('Nespresso Coffee Capsules Box');
  const [poQty, setPoQty] = useState(50);
  const [poUnitPrice, setPoUnitPrice] = useState(850);

  const { data: purchaseOrders = [], isLoading: loadingPOs } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: inventoryApi.getPurchaseOrders,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: inventoryApi.getSuppliers,
  });

  const handleApprovePO = async (poId: string) => {
    try {
      await inventoryApi.approvePO(poId);
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve PO');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventoryApi.createPO({
        supplier_id: poSupplierId || suppliers[0]?.id,
        items: [
          {
            item_name: poItemName,
            quantity: Number(poQty),
            unit_price: Number(poUnitPrice),
          },
        ],
      });
      setIsNewPOModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create PO');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Supply Chain & Vendors"
        title="Procurement & Purchase Orders"
        description="Vendor relationships, automated purchase requisitions, approval workflows, and receiving logistics."
        actions={
          <button
            onClick={() => setIsNewPOModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 text-xs font-bold text-[#14110f] shadow hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            <span>Create Purchase Order</span>
          </button>
        }
      />

      {/* PO Master Table */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line bg-white/[0.02] text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="py-3.5 px-4 font-medium">PO Number</th>
                <th className="py-3.5 px-4 font-medium">Vendor</th>
                <th className="py-3.5 px-4 font-medium">Line Items</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium text-right">Total Amount</th>
                <th className="py-3.5 px-4 font-medium text-right">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-[#f7f8f4] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-hotel-accent">
                    {po.po_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-hotel-text">{po.supplier?.name}</div>
                    <div className="text-[10px] text-hotel-muted">{po.supplier?.contact_person}</div>
                  </td>
                  <td className="py-3.5 px-4 text-hotel-muted">
                    {po.items?.map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ') || 'Restock items'}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={po.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right font-serif font-bold text-hotel-gold">
                    {po.total_amount.toLocaleString()} BDT
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {po.status === 'draft' ? (
                      <button
                        onClick={() => handleApprovePO(po.id)}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                      >
                        Approve PO
                      </button>
                    ) : (
                      <span className="text-[10px] text-hotel-muted">Approved & Dispatched</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PO MODAL */}
      <Modal
        isOpen={isNewPOModalOpen}
        onClose={() => setIsNewPOModalOpen(false)}
        title="Draft Purchase Order"
        subtitle="Procurement Department"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
          <div>
            <label className="text-hotel-muted font-medium">Select Approved Vendor *</label>
            <select
              value={poSupplierId}
              onChange={(e) => setPoSupplierId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contact_person})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-hotel-muted font-medium">Product Description *</label>
            <input
              required
              type="text"
              value={poItemName}
              onChange={(e) => setPoItemName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-hotel-muted font-medium">Quantity *</label>
              <input
                required
                type="number"
                min="1"
                value={poQty}
                onChange={(e) => setPoQty(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-hotel-muted font-medium">Unit Price (BDT) *</label>
              <input
                required
                type="number"
                min="1"
                value={poUnitPrice}
                onChange={(e) => setPoUnitPrice(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-white/[0.04] p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-hotel-line bg-white/[0.02] p-3 text-right">
            <span className="text-[10px] text-hotel-muted uppercase font-bold">Estimated Total</span>
            <div className="font-serif text-lg font-bold text-hotel-gold">
              {(poQty * poUnitPrice).toLocaleString()} BDT
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
            <button
              type="button"
              onClick={() => setIsNewPOModalOpen(false)}
              className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
            >
              Submit Purchase Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

