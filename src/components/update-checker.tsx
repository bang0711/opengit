import { RiDownloadCloud2Line, RiLoader4Line } from "@remixicon/react";
import { useEffect, useState } from "react";
import type { Release, UpdaterEvent } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Status =
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export function UpdateChecker() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("checking");
  const [version, setVersion] = useState<string>();
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string>();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>();
  const [pickerStatus, setPickerStatus] = useState<
    "idle" | "downloading" | "launched" | "error"
  >("idle");
  const [pickerPercent, setPickerPercent] = useState(0);
  const [pickerError, setPickerError] = useState<string>();

  useEffect(() => {
    if (typeof window === "undefined" || !window.updater) return;
    setReady(true);
    return window.updater.onEvent((e: UpdaterEvent) => {
      switch (e.type) {
        case "available":
          setVersion(e.version);
          setHasUpdate(true);
          setStatus((s) => (s === "downloading" ? s : "available"));
          break;
        case "not-available":
          setStatus("not-available");
          break;
        case "progress":
          setStatus("downloading");
          setPercent(e.percent);
          break;
        case "downloaded":
          setVersion(e.version);
          setHasUpdate(true);
          setStatus("downloaded");
          break;
        case "error":
          setError(e.message);
          setStatus("error");
          break;
        case "picker-progress":
          setPickerStatus("downloading");
          setPickerPercent(e.percent);
          break;
        case "picker-launched":
          setPickerStatus("launched");
          break;
        case "picker-error":
          setPickerStatus("error");
          setPickerError(e.message);
          break;
      }
    });
  }, []);

  // Load the release list whenever the dialog opens.
  useEffect(() => {
    if (!open || !window.updater) return;
    setPickerStatus("idle");
    window.updater.listReleases().then((rs) => {
      setReleases(rs);
      const def = rs.find((r) => !r.current) ?? rs[0];
      setSelectedTag((cur) => cur ?? def?.tag);
    });
  }, [open]);

  if (!ready) return null;

  const check = () => {
    setError(undefined);
    setStatus("checking");
    setOpen(true);
    window.updater?.check();
  };

  const downloadSelected = () => {
    const rel = releases.find((r) => r.tag === selectedTag);
    if (!rel) return;
    if (rel.assetUrl) {
      setPickerStatus("downloading");
      setPickerPercent(0);
      setPickerError(undefined);
      window.updater?.downloadVersion(rel.assetUrl);
    } else {
      // No installer for this OS — open the release page in the browser.
      window.updater?.openDownload(rel.pageUrl);
    }
  };

  const description = {
    checking: "Checking for updates…",
    available: `Version ${version} is available.`,
    "not-available": "You're on the latest version.",
    downloading: `Downloading update… ${percent}%`,
    downloaded: `Version ${version} is ready to install.`,
    error: error ?? "Update failed.",
  }[status];

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={check}
        className="relative"
      >
        <RiDownloadCloud2Line />
        Versions
        {hasUpdate ? (
          <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-primary" />
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Software update</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {status === "downloading" ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}

          {/* Pick + install any published version (downloads + launches it). */}
          {releases.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Or install a specific version
              </p>

              {pickerStatus === "downloading" ? (
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pickerPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Downloading… {pickerPercent}%
                  </p>
                </div>
              ) : pickerStatus === "launched" ? (
                <p className="text-xs text-muted-foreground">
                  Installer launched — follow its prompts to finish.
                </p>
              ) : pickerStatus === "error" ? (
                <p className="text-xs text-destructive">
                  {pickerError ?? "Download failed."}
                </p>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Version" />
                    </SelectTrigger>
                    <SelectContent>
                      {releases.map((r) => (
                        <SelectItem key={r.tag} value={r.tag}>
                          {r.tag}
                          {r.current ? " · current" : ""}
                          {r.prerelease ? " · pre" : ""}
                          {!r.assetUrl ? " · page" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={downloadSelected}
                    disabled={!selectedTag}
                  >
                    Install
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            {status === "checking" || status === "downloading" ? (
              <Button disabled>
                <RiLoader4Line className="animate-spin" />
                {status === "checking" ? "Checking" : `${percent}%`}
              </Button>
            ) : status === "available" ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Later
                </Button>
                <Button onClick={() => window.updater?.download()}>
                  Download
                </Button>
              </>
            ) : status === "downloaded" ? (
              <Button onClick={() => window.updater?.install()}>
                Restart &amp; install
              </Button>
            ) : status === "error" ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button onClick={check}>Retry</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
