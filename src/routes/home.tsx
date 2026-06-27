import { useLoaderData } from "react-router-dom";
import { RepoPicker } from "@/components/repo-picker";
import { Workspace } from "@/components/workspace/workspace";

export async function homeLoader() {
  const ws = await window.api.workspace();
  if ("error" in ws) {
    const recent = await window.api.recentRepos();
    return { kind: "picker" as const, recent };
  }
  return { kind: "workspace" as const, data: ws };
}

export function Home() {
  const d = useLoaderData() as Awaited<ReturnType<typeof homeLoader>>;
  if (d.kind === "picker") return <RepoPicker recent={d.recent} />;
  return <Workspace {...d.data} />;
}
