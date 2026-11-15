import { useLayoutEffect, useRef, useState } from 'react'

// Quantas linhas cabem na altura disponível, para a tela nunca precisar rolar
export function useFitCount(rowHeight, gap) {
  const ref = useRef(null)
  const [count, setCount] = useState(5)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => setCount(Math.max(1, Math.floor((el.clientHeight + gap) / (rowHeight + gap))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [rowHeight, gap])
  return [ref, count]
}
