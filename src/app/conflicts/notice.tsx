/** Full-screen centered notice for the conflicts route's empty/error states. */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
      {children}
    </div>
  );
}
