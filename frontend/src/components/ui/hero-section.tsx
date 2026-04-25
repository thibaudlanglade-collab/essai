import { motion } from "framer-motion"
import { Sparkles, Shield, Server, Smartphone } from "lucide-react"

const fadeUp = (delay = 0, duration = 0.6) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
})

export function HeroSection(_: { onComprendreClick?: () => void } = {}) {
  return (
    <section
      className="relative flex flex-col items-center overflow-hidden bg-background"
      style={{ minHeight: "calc(100vh - 98px)" }}
    >
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 pt-10 sm:pt-14 pb-0">
        {/* Icon */}
        <motion.div {...fadeUp(0, 0.5)} className="mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg">
            <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.1)}
          className="text-center font-display text-[2.5rem] leading-[1.05] sm:text-5xl md:text-6xl lg:text-[5rem] sm:leading-[0.95] tracking-tight text-foreground max-w-2xl px-2"
        >
          Bienvenue chez{" "}
          <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic" }}>
            Synthèse
          </em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fadeUp(0.2)}
          className="mt-4 sm:mt-5 text-center text-[15px] sm:text-base md:text-lg text-muted-foreground max-w-[680px] leading-relaxed font-body px-2"
        >
          On suit toutes les nouvelles IA pour vous. On les adapte à votre
          métier. On les installe dans les outils que vous utilisez déjà —
          Gmail, Excel, WhatsApp, votre CRM. Vous profitez du meilleur de l'IA
          sans rien à apprendre, sans rien à changer.
        </motion.p>

        {/* Italic tagline */}
        <motion.p
          {...fadeUp(0.25)}
          className="mt-3 text-center text-base text-violet-600 italic font-medium font-body"
        >
          Vous n'êtes pas dépassé. Vous êtes en avance.
        </motion.p>

        {/* Badges */}
        <motion.div {...fadeUp(0.3)} className="mt-6 flex flex-col items-center gap-4 w-full">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center px-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
              <Sparkles className="h-3 w-3" />
              100% personnalisable
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200">
              <Shield className="h-3 w-3" />
              RGPD conforme
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              <Server className="h-3 w-3" />
              Hébergé en France
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
              <Smartphone className="h-3 w-3" />
              Accessible sur mobile
            </span>
          </div>
        </motion.div>

        {/* Possibilités ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-8 w-full max-w-3xl overflow-hidden"
        >
          <div className="relative flex overflow-x-hidden">
            <div className="flex gap-0 animate-scroll-left whitespace-nowrap">
              {([
                "Extraction de documents",
                "Gestion des emails",
                "Planification",
                "Transcription de réunions",
                "Automatisations",
                "Agents IA",
                "Extraction de documents",
                "Gestion des emails",
                "Planification",
                "Transcription de réunions",
                "Automatisations",
                "Agents IA",
                "Extraction de documents",
                "Gestion des emails",
                "Planification",
                "Transcription de réunions",
                "Automatisations",
                "Agents IA",
              ]).map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-4">
                  <span className="text-violet-400 text-xs">✦</span>
                  <span className="text-xs text-muted-foreground font-medium tracking-wide">
                    {item}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>
    </section>
  )
}

