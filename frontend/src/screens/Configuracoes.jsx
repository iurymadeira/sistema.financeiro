/**
 * Configuracoes.jsx — Janela de configurações da conta
 *
 * Abre por cima do Dashboard (é a única tela que tem acesso a ela). Duas abas:
 *   Perfil: foto, nome e e-mail.   Senha: trocar a senha.
 *
 *   {open && <Configuracoes profile={profile} onSave={update} onChangePassword={changePassword} onClose={...} />}
 */
import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { COLORS } from '../data/categories.js'
import { BLUE, clickable, focusRing } from '../components/ui.jsx'
import { Field, Segmented, inputCls } from './Movimentacoes.jsx'

const MAX_PHOTO_MB = 5
const PHOTO_SIZE = 256

// Recorta a imagem em quadrado e reduz (guarda só 256px, em JPEG)
function processPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'))
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return reject(new Error(`A imagem deve ter até ${MAX_PHOTO_MB} MB.`))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = PHOTO_SIZE
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler essa imagem.'))
    }
    img.src = url
  })
}

const pillBtn = `h-10 rounded-full border border-white/10 px-4 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-40 ${clickable} ${focusRing}`
const primaryBtn = `h-12 w-full rounded-full text-base font-semibold text-white transition-opacity disabled:opacity-40 ${clickable} ${focusRing}`

function Message({ kind, children }) {
  if (!children) return <p className="min-h-5" />
  const ok = kind === 'ok'
  return (
    <p role={ok ? 'status' : 'alert'} className="flex min-h-5 items-center gap-1.5 text-sm" style={{ color: ok ? COLORS.receita : COLORS.despesa }}>
      {ok && <Check className="size-4" strokeWidth={2} />}
      {children}
    </p>
  )
}

function ProfileTab({ profile, onSave }) {
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [photo, setPhoto] = useState(profile.photo)
  const [msg, setMsg] = useState(null) // { kind, text }
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const changed = name.trim() !== profile.name || email.trim() !== profile.email || photo !== profile.photo
  const valid = name.trim() && email.trim()

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPhoto(await processPhoto(file))
      setMsg(null)
    } catch (err) {
      setMsg({ kind: 'error', text: err.message })
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!changed || !valid || saving) return
    setSaving(true)
    setMsg(null)
    try {
      await onSave({ name, email, photo })
      setMsg({ kind: 'ok', text: 'Alterações salvas.' })
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Não foi possível salvar.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-3xl font-semibold text-zinc-300">
          {photo ? <img src={photo} alt="Sua foto" className="size-full object-cover" /> : (name.trim() || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className={pillBtn}>
            {photo ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {photo && (
            <button type="button" onClick={() => setPhoto(null)} className={`${pillBtn} text-zinc-400`}>
              Remover
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} aria-label="Escolher foto" />
        </div>
      </div>

      <Field label="Nome" htmlFor="cfg-nome">
        <input id="cfg-nome" value={name} maxLength={60} autoComplete="name" onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="E-mail" htmlFor="cfg-email">
        <input id="cfg-email" type="email" value={email} maxLength={120} autoComplete="email" onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </Field>

      <Message kind={msg?.kind}>{msg?.text}</Message>
      <button type="submit" disabled={!changed || !valid || saving} className={primaryBtn} style={{ backgroundColor: BLUE }}>
        Salvar alterações
      </button>
    </form>
  )
}

function PasswordTab({ onChangePassword }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const filled = form.current && form.next && form.confirm

  const submit = async (e) => {
    e.preventDefault()
    if (!filled || saving) return
    setSaving(true)
    setMsg(null)
    try {
      await onChangePassword(form)
      setForm({ current: '', next: '', confirm: '' })
      setMsg({ kind: 'ok', text: 'Senha alterada.' })
    } catch (err) {
      setMsg({ kind: 'error', text: err.message || 'Não foi possível alterar a senha.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Senha atual" htmlFor="cfg-atual">
        <input id="cfg-atual" type="password" autoComplete="current-password" value={form.current} onChange={(e) => set({ current: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Nova senha" htmlFor="cfg-nova">
        <input id="cfg-nova" type="password" autoComplete="new-password" value={form.next} onChange={(e) => set({ next: e.target.value })} placeholder="Mínimo de 8 caracteres" className={inputCls} />
      </Field>
      <Field label="Confirmar nova senha" htmlFor="cfg-confirma">
        <input id="cfg-confirma" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set({ confirm: e.target.value })} className={inputCls} />
      </Field>

      <Message kind={msg?.kind}>{msg?.text}</Message>
      <button type="submit" disabled={!filled || saving} className={primaryBtn} style={{ backgroundColor: BLUE }}>
        Alterar senha
      </button>
    </form>
  )
}

export default function Configuracoes({ profile, onSave, onChangePassword, onClose }) {
  const [tab, setTab] = useState('perfil')
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Esc fecha; o foco entra na janela e volta para onde estava ao fechar
  useEffect(() => {
    const previous = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('input')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 font-sans text-white antialiased backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cfg-titulo"
        style={{ '--ctl': 'clamp(2.75rem, calc(2.75rem + (100dvh - 768px) * 0.12), 3.25rem)' }}
        className="w-full max-w-[28rem] rounded-3xl border border-white/10 bg-[#0C0C0E] p-6 shadow-2xl shadow-black"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="cfg-titulo" className="text-lg font-medium leading-tight">
              Configurações
            </h2>
            <p className="mt-1 text-sm text-zinc-400">Gerencie sua conta.</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className={`grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:bg-white/10 ${clickable} ${focusRing}`}
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="mt-5">
          <Segmented
            label="Seção"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'perfil', label: 'Perfil', color: BLUE },
              { value: 'senha', label: 'Senha', color: BLUE },
            ]}
          />
        </div>

        <div className="mt-5">
          {tab === 'perfil' ? <ProfileTab profile={profile} onSave={onSave} /> : <PasswordTab onChangePassword={onChangePassword} />}
        </div>
      </div>
    </div>
  )
}
