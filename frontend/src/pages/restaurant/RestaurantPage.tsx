import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Trash2,
  DollarSign,
  Coffee,
  CheckCircle,
  Building,
  BedDouble,
  Search,
} from 'lucide-react';
import { restaurantApi, roomsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { MenuCategory, MenuItem, RestaurantOrder, Room } from '../../types';
import { SearchSortControls } from '../../components/common/SearchSortControls';

export const RestaurantPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'room_service'>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [menuSearch, setMenuSearch] = useState('');
  const [menuSort, setMenuSort] = useState('name');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState('newest');

  // Charge to room modal state
  const [chargeOrder, setChargeOrder] = useState<RestaurantOrder | null>(null);
  const [chargeRoomId, setChargeRoomId] = useState<string>('');
  const [isChargeModalOpen, setIsChargeModalOpen] = useState<boolean>(false);

  // Queries
  const { data: categories = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['restaurant_menu'],
    queryFn: restaurantApi.getMenu,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['restaurant_tables'],
    queryFn: restaurantApi.getTables,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['restaurant_orders'],
    queryFn: () => restaurantApi.getOrders(),
    refetchInterval: 10000,
  });

  // Fetch in-house rooms for room service / room charging
  const { data: occupiedRooms = [] } = useQuery({
    queryKey: ['occupied_rooms'],
    queryFn: () => roomsApi.getRooms({ status: 'occupied' }),
  });

  const addToCart = (item: MenuItem) => {
    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      setCart(cart.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const cartTax = cartSubtotal * 0.10; // 10% F&B VAT
  const cartTotal = cartSubtotal + cartTax;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      await restaurantApi.createOrder({
        order_type: orderType,
        table_id: orderType === 'dine_in' ? selectedTableId || tables[0]?.id : undefined,
        room_id: orderType === 'room_service' ? selectedRoomId || occupiedRooms[0]?.id : undefined,
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.quantity,
        })),
        notes: orderNotes,
      });
      setCart([]);
      setOrderNotes('');
      queryClient.invalidateQueries({ queryKey: ['restaurant_orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant_tables'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to place order');
    }
  };

  const handleOpenChargeModal = (order: RestaurantOrder) => {
    setChargeOrder(order);
    setChargeRoomId(occupiedRooms[0]?.id || '');
    setIsChargeModalOpen(true);
  };

  const handleExecuteChargeToRoom = async () => {
    if (!chargeOrder || !chargeRoomId) return;
    try {
      const res = await restaurantApi.chargeToRoom(chargeOrder.id, chargeRoomId);
      setIsChargeModalOpen(false);
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ['restaurant_orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to charge order to room');
    }
  };

  const displayedCategories = (selectedCategory
    ? categories.filter((c) => c.id === selectedCategory)
    : categories).map((category) => ({
      ...category,
      menu_items: category.menu_items
        ?.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(menuSearch.toLowerCase()))
        .sort((a, b) => menuSort === 'price_high'
          ? b.price - a.price
          : menuSort === 'price_low'
            ? a.price - b.price
            : a.name.localeCompare(b.name)),
    }));
  const visibleOrders = orders.filter((order) => `${order.order_number} ${order.order_type} ${order.status} ${order.room?.room_number || ''} ${order.table?.table_number || ''} ${order.items?.map((item) => item.item_name).join(' ') || ''}`.toLowerCase().includes(orderSearch.toLowerCase())).sort((a, b) => {
    if (orderSort === 'amount') return b.total - a.total;
    if (orderSort === 'status') return a.status.localeCompare(b.status);
    if (orderSort === 'location') return `${a.room?.room_number || ''}${a.table?.table_number || ''}`.localeCompare(`${b.room?.room_number || ''}${b.table?.table_number || ''}`, undefined, { numeric: true });
    return b.order_number.localeCompare(a.order_number);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Culinary & Room Service POS"
        title="Restaurant & Beverage Point of Sale"
        description="Fine dining point-of-sale terminal with table management, kitchen order tickets, room service delivery, and direct Guest Folio charging."
      />

      {/* POS Grid: Menu & Cart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Menu Categories & Items */}
        <div className="space-y-4 lg:col-span-2">
          <SearchSortControls compact search={menuSearch} onSearchChange={setMenuSearch} sort={menuSort} onSortChange={setMenuSort} placeholder="Search menu item or description..." sortOptions={[{ value: 'name', label: 'Item name A–Z' }, { value: 'price_low', label: 'Price low to high' }, { value: 'price_high', label: 'Price high to low' }]} />
          {/* Categories Tab Selector */}
          <div className="flex flex-wrap gap-2 border-b border-hotel-line pb-3">
            <button
              onClick={() => setSelectedCategory('')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === ''
                  ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                  : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-hotel-accent text-[#14110f] shadow-[0_2px_12px_rgba(239,143,49,0.3)]'
                    : 'border border-hotel-line bg-hotel-panel text-hotel-muted hover:text-hotel-text'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="space-y-6">
            {displayedCategories.map((cat) => (
              <div key={cat.id} className="space-y-3">
                <h3 className="font-serif text-base font-semibold text-hotel-gold">
                  {cat.name}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {cat.menu_items?.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="group flex cursor-pointer items-start justify-between rounded-xl border border-hotel-line bg-hotel-panel p-3.5 hover:border-hotel-accent/50 hover:bg-white/[0.03] transition-all"
                    >
                      <div className="pr-3">
                        <h4 className="font-semibold text-xs text-hotel-text group-hover:text-hotel-accent transition-colors">
                          {item.name}
                        </h4>
                        <p className="mt-1 text-[11px] text-hotel-muted line-clamp-2">
                          {item.description}
                        </p>
                        <div className="mt-2 font-serif text-xs font-bold text-hotel-gold">
                          {item.price.toLocaleString()} BDT
                        </div>
                      </div>
                      <button className="rounded-lg border border-hotel-line bg-white/[0.04] p-1.5 text-hotel-gold group-hover:bg-hotel-accent group-hover:text-[#14110f] transition-all">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active POS Order Ticket */}
        <div className="space-y-4">
          <div className="flex flex-col rounded-2xl border border-hotel-line bg-hotel-panel p-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="border-b border-hotel-line pb-3">
              <span className="kicker">Live Order Ticket</span>
              <h3 className="font-serif text-lg font-bold text-hotel-text">Current Order</h3>
            </div>

            {/* Order Type Selector */}
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-hotel-line bg-white/[0.02] p-1 text-xs">
              {(['dine_in', 'takeaway', 'room_service'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`rounded-lg py-1.5 text-center text-[10px] font-bold capitalize transition-colors ${
                    orderType === type
                      ? 'bg-hotel-accent text-[#14110f]'
                      : 'text-hotel-muted hover:text-hotel-text'
                  }`}
                >
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Table / Room Selector based on Type */}
            {orderType === 'dine_in' && (
              <div className="mt-3">
                <label className="text-[10px] text-hotel-muted uppercase font-bold">Select Table</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-bg p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.table_number} ({t.capacity} seats - {t.location}) [{t.status}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {orderType === 'room_service' && (
              <div className="mt-3">
                <label className="text-[10px] text-hotel-muted uppercase font-bold">
                  Deliver to In-House Room
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-bg p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
                >
                  {occupiedRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} ({r.room_type?.name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cart Items List */}
            <div className="mt-4 max-h-56 divide-y divide-hotel-line overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-hotel-muted">
                  Cart is empty. Click items from the menu to add.
                </div>
              ) : (
                cart.map((c) => (
                  <div key={c.item.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <div className="font-semibold text-hotel-text">{c.item.name}</div>
                      <div className="text-[10px] text-hotel-muted">
                        {c.quantity} × {c.item.price.toLocaleString()} BDT
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-hotel-gold">
                        {(c.item.price * c.quantity).toLocaleString()} BDT
                      </span>
                      <button
                        onClick={() => removeFromCart(c.item.id)}
                        className="text-hotel-muted hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Totals */}
            <div className="mt-4 space-y-1.5 border-t border-hotel-line pt-3 text-xs">
              <div className="flex justify-between text-hotel-muted">
                <span>Subtotal:</span>
                <span>{cartSubtotal.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between text-hotel-muted">
                <span>F&B VAT (10%):</span>
                <span>{cartTax.toLocaleString()} BDT</span>
              </div>
              <div className="flex justify-between font-serif font-bold text-hotel-text text-sm border-t border-hotel-line pt-1">
                <span>Total Amount:</span>
                <span className="text-hotel-gold">{cartTotal.toLocaleString()} BDT</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={cart.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold py-2.5 text-xs font-bold text-[#14110f] shadow hover:opacity-95 disabled:opacity-40 transition-all"
            >
              <UtensilsCrossed className="h-4 w-4" />
              <span>Send Order to Kitchen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Kitchen & Dining Orders Table */}
      <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6">
        <div className="flex items-center justify-between border-b border-hotel-line pb-4">
          <div>
            <span className="kicker">Kitchen Dispatch</span>
            <h3 className="font-serif text-lg font-bold text-hotel-text">Active Orders & Bills</h3>
          </div>
        </div>

        <div className="mt-4"><SearchSortControls compact search={orderSearch} onSearchChange={setOrderSearch} sort={orderSort} onSortChange={setOrderSort} resultCount={visibleOrders.length} placeholder="Search order, item, room, table or status..." sortOptions={[{ value: 'newest', label: 'Newest order' }, { value: 'amount', label: 'Amount high to low' }, { value: 'status', label: 'Status A–Z' }, { value: 'location', label: 'Room / table' }]} /></div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hotel-line text-[11px] text-hotel-muted uppercase tracking-wider">
                <th className="pb-3 font-medium">Order #</th>
                <th className="pb-3 font-medium">Service Type</th>
                <th className="pb-3 font-medium">Location / Room</th>
                <th className="pb-3 font-medium">Ordered Items</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Total (BDT)</th>
                <th className="pb-3 font-medium text-right">Folio Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hotel-line">
              {visibleOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#f7f8f4] transition-colors">
                  <td className="py-3 font-mono font-medium text-hotel-accent">
                    {ord.order_number}
                  </td>
                  <td className="py-3 capitalize text-hotel-muted">
                    {ord.order_type.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 font-semibold text-hotel-gold">
                    {ord.order_type === 'dine_in' && ord.table && `Table ${ord.table.table_number}`}
                    {ord.order_type === 'room_service' && ord.room && `Room ${ord.room.room_number}`}
                    {ord.order_type === 'takeaway' && 'Counter Pickup'}
                  </td>
                  <td className="py-3 text-hotel-muted max-w-xs truncate">
                    {ord.items?.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={ord.status} size="sm" />
                  </td>
                  <td className="py-3 text-right font-serif font-bold text-hotel-text">
                    {ord.total.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    {ord.status !== 'charged_to_room' && ord.status !== 'paid' ? (
                      <button
                        onClick={() => handleOpenChargeModal(ord)}
                        className="rounded-lg border border-hotel-accent/40 bg-hotel-accent/10 px-2.5 py-1 text-[11px] font-bold text-hotel-accent hover:bg-hotel-accent hover:text-[#14110f] transition-all"
                      >
                        Charge to Room
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {ord.status === 'charged_to_room' ? 'Posted to Folio' : 'Paid in Cash/POS'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHARGE TO ROOM FOLIO MODAL */}
      <Modal
        isOpen={isChargeModalOpen}
        onClose={() => setIsChargeModalOpen(false)}
        title="Charge Restaurant Bill to Guest Folio"
        subtitle={chargeOrder?.order_number}
        maxWidth="md"
      >
        {chargeOrder && (
          <div className="space-y-4 text-xs">
            <p className="text-hotel-muted">
              Select an in-house guest room to post this dining check of{' '}
              <strong className="text-hotel-gold font-serif text-sm">
                {chargeOrder.total.toLocaleString()} BDT
              </strong>{' '}
              directly onto their room folio.
            </p>

            <div>
              <label className="text-hotel-muted font-medium">In-House Guest Room *</label>
              <select
                value={chargeRoomId}
                onChange={(e) => setChargeRoomId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hotel-line bg-hotel-panel p-2 text-xs text-hotel-text focus:border-hotel-accent focus:outline-none"
              >
                {occupiedRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} ({r.room_type?.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteChargeToRoom}
                className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
              >
                Confirm Folio Charge
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

