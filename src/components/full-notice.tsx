/** Centered full-area notice (empty/error states for full-screen views). */
export function FullNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
