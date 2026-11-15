export default function Field({ label, htmlFor, children }) {
  const Tag = htmlFor ? 'label' : 'span'
  return (
    <div className="flex flex-col gap-2">
      <Tag htmlFor={htmlFor} className="text-sm text-zinc-400">
        {label}
      </Tag>
      {children}
    </div>
  )
}
