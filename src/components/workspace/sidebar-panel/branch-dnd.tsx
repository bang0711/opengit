"use client";

// Drag-drop branch combine, via dnd-kit (not native HTML5 drag — the branch rows
// are Radix triggers, and Radix's pointer-capture cancels the native drag gesture).
// Wraps the branch list: drag one branch onto another → combine dialog → merge or
// rebase. The dialog + drag ghost live here so there's one of each, not one per row.
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { RiGitBranchLine, RiGitMergeLine } from "@remixicon/react";
import { type ReactNode, useState } from "react";
import { mergeInto, rebaseOnto } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notify";

export function BranchDnd({ children }: { children: ReactNode }) {
  // 5px activation distance: a plain click still checks out / opens menus; only a
  // drag past the threshold starts dnd-kit.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [active, setActive] = useState<string | null>(null);
  const [combine, setCombine] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  const run = (fn: () => Promise<{ error?: string }>, success: string) => {
    if (pending) return;
    setPending(true);
    fn()
      .then((r) => notify(r, success))
      .finally(() => setPending(false));
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActive(String(e.active.id))}
      onDragCancel={() => setActive(null)}
      onDragEnd={(e: DragEndEvent) => {
        setActive(null);
        const from = String(e.active.id);
        const to = e.over ? String(e.over.id) : null;
        if (to && from !== to) setCombine({ from, to });
      }}
    >
      {children}

      <DragOverlay>
        {active ? (
          <div className="border-primary bg-sidebar flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs shadow-lg">
            <RiGitBranchLine className="text-primary size-3.5" />
            <span className="truncate">{active}</span>
          </div>
        ) : null}
      </DragOverlay>

      <Dialog
        open={combine !== null}
        onOpenChange={(o) => !o && setCombine(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Combine branches</DialogTitle>
            <DialogDescription>
              Bring{" "}
              <span className="text-foreground font-semibold">
                {combine?.from}
              </span>{" "}
              into{" "}
              <span className="text-foreground font-semibold">
                {combine?.to}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() => {
                const c = combine;
                setCombine(null);
                if (c)
                  run(
                    () => mergeInto(c.to, c.from),
                    `Merged ${c.from} into ${c.to}`,
                  );
              }}
            >
              <RiGitMergeLine className="mr-1 size-3.5" />
              Merge
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                const c = combine;
                setCombine(null);
                if (c)
                  run(
                    () => rebaseOnto(c.to, c.from),
                    `Rebased ${c.to} onto ${c.from}`,
                  );
              }}
            >
              Rebase onto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
