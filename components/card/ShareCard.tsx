"use client"

import { useRef, useState } from "react"
import styles from "@/app/card/card.module.css"

export default function ShareCard({ url, title }: { url: string; title: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [manualCopy, setManualCopy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(url)
      setManualCopy(false)
      setMessage("Lien de la carte copié.")
    } catch {
      setManualCopy(true)
      setMessage("Sélectionnez et copiez le lien ci-dessous.")
    }
  }

  const share = async () => {
    if (busy) return
    setBusy(true)
    setMessage("")
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title, text: "La carte de visite de Glenn-Richard — NOMAD403", url })
          setMessage("Carte partagée.")
          return
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return
        }
      }
      await copy()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button type="button" className={styles.action} onClick={() => void share()} disabled={busy}>
        <span className={styles.number} aria-hidden>05</span>
        <span>Partager la carte</span><span aria-hidden>↗</span>
      </button>
      <p className={styles.status} role="status" aria-live="polite">{message}</p>
      {manualCopy && <label className={styles.copyLabel}>
        Lien de la carte
        <input ref={inputRef} className={styles.copyInput} value={url} readOnly
          onFocus={event => event.currentTarget.select()}
          autoFocus aria-label="Lien de la carte à copier" />
      </label>}
    </div>
  )
}
