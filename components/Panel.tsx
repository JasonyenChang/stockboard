export function Panel({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-panelborder bg-panel ${className}`}
    >
      <header className="flex items-center justify-between border-b border-panelborder px-4 py-2.5">
        <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Spinner({ label = "載入中…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-up/40 bg-up/10 px-4 py-3 text-sm text-up">
      {message}
    </div>
  );
}
