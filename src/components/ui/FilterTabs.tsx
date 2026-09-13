interface Tab {
  value: string
  label: string
}

export default function FilterTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[]
  active: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            active === t.value
              ? 'bg-primary-500 text-white'
              : 'bg-(--card) text-general-300 hover:text-general-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}