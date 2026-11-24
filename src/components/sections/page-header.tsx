export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header className="container-page pb-10 pt-28 md:pb-14 md:pt-36">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-sunset-deep">{eyebrow}</p>
      <h1 className="max-w-3xl text-4xl leading-tight md:text-6xl">{title}</h1>
      {intro && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{intro}</p>}
    </header>
  );
}
