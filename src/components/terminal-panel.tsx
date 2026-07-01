"use client";

import "@xterm/xterm/css/xterm.css";
import {
  RiAddLine,
  RiCloseLine,
  RiSettings3Line,
  RiSubtractLine,
  RiTerminalLine,
} from "@remixicon/react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { ActionTooltip } from "@/components/action-tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { setEchoSink } from "@/lib/terminal-bus";
import { setTerminalOpen, toggleTerminal } from "@/lib/terminal-open";
import {
  addSession,
  closeSession,
  ensureSession,
  renameSession,
  setActiveSession,
  type TermSession as Session,
  useActiveSession,
  useSessions,
} from "@/lib/terminal-sessions";
import {
  type TabPosition,
  setTerminalSettings,
  useTerminalSettings,
} from "@/lib/terminal-settings";
import { cn } from "@/lib/utils";

/** One xterm session bound to a backend PTY by id. Kept mounted while hidden so
 *  background output keeps flowing; refits when it becomes active. */
function TerminalView({
  id,
  active,
  onExit,
}: {
  id: string;
  active: boolean;
  onExit: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<{ fit: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (!hostRef.current) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      const host = hostRef.current;
      if (disposed || !host) return;
      const dark = document.documentElement.classList.contains("dark");
      // Islands Dark palette (matches globals.css .dark + Prism tokens); a light
      // fallback for the light theme. Transparent bg so the island surface shows.
      const theme = dark
        ? {
            background: "#181a1d",
            foreground: "#bcbec4",
            cursor: "#bcbec4",
            cursorAccent: "#181a1d",
            selectionBackground: "rgba(84,138,247,0.28)",
            black: "#181a1d",
            red: "#e05561",
            green: "#6aab73",
            yellow: "#cf8e6d",
            blue: "#548af7",
            magenta: "#c77dbb",
            cyan: "#2aacb8",
            white: "#bcbec4",
            brightBlack: "#7a7e85",
            brightRed: "#e05561",
            brightGreen: "#6aab73",
            brightYellow: "#cf8e6d",
            brightBlue: "#56a8f5",
            brightMagenta: "#c77dbb",
            brightCyan: "#2aacb8",
            brightWhite: "#e6e7ea",
          }
        : {
            background: "#ffffff",
            foreground: "#1f2328",
            cursor: "#1f2328",
            selectionBackground: "rgba(0,0,0,0.15)",
          };
      const term = new Terminal({
        fontFamily:
          "'Dank Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 12,
        cursorBlink: true,
        allowTransparency: true,
        theme,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(host);

      // Keyboard: copy/paste vs. the shell's control keys.
      // - Ctrl/Cmd+C with a selection → copy (don't send SIGINT); without a
      //   selection → fall through so Ctrl+C still cancels in the shell.
      // - Ctrl+Shift+C → always copy (Linux terminal convention).
      // - Ctrl/Cmd+V or Ctrl+Shift+V → paste.
      term.attachCustomKeyEventHandler((e) => {
        if (e.type !== "keydown") return true;
        const mod = e.ctrlKey || e.metaKey;
        // Ctrl/Cmd+J toggles the terminal even when it has focus — xterm would
        // otherwise consume it (as LF), so handle + stop it here.
        if (mod && !e.shiftKey && !e.altKey && e.code === "KeyJ") {
          e.preventDefault();
          e.stopPropagation();
          toggleTerminal();
          return false;
        }
        if (mod && e.code === "KeyC" && (e.shiftKey || term.hasSelection())) {
          const sel = term.getSelection();
          if (sel) navigator.clipboard?.writeText(sel);
          return false;
        }
        if (mod && e.code === "KeyV") {
          navigator.clipboard?.readText().then((t) => {
            if (t) term.paste(t);
          });
          return false;
        }
        return true;
      });

      fit.fit();
      fitRef.current = fit;
      setReady(true);
      await invoke("terminal_start", { id, cols: term.cols, rows: term.rows });
      const offData = await listen<{ id: string; data: string }>(
        "terminal:data",
        (e) => {
          if (e.payload.id === id) term.write(e.payload.data);
        },
      );
      const offExit = await listen<{ id: string }>("terminal:exit", (e) => {
        if (e.payload.id === id) onExitRef.current();
      });
      const onData = term.onData((d) => {
        invoke("terminal_input", { id, data: d });
      });
      const ro = new ResizeObserver(() => {
        try {
          fit.fit();
          invoke("terminal_resize", { id, cols: term.cols, rows: term.rows });
        } catch {
          // host detached mid-resize; ignore.
        }
      });
      ro.observe(host);
      term.focus();
      cleanup = () => {
        ro.disconnect();
        offData();
        offExit();
        onData.dispose();
        invoke("terminal_kill", { id });
        term.dispose();
        fitRef.current = null;
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [id]);

  // A hidden div mis-measures; refit when this view becomes active.
  useEffect(() => {
    if (active && ready) fitRef.current?.fit();
  }, [active, ready]);

  return (
    <div ref={hostRef} className={cn("absolute inset-0 p-1", !active && "hidden")} />
  );
}


export function TerminalPanel() {
  const sessions = useSessions();
  const activeId = useActiveSession();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;
  const { tabPosition, syncUI } = useTerminalSettings();

  // Sync mode: type the UI's git command into the active terminal and run it
  // (trailing \r = Enter), so it lands in scrollback + history and leaves a fresh
  // prompt for the next command. The app already ran the op for its own state, so
  // this is a second, real run in the shell.
  useEffect(() => {
    setEchoSink((cmd) => {
      const id = activeIdRef.current;
      if (id) invoke("terminal_input", { id, data: `${cmd}\r` });
    });
    return () => setEchoSink(null);
  }, []);

  const startRename = (s: Session) => {
    setEditingId(s.id);
    setDraft(s.name);
  };
  const commitRename = () => {
    if (editingId) renameSession(editingId, draft);
    setEditingId(null);
  };

  // The panel is only mounted while open (workspace renders it), so ensure a
  // session exists on mount. The list itself persists across toggles.
  useEffect(() => {
    ensureSession();
  }, []);

  const horizontal = tabPosition === "top" || tabPosition === "bottom";
  const tabsFirst = tabPosition === "top" || tabPosition === "left";

  const controls = (
    <div className={cn("flex items-center gap-0.5", horizontal ? "ml-auto" : "mt-auto")}>
      <ActionTooltip label="New terminal">
        <Button variant="ghost" size="icon-xs" onClick={addSession}>
          <RiAddLine />
        </Button>
      </ActionTooltip>
      <DropdownMenu>
        <ActionTooltip label="Terminal settings">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <RiSettings3Line />
            </Button>
          </DropdownMenuTrigger>
        </ActionTooltip>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Tab position</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={tabPosition}
            onValueChange={(v) =>
              setTerminalSettings({ tabPosition: v as TabPosition })
            }
          >
            <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="left">Left</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={syncUI}
            onCheckedChange={(v) => setTerminalSettings({ syncUI: !!v })}
            onSelect={(e) => e.preventDefault()}
          >
            Sync with UI
          </DropdownMenuCheckboxItem>
          <p className="px-2 pb-1 text-xs text-muted-foreground">
            Notify on repo changes &amp; echo UI git commands here.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionTooltip label="Hide terminal (Ctrl+J)">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setTerminalOpen(false)}
        >
          <RiSubtractLine />
        </Button>
      </ActionTooltip>
    </div>
  );

  const tabBar = (
    <div
      className={cn(
        "flex gap-1 bg-card",
        horizontal ? "flex-row items-center px-2 py-1" : "w-44 flex-col p-1",
        tabPosition === "top" && "border-b border-border",
        tabPosition === "bottom" && "border-t border-border",
        tabPosition === "left" && "border-r border-border",
        tabPosition === "right" && "border-l border-border",
      )}
    >
      {sessions.map((s) =>
        editingId === s.id ? (
          <Input
            key={s.id}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditingId(null);
            }}
            className={cn("h-6 px-2 py-0 text-xs", horizontal ? "w-28" : "w-full")}
          />
        ) : (
          <button
            type="button"
            key={s.id}
            onClick={() => setActiveSession(s.id)}
            onDoubleClick={() => startRename(s)}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-0.5 text-xs",
              !horizontal && "w-full",
              s.id === activeId ? "bg-accent" : "hover:bg-accent/50",
            )}
          >
            <RiTerminalLine className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{s.name}</span>
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                closeSession(s.id);
              }}
              className="ml-auto rounded text-muted-foreground hover:text-foreground"
            >
              <RiCloseLine className="size-3" />
            </span>
          </button>
        ),
      )}
      {controls}
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0",
        horizontal ? "flex-col" : "flex-row",
      )}
    >
      {tabsFirst && tabBar}
      <div className="relative min-h-0 flex-1">
        {sessions.map((s) => (
          <TerminalView
            key={s.id}
            id={s.id}
            active={s.id === activeId}
            onExit={() => closeSession(s.id)}
          />
        ))}
      </div>
      {!tabsFirst && tabBar}
    </div>
  );
}
