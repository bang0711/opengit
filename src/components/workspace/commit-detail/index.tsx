"use client";

import { RiGitCommitLine, RiLoader4Line, RiUser3Line } from "@remixicon/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { commitDetail } from "@/app/actions";
import { Notice } from "@/components/shared/notice";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CommitDetail } from "@/lib/git";
import { FileRow } from "./file-row";

export function CommitDetailPane({ sha }: { sha: string | null }) {
  const [detail, setDetail] = useState<CommitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!sha) {
      setDetail(null);
      setError(null);
      return;
    }
    startTransition(async () => {
      const r = await commitDetail(sha);
      if ("error" in r) {
        setError(r.error);
        setDetail(null);
      } else {
        setError(null);
        setDetail(r);
      }
    });
  }, [sha]);

  // Virtualize the file list (giant merge commits list thousands of files). The
  // list sits below variable-height content (subject/body/meta) in the same
  // scroll element, so measure its top offset and feed it as scrollMargin.
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listTop, setListTop] = useState(0);
  useLayoutEffect(() => {
    // detail is the trigger: the header above the list changes height with it.
    void detail;
    const list = listRef.current;
    const scroll = scrollRef.current;
    if (!list || !scroll) return;
    setListTop(
      list.getBoundingClientRect().top -
        scroll.getBoundingClientRect().top +
        scroll.scrollTop,
    );
  }, [detail]);
  const virt = useVirtualizer({
    count: detail?.files.length ?? 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 20, // py-0.5 + text-xs
    overscan: 12,
    scrollMargin: listTop,
  });

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-border text-muted-foreground flex h-8 shrink-0 items-center gap-2 border-b px-3 text-xs font-semibold">
        <RiGitCommitLine className="size-3.5" />
        Commit
        {detail ? (
          <span className="font-mono font-normal">{detail.shortSha}</span>
        ) : null}
        {pending ? (
          <RiLoader4Line className="ml-auto size-3.5 animate-spin" />
        ) : null}
      </div>

      {!sha ? (
        <Notice className="p-4 text-xs">
          Select a commit to view its details.
        </Notice>
      ) : error ? (
        <p className="text-destructive p-3 text-xs">{error}</p>
      ) : detail ? (
        <ScrollArea className="min-h-0 flex-1" viewportRef={scrollRef}>
          <div className="flex flex-col gap-3 p-3">
            <p className="text-sm leading-snug font-medium">{detail.subject}</p>
            {detail.body ? (
              <pre className="text-muted-foreground border-border/60 border-l-2 pl-3 font-sans text-xs whitespace-pre-wrap">
                {detail.body}
              </pre>
            ) : null}

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <RiUser3Line className="size-3.5" />
                <span className="text-foreground">{detail.authorName}</span>
                <span className="truncate">&lt;{detail.authorEmail}&gt;</span>
              </div>
              <div className="text-muted-foreground">
                {new Date(detail.date * 1000).toLocaleString()}
              </div>
              <div className="text-muted-foreground flex items-center gap-1">
                <span>commit</span>
                <span className="text-foreground font-mono">
                  {detail.shortSha}
                </span>
                {detail.parents.length > 0 ? (
                  <span>
                    · parents{" "}
                    <span className="font-mono">
                      {detail.parents.map((p) => p.slice(0, 7)).join(" ")}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              Files
              <Badge variant="secondary">{detail.files.length}</Badge>
            </div>
            <div
              ref={listRef}
              style={{ height: virt.getTotalSize(), position: "relative" }}
            >
              {virt.getVirtualItems().map((vi) => {
                const f = detail.files[vi.index];
                return (
                  <div
                    key={f.path}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      // vi.start is scroll-element-relative (includes
                      // scrollMargin); rows are positioned inside the list.
                      transform: `translateY(${vi.start - virt.options.scrollMargin}px)`,
                    }}
                  >
                    <FileRow file={f} sha={detail.sha} />
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      ) : (
        <Notice className="p-4 text-xs">
          <RiLoader4Line className="size-5 animate-spin" />
        </Notice>
      )}
    </div>
  );
}
