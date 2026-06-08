'use client';

import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type Row = { id: string; value: string };

function SortableRow({
  row,
  index,
  onChange,
  onDelete,
}: {
  row: Row;
  index: number;
  onChange: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
      <Input value={row.value} onChange={(e) => onChange(row.id, e.target.value)} className="flex-1" />
      <button
        type="button"
        onClick={() => onDelete(row.id)}
        aria-label="Remove row"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/**
 * Drag-reorderable list of text rows. Submits a hidden input named `name` with
 * the values joined by newlines, so server-side `linesToArray` parsing is
 * unchanged. `initial` is the existing array (parent splits its stored value).
 */
export function SortableArrayField({
  name,
  label,
  initial,
  hint,
}: {
  name: string;
  label: string;
  initial: string[];
  hint?: string;
}) {
  // Deterministic initial ids (index) to avoid SSR/client hydration mismatch;
  // a counter supplies ids for rows added after hydration.
  const [rows, setRows] = useState<Row[]>(() => initial.map((value, i) => ({ id: String(i), value })));
  const counter = useRef(initial.length);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setRows((rs) => {
      const oldIndex = rs.findIndex((r) => r.id === active.id);
      const newIndex = rs.findIndex((r) => r.id === over.id);
      return arrayMove(rs, oldIndex, newIndex);
    });
  };

  const update = (id: string, value: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, value } : r)));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const add = () => setRows((rs) => [...rs, { id: `n${counter.current++}`, value: '' }]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input type="hidden" name={name} value={rows.map((r) => r.value).join('\n')} />

      <div className="flex flex-col gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {rows.map((row, i) => (
              <SortableRow key={row.id} row={row} index={i} onChange={update} onDelete={remove} />
            ))}
          </SortableContext>
        </DndContext>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No rows yet.</p> : null}
        <button
          type="button"
          onClick={add}
          className="inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted"
        >
          <Plus className="size-4" /> Add row
        </button>
      </div>
    </div>
  );
}
