export default function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-display text-xl font-bold text-general-100 md:text-2xl">
        {children}
      </h2>
      {action && (
        <a href={action.href} className="text-sm text-general-400 transition-colors hover:text-primary-500">
          {action.label}
        </a>
      )}
    </div>
  )
}