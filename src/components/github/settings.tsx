"use client";

import { RiArrowDownSLine, RiFlashlightLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { highlightCode } from "@/lib/highlight";
import type { RealtimeStatus } from "@/hooks/use-realtime";
import { cn } from "@/lib/utils";

// Copy of examples/webhook-relay/server.mjs, shown for one-click copy. Keep in
// sync with that file.
const RELAY_CODE = `import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8787;
const SECRET = process.env.WEBHOOK_SECRET || "";
const subs = new Map(); // "owner/repo" -> Set<WebSocket>

function verify(body, signature) {
  if (!SECRET) return true;
  if (!signature) return false;
  const digest = \`sha256=\${createHmac("sha256", SECRET).update(body).digest("hex")}\`;
  const a = Buffer.from(digest), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const server = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/github") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      if (!verify(body, req.headers["x-hub-signature-256"]))
        return res.writeHead(401).end("bad signature");
      let p; try { p = JSON.parse(body.toString()); } catch { return res.writeHead(400).end(); }
      const repo = p?.repository?.full_name;
      const msg = JSON.stringify({ repo, event: req.headers["x-github-event"], action: p?.action });
      for (const ws of subs.get(repo) ?? []) if (ws.readyState === ws.OPEN) ws.send(msg);
      res.writeHead(204).end();
    });
    return;
  }
  res.writeHead(200).end("OpenGit relay up");
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws, req) => {
  const repo = new URL(req.url, "http://x").searchParams.get("repo");
  if (!repo) return ws.close();
  if (!subs.has(repo)) subs.set(repo, new Set());
  subs.get(repo).add(ws);
  ws.on("close", () => subs.get(repo)?.delete(ws));
});

server.listen(PORT, () => console.log("OpenGit relay on :" + PORT));`;

const STATUS_STYLE: Record<RealtimeStatus, { label: string; cls: string }> = {
  off: { label: "Off", cls: "text-muted-foreground bg-muted" },
  connecting: { label: "Connecting…", cls: "text-amber-500 bg-amber-500/10" },
  live: { label: "Live", cls: "text-[#3fb950] bg-[#3fb950]/12" },
  error: { label: "Disconnected", cls: "text-[#f85149] bg-[#f85149]/12" },
};

export function Settings({
  relayUrl,
  status,
  repo,
  onSave,
}: {
  relayUrl: string;
  status: RealtimeStatus;
  repo: string;
  onSave: (url: string) => void;
}) {
  const [draft, setDraft] = useState(relayUrl);
  useEffect(() => setDraft(relayUrl), [relayUrl]);
  const dirty = draft.trim() !== relayUrl.trim();
  const s = STATUS_STYLE[status];

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-xs">
      {/* Realtime status + relay URL */}
      <section className="border-border space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <RiFlashlightLine className="size-4" />
          <h2 className="text-sm font-semibold">Real-time updates</h2>
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
              s.cls,
            )}
          >
            {s.label}
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          By default the PR page only refreshes when you press Refresh. To get
          live updates the moment a pull request changes, run a tiny relay
          server that receives GitHub's webhooks and forwards them here. It's a
          one-time setup (~10 min) and needs admin access to the repo.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="relay-url">Relay URL</Label>
          <div className="flex gap-2">
            <Input
              id="relay-url"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://your-relay.example.com"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
            <Button disabled={!dirty} onClick={() => onSave(draft.trim())}>
              Save
            </Button>
            {relayUrl ? (
              <Button
                variant="outline"
                onClick={() => onSave("")}
                disabled={!relayUrl}
              >
                Clear
              </Button>
            ) : null}
          </div>
          {repo ? (
            <p className="text-muted-foreground text-[0.7rem]">
              Subscribed repo: <span className="font-mono">{repo}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-[0.7rem]">
              Open a GitHub repository to enable real-time updates.
            </p>
          )}
        </div>
      </section>

      {/* Setup instructions */}
      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Set it up</h2>
        <ol className="space-y-4">
          <Step n={1} title="Save the relay server code">
            Create a file named{" "}
            <code className="bg-muted rounded px-1">server.mjs</code> and paste
            this in:
            <Collapsible className="mt-2">
              <div className="flex items-center gap-1">
                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 [&[data-state=open]_svg]:rotate-180">
                  <RiArrowDownSLine className="size-3.5 transition-transform" />
                  Show server.mjs
                </CollapsibleTrigger>
                <CopyButton text={RELAY_CODE} label="server.mjs" />
              </div>
              <CollapsibleContent>
                <ScrollArea className="bg-muted/40 mt-2 h-72 rounded-md">
                  <pre className="p-3 font-mono text-[0.7rem] leading-relaxed">
                    <code
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: Prism output of a static constant
                      dangerouslySetInnerHTML={{
                        __html: highlightCode(RELAY_CODE, "javascript"),
                      }}
                    />
                  </pre>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          </Step>

          <Step n={2} title="Install the dependency">
            In that folder, install the one package it needs:
            <InstallTabs />
          </Step>

          <Step n={3} title="Run it on a public HTTPS URL">
            Start it with a secret of your choice (remember it for step 4):
            <CmdLine cmd="WEBHOOK_SECRET=your-secret node server.mjs" />
            <span className="mt-1.5 block">
              It must be reachable from the internet — deploy to a host (Fly.io,
              Render, a VPS) or, for a quick test, expose your local port with a
              tunnel like{" "}
              <code className="bg-muted rounded px-1">cloudflared</code> or{" "}
              <code className="bg-muted rounded px-1">ngrok</code>. Note the
              public URL, e.g.{" "}
              <code className="bg-muted rounded px-1">
                https://your-relay.com
              </code>
              .
            </span>
          </Step>

          <Step n={4} title="Add the webhook on GitHub">
            On the repo: <b>Settings → Webhooks → Add webhook</b>, then set:
            <ul className="mt-1.5 space-y-1">
              <Field label="Payload URL">
                your public URL +{" "}
                <code className="bg-muted rounded px-1">/github</code> (e.g.{" "}
                <code className="bg-muted rounded px-1">
                  https://your-relay.com/github
                </code>
                )
              </Field>
              <Field label="Content type">
                <code className="bg-muted rounded px-1">application/json</code>
              </Field>
              <Field label="Secret">
                the same{" "}
                <code className="bg-muted rounded px-1">WEBHOOK_SECRET</code>{" "}
                from step 3
              </Field>
              <Field label="Events">
                choose “Let me select…” → tick <b>Pull requests</b> and{" "}
                <b>Issues</b>
              </Field>
            </ul>
          </Step>

          <Step n={5} title="Connect OpenGit">
            Paste your public URL (e.g.{" "}
            <code className="bg-muted rounded px-1">
              https://your-relay.com
            </code>
            ) into the <b>Relay URL</b> field above and press Save. The status
            turns <span className="font-medium text-[#3fb950]">Live</span> and
            the PR list updates the instant a webhook fires.
          </Step>
        </ol>
      </section>
    </div>
  );
}

const INSTALL: { pm: string; cmd: string }[] = [
  { pm: "npm", cmd: "npm install ws" },
  { pm: "pnpm", cmd: "pnpm add ws" },
  { pm: "yarn", cmd: "yarn add ws" },
  { pm: "bun", cmd: "bun add ws" },
];

function InstallTabs() {
  return (
    <Tabs defaultValue="npm" className="mt-2">
      <TabsList variant="line">
        {INSTALL.map((i) => (
          <TabsTrigger key={i.pm} value={i.pm}>
            {i.pm}
          </TabsTrigger>
        ))}
      </TabsList>
      {INSTALL.map((i) => (
        <TabsContent key={i.pm} value={i.pm} className="mt-2">
          <CmdLine cmd={i.cmd} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CmdLine({ cmd }: { cmd: string }) {
  return (
    <div className="bg-muted/40 flex items-center gap-2 rounded-md py-1 pr-1 pl-3">
      <code className="flex-1 overflow-x-auto font-mono text-[0.7rem] whitespace-nowrap">
        <span className="text-muted-foreground select-none">$ </span>
        <span
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Prism output of a static command string
          dangerouslySetInnerHTML={{ __html: highlightCode(cmd, "bash") }}
        />
      </code>
      <CopyButton text={cmd} label="command" />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2">
      <span className="text-foreground w-24 shrink-0 font-medium">{label}</span>
      <span className="text-muted-foreground flex-1">{children}</span>
    </li>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold">
        {n}
      </span>
      <div className="min-w-0 flex-1 leading-relaxed">
        <span className="text-foreground font-medium">{title}.</span>{" "}
        <span className="text-muted-foreground">{children}</span>
      </div>
    </li>
  );
}
