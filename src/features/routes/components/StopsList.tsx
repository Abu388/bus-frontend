"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { BuilderStop, DirectionKey } from "../builder/types";

interface SortableStopRowProps {
  stop: BuilderStop;
  index: number;
  total: number;
  activeDirection: DirectionKey;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onFocus: () => void;
}

function SortableStopRow({
  stop,
  index,
  total,
  activeDirection,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRename,
  onFocus,
}: SortableStopRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.key });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const displayNumber =
    activeDirection === "inbound" ? total - index : index + 1;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-2.5 text-xs hover:bg-muted/20"
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none rounded border border-border px-1 py-0.5 text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag stop ${displayNumber}`}
        {...attributes}
        {...listeners}
      >
        ::
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
            {displayNumber}
          </span>
          <Badge variant={stop.kind === "new" ? "accent" : "secondary"}>
            {stop.kind === "new" ? "New" : "Existing"}
          </Badge>
          {isFirst && <Badge variant="outline">Start</Badge>}
          {isLast && <Badge variant="outline">End</Badge>}
        </div>

        {stop.kind === "new" ? (
          <Input
            value={stop.name}
            onChange={(event) => onRename(event.target.value)}
            className="h-7 text-xs"
            aria-label={`Stop ${displayNumber} name`}
            maxLength={100}
          />
        ) : (
          <button
            type="button"
            onClick={onFocus}
            className="block max-w-full truncate text-left font-semibold text-foreground hover:text-primary hover:underline"
            title="Focus on map"
          >
            {stop.name}
          </button>
        )}

        <p className="font-mono text-[10px] text-muted-foreground">
          {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Move stop up"
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Move stop down"
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-danger"
          onClick={onRemove}
          aria-label={`Remove ${stop.name}`}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}

export interface StopsListProps {
  stops: BuilderStop[];
  activeDirection: DirectionKey;
  onMove: (from: number, to: number) => void;
  onRemove: (stop: BuilderStop) => void;
  onRename: (key: string, name: string) => void;
  onFocus: (stop: BuilderStop) => void;
}

export function StopsList({
  stops,
  activeDirection,
  onMove,
  onRemove,
  onRename,
  onFocus,
}: StopsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = stops.findIndex((stop) => stop.key === active.id);
    const to = stops.findIndex((stop) => stop.key === over.id);
    if (from === -1 || to === -1) return;
    onMove(from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={stops.map((stop) => stop.key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {stops.map((stop, index) => (
            <SortableStopRow
              key={stop.key}
              stop={stop}
              index={index}
              total={stops.length}
              activeDirection={activeDirection}
              onMoveUp={() => onMove(index, index - 1)}
              onMoveDown={() => onMove(index, index + 1)}
              onRemove={() => onRemove(stop)}
              onRename={(name) => onRename(stop.key, name)}
              onFocus={() => onFocus(stop)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
