"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemName: string;
  description?: string;
  warning?: string;
  confirmLabel?: string;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  itemName,
  description,
  warning,
  confirmLabel = "Delete",
  isPending = false,
  error,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Selected item
          </p>
          <p className="mt-0.5 break-words text-sm font-bold text-foreground">
            {itemName}
          </p>
        </div>

        {warning && (
          <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-foreground">
            {warning}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs leading-relaxed text-danger"
          >
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isPending}
            disabled={isPending}
            onClick={() => {
              if (!isPending) onConfirm();
            }}
          >
            {isPending ? "Deleting..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
