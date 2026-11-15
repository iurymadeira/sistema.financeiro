import { inputCls, money } from '../ui.jsx'

export default function MoneyInput({ id, value, onChange }) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={value > 0 ? money(value) : ''}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
        onChange(digits ? parseInt(digits, 10) : 0)
      }}
      className={`${inputCls} text-base font-semibold tabular-nums`}
    />
  )
}
