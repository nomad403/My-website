"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import ShuffleText from "@/components/ShuffleText"
import ShuffleDualLines from "@/components/ShuffleDualLines"
import { useLanguage } from "@/app/contexts/LanguageContext"

type ContactField = "nom" | "contact" | "message"

const FIELD_CLASS =
  "min-h-[48px] w-full rounded-xl border border-gray-300/50 bg-white/90 px-4 py-3 font-kode text-sm text-gray-800 shadow-lg backdrop-blur-sm transition-all duration-300 placeholder-gray-500 focus:border-cyan-400 focus:outline-none md:px-6 md:text-base"

const SHUFFLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?!'"

export default function ContactPageContent() {
  const { t, language } = useLanguage()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    nom: "",
    contact: "",
    message: "",
  })
  const [isSending, setIsSending] = useState(false)
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">(
    "idle",
  )
  const [titleText, setTitleText] = useState(t("contact.title"))
  const [shouldShuffleBack, setShouldShuffleBack] = useState(false)
  const titleStatusActive =
    sendStatus === "success" || sendStatus === "error" || shouldShuffleBack

  const steps = [
    {
      field: "nom" as const,
      label: t("contact.fields.name"),
      placeholder: t("contact.placeholders.name"),
    },
    {
      field: "contact" as const,
      label: t("contact.fields.contact"),
      placeholder: t("contact.placeholders.contact"),
    },
    {
      field: "message" as const,
      label: t("contact.fields.message"),
      placeholder: t("contact.placeholders.message"),
    },
  ]

  const activeField = steps[currentStep].field
  const activeValue = formData[activeField]
  const canSubmit = Boolean(activeValue.trim()) && !isSending
  const isLastStep = currentStep === steps.length - 1

  useEffect(() => {
    if (sendStatus !== "idle" || shouldShuffleBack) return
    setTitleText(t("contact.title"))
  }, [language, sendStatus, shouldShuffleBack, t])

  useEffect(() => {
    if (!shouldShuffleBack) return
    const timer = setTimeout(() => setShouldShuffleBack(false), 2000)
    return () => clearTimeout(timer)
  }, [shouldShuffleBack])

  const updateField = (field: ContactField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = async () => {
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1)
      return
    }

    setIsSending(true)
    setSendStatus("idle")

    const payload = {
      nom: formData.nom.trim(),
      contact: formData.contact.trim(),
      message: formData.message.trim(),
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const text = await res.text()
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`)

      setTitleText(t("contact.success"))
      setSendStatus("success")

      setTimeout(() => {
        setFormData({ nom: "", contact: "", message: "" })
        setCurrentStep(0)
        setSendStatus("idle")
        setShouldShuffleBack(true)
        setTitleText(t("contact.title"))
      }, 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch"
      console.error("[contact] FAILED", message)
      setTitleText(t("contact.error"))
      setSendStatus("error")

      setTimeout(() => {
        setSendStatus("idle")
        setShouldShuffleBack(true)
        setTitleText(t("contact.title"))
      }, 3000)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="relative box-border flex h-full w-full items-center justify-center px-4 pb-28 pt-16 md:px-8 md:pb-32 md:pt-24">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mx-auto flex w-full max-w-[90vw] flex-col gap-4 sm:max-w-[600px]">
          <div className="mb-2 w-full md:mb-6">
            <h1
              className={`w-full text-left font-kode text-lg tracking-wide normal-case transition-colors duration-300 sm:text-xl md:text-2xl lg:text-3xl ${
                sendStatus === "error" ? "text-red-600" : "text-gray-800"
              }`}
            >
              {titleStatusActive ? (
                <ShuffleText
                  key={`${sendStatus}-${titleText}`}
                  triggerShuffle
                  enableHover={false}
                  shuffleChars={SHUFFLE_CHARS}
                >
                  {titleText}
                </ShuffleText>
              ) : (
                <ShuffleDualLines
                  key={`${language}-${t("contact.title")}`}
                  lines={[
                    {
                      primary: t("contact.title"),
                      alternate: t("contact.titleAlt"),
                    },
                  ]}
                  shuffleChars={SHUFFLE_CHARS}
                />
              )}
            </h1>
          </div>

          <div className="w-full">
            {activeField === "message" ? (
              <textarea
                placeholder={steps[currentStep].placeholder}
                value={activeValue}
                onChange={(e) => updateField(activeField, e.target.value)}
                className={`custom-scrollbar max-h-[200px] resize-none overflow-y-auto ${FIELD_CLASS}`}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  const newHeight = Math.min(target.scrollHeight, 200)
                  target.style.height = `${newHeight}px`
                  target.classList.toggle("scrollable", newHeight >= 200)
                }}
              />
            ) : (
              <input
                type="text"
                placeholder={steps[currentStep].placeholder}
                value={activeValue}
                onChange={(e) => updateField(activeField, e.target.value)}
                className={FIELD_CLASS}
              />
            )}
          </div>

          <div className="flex min-h-[48px] w-full items-center justify-between gap-4">
            <div className="flex justify-start">
              <AnimatePresence mode="wait">
                {currentStep > 0 && (
                  <motion.button
                    key="back-button"
                    type="button"
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      duration: 0.3,
                    }}
                    onClick={() => setCurrentStep((prev) => prev - 1)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-300/50 px-4 py-3 text-gray-600 transition-all duration-300 hover:scale-105 hover:text-gray-800"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span className="font-kode text-sm uppercase tracking-wide">
                      {t("contact.actions.back")}
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-end">
              <motion.button
                key={`next-button-${currentStep}`}
                type="button"
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  duration: 0.3,
                }}
                onClick={() => void handleNext()}
                disabled={!canSubmit}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all duration-300 ${
                  canSubmit
                    ? "border-cyan-400 text-cyan-500 hover:scale-105 hover:text-cyan-600"
                    : "cursor-not-allowed border-gray-200 text-gray-400"
                }`}
              >
                <span className="font-kode text-sm uppercase tracking-wide">
                  {isSending
                    ? t("contact.actions.sending")
                    : isLastStep
                      ? t("contact.actions.send")
                      : t("contact.actions.next")}
                </span>
                {isSending ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {isLastStep ? (
                      <polyline points="20 6 9 17 4 12" />
                    ) : (
                      <polyline points="9 18 15 12 9 6" />
                    )}
                  </svg>
                )}
              </motion.button>
            </div>
          </div>

          <div
            className={`mt-2 grid grid-cols-1 justify-start gap-4 sm:grid-cols-3 md:mt-4${
              steps.some((step) => formData[step.field]?.trim())
                ? " min-h-[80px] md:min-h-[100px]"
                : ""
            }`}
          >
            {steps.map((step, index) => {
              const value = formData[step.field]?.trim()
              if (!value) return null

              return (
                <div
                  key={step.field}
                  onClick={() => setCurrentStep(index)}
                  className={`box-border min-h-[72px] w-full cursor-pointer rounded-xl border border-white/20 bg-white/10 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-300 ${
                    index === currentStep
                      ? "text-cyan-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <h4 className="mb-1 truncate font-kode text-xs uppercase tracking-wider text-current">
                    {step.label}
                  </h4>
                  <p className="line-clamp-2 font-home-title text-xs leading-relaxed text-current md:text-sm">
                    {formData[step.field]}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="sr-only">
          <h1>Contact — Nomad403 (Nomad 403)</h1>
          <p>
            Contactez Nomad403, Nomad 403, nomad-403, développeur freelance
            spécialisé dans le développement web, mobile et intégration IA basé
            à Paris. Partenaire de confiance pour startups, studios créatifs,
            marques de luxe et entreprises tech. Expertise en React, Next.js,
            TypeScript, Kotlin, Swift, et intégration d&apos;intelligence
            artificielle.
          </p>
          <p>
            Services proposés : développement d&apos;applications web et mobiles
            sur mesure, intégration d&apos;intelligence artificielle, consulting
            technique, architecture de solutions, MVP et prototypage rapide,
            refactoring et optimisation, maintenance et évolution. Approche
            centrée sur l&apos;expérience utilisateur, la performance et la
            scalabilité.
          </p>
          <p>
            Technologies maîtrisées : Next.js, React, TypeScript, Tailwind CSS,
            Kotlin, Jetpack Compose, Swift, SwiftUI, Azure OpenAI, Power
            Automate, Three.js, React Three Fiber. Méthodologie : conception
            UX/UI, architecture scalable, développement agile, tests
            automatisés, déploiement continu.
          </p>
          <p>
            Portfolio créatif et technique démontrant l&apos;excellence dans le
            développement d&apos;interfaces utilisateur modernes,
            d&apos;expériences interactives 3D, et de solutions
            d&apos;automatisation intelligente. Partenaire de confiance pour les
            projets ambitieux nécessitant expertise technique et vision créative
            dans l&apos;écosystème tech parisien.
          </p>
          <p>
            Recherches associées : nomad403 contact, nomad 403 freelance,
            nomad-403 hire, nomad403 developer paris, nomad 403 web developer,
            nomad-403 mobile developer, nomad403 react developer, nomad 403
            kotlin, nomad-403 swift, nomad403 typescript, nomad 403 nextjs,
            nomad-403 ai developer, nomad403 portfolio contact.
          </p>
        </div>
      </div>
    </div>
  )
}
