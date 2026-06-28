import { describe, expect, it } from "vitest";
import { splitRepoPath } from "@/lib/repo-path";

describe("splitRepoPath", () => {
  it("splits a POSIX path into name and location", () => {
    expect(splitRepoPath("/home/me/code/OpenGit")).toEqual({
      name: "OpenGit",
      location: "home/me/code",
    });
  });

  it("splits a Windows path, normalizing separators", () => {
    expect(splitRepoPath("C:\\Users\\me\\Build\\OpenGit")).toEqual({
      name: "OpenGit",
      location: "C:/Users/me/Build",
    });
  });

  it("ignores a trailing separator", () => {
    expect(splitRepoPath("/a/b/repo/").name).toBe("repo");
  });

  it("falls back to the full path when there is no parent", () => {
    expect(splitRepoPath("repo")).toEqual({ name: "repo", location: "repo" });
  });
});
