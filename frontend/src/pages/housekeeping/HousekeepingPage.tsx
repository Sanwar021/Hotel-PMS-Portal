import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
  Square,
  ArrowRight,
  User,
} from 'lucide-react';
import { housekeepingApi, roomsApi } from '../../api/endpoints';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { HousekeepingTask, RoomStatus } from '../../types';

export const HousekeepingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<{ item: string; done: boolean }[]>([]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['housekeeping'],
    queryFn: () => housekeepingApi.getTasks(),
  });

  const handleOpenChecklist = (task: HousekeepingTask) => {
    setSelectedTask(task);
    try {
      setChecklistItems(JSON.parse(task.checklist || '[]'));
    } catch {
      setChecklistItems([
        { item: 'Strip and replace bed linens', done: false },
        { item: 'Sanitize bathroom and replace towels', done: false },
        { item: 'Restock mini bar and amenities', done: false },
        { item: 'Vacuum carpet and mop tiles', done: false },
      ]);
    }
    setIsChecklistModalOpen(true);
  };

  const toggleChecklistItem = (idx: number) => {
    const next = [...checklistItems];
    next[idx].done = !next[idx].done;
    setChecklistItems(next);
  };

  const handleAdvanceStatus = async (task: HousekeepingTask, nextStatus: RoomStatus) => {
    try {
      await housekeepingApi.updateStatus(task.id, {
        status: nextStatus,
        checklist: JSON.stringify(checklistItems),
      });
      setIsChecklistModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update task status');
    }
  };

  // Group tasks by status columns
  const dirtyTasks = tasks.filter((t) => t.status === 'dirty');
  const cleaningTasks = tasks.filter((t) => t.status === 'cleaning');
  const inspectedTasks = tasks.filter((t) => t.status === 'inspected');
  const cleanTasks = tasks.filter((t) => t.status === 'available' || t.status === ('clean' as any));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Facility Sanitation & Turnover"
        title="Housekeeping Workflow"
        description="Manage live room turnovers, supervise cleaning checklists, and release clean rooms to the Front Desk inventory in real time."
      />

      {/* 4-Stage Kanban Board */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Stage 1: Dirty / Needs Turnover */}
        <div className="flex flex-col rounded-2xl border border-hotel-line bg-hotel-panel p-4">
          <div className="flex items-center justify-between border-b border-hotel-line pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <h3 className="font-serif text-sm font-bold text-hotel-text">Dirty (Turnover)</h3>
            </div>
            <span className="rounded-full bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {dirtyTasks.length}
            </span>
          </div>

          <div className="mt-3 flex-1 space-y-3">
            {dirtyTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-hotel-line bg-white/[0.02] p-3.5 hover:border-amber-400/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="font-serif text-lg font-bold text-hotel-text">
                    Room {task.room?.room_number}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      task.priority === 'urgent'
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        : 'bg-white/5 text-hotel-muted'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-hotel-muted capitalize">
                  {task.task_type.replace(/_/g, ' ')}
                </div>
                <p className="mt-2 text-[10px] text-hotel-muted line-clamp-2">{task.notes}</p>

                <div className="mt-3 flex items-center justify-between border-t border-hotel-line pt-2">
                  <button
                    onClick={() => handleOpenChecklist(task)}
                    className="text-[11px] text-hotel-gold hover:underline"
                  >
                    Checklist
                  </button>
                  <button
                    onClick={() => handleAdvanceStatus(task, 'cleaning')}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-[#14110f] hover:bg-amber-400 transition-colors"
                  >
                    <span>Start Cleaning</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 2: Cleaning In-Progress */}
        <div className="flex flex-col rounded-2xl border border-hotel-line bg-hotel-panel p-4">
          <div className="flex items-center justify-between border-b border-hotel-line pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse" />
              <h3 className="font-serif text-sm font-bold text-hotel-text">Cleaning In Progress</h3>
            </div>
            <span className="rounded-full bg-yellow-950/60 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
              {cleaningTasks.length}
            </span>
          </div>

          <div className="mt-3 flex-1 space-y-3">
            {cleaningTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-hotel-line bg-white/[0.02] p-3.5 hover:border-yellow-400/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="font-serif text-lg font-bold text-hotel-text">
                    Room {task.room?.room_number}
                  </span>
                  <span className="text-[10px] text-hotel-gold font-medium">In Progress</span>
                </div>
                <div className="mt-1 text-[11px] text-hotel-muted capitalize">
                  {task.task_type.replace(/_/g, ' ')}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-hotel-line pt-2">
                  <button
                    onClick={() => handleOpenChecklist(task)}
                    className="text-[11px] text-hotel-gold hover:underline"
                  >
                    Checklist
                  </button>
                  <button
                    onClick={() => handleAdvanceStatus(task, 'inspected')}
                    className="inline-flex items-center gap-1 rounded-md bg-yellow-500 px-2.5 py-1 text-[10px] font-bold text-[#14110f] hover:bg-yellow-400 transition-colors"
                  >
                    <span>Submit for Inspection</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 3: Supervisor Inspection */}
        <div className="flex flex-col rounded-2xl border border-hotel-line bg-hotel-panel p-4">
          <div className="flex items-center justify-between border-b border-hotel-line pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
              <h3 className="font-serif text-sm font-bold text-hotel-text">Supervisor Inspection</h3>
            </div>
            <span className="rounded-full bg-teal-950/60 px-2 py-0.5 text-[10px] font-bold text-teal-300">
              {inspectedTasks.length}
            </span>
          </div>

          <div className="mt-3 flex-1 space-y-3">
            {inspectedTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-hotel-line bg-white/[0.02] p-3.5 hover:border-teal-400/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="font-serif text-lg font-bold text-hotel-text">
                    Room {task.room?.room_number}
                  </span>
                  <span className="text-[10px] text-teal-400 font-medium">Ready for Audit</span>
                </div>
                <div className="mt-1 text-[11px] text-hotel-muted capitalize">
                  {task.task_type.replace(/_/g, ' ')}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-hotel-line pt-2">
                  <button
                    onClick={() => handleOpenChecklist(task)}
                    className="text-[11px] text-hotel-gold hover:underline"
                  >
                    Checklist
                  </button>
                  <button
                    onClick={() => handleAdvanceStatus(task, 'available')}
                    className="inline-flex items-center gap-1 rounded-md bg-teal-500 px-2.5 py-1 text-[10px] font-bold text-[#14110f] hover:bg-teal-400 transition-colors"
                  >
                    <span>Approve & Release</span>
                    <CheckCircle2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 4: Clean & Ready (Available) */}
        <div className="flex flex-col rounded-2xl border border-hotel-line bg-hotel-panel p-4">
          <div className="flex items-center justify-between border-b border-hotel-line pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-serif text-sm font-bold text-hotel-text">Clean & Available</h3>
            </div>
            <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              {cleanTasks.length}
            </span>
          </div>

          <div className="mt-3 flex-1 space-y-3">
            {cleanTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-lg font-bold text-emerald-300">
                    Room {task.room?.room_number}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1">
                  Passed inspection • Released to Front Desk
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHECKLIST MODAL */}
      <Modal
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        title="Sanitation & Turnover Checklist"
        subtitle={`Room ${selectedTask?.room?.room_number}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="divide-y divide-hotel-line rounded-xl border border-hotel-line bg-white/[0.02]">
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => toggleChecklistItem(idx)}
                className="flex cursor-pointer items-center gap-3 p-3 hover:bg-[#f2f5f1] transition-colors"
              >
                {item.done ? (
                  <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-hotel-muted shrink-0" />
                )}
                <span className={item.done ? 'line-through text-hotel-muted' : 'text-hotel-text font-medium'}>
                  {item.item}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-hotel-line">
            <button
              onClick={() => setIsChecklistModalOpen(false)}
              className="rounded-lg border border-hotel-line px-4 py-2 font-medium text-hotel-muted hover:bg-white/5 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (selectedTask) {
                  const nextSt = selectedTask.status === 'dirty' ? 'cleaning' : selectedTask.status === 'cleaning' ? 'inspected' : 'available';
                  handleAdvanceStatus(selectedTask, nextSt);
                }
              }}
              className="rounded-lg border border-hotel-accent bg-gradient-to-r from-hotel-accent to-hotel-gold px-4 py-2 font-bold text-[#14110f] hover:opacity-95 transition-opacity"
            >
              Save Checklist Progress
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

