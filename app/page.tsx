"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Zap, Shield, Activity } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header - Ultra Minimal */}
      <header className="border-b border-black/10 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/medi.png"
              alt="MedSync"
              width={36}
              height={36}
              className="rounded"
              priority
            />
            <span className="text-xl font-bold tracking-tight">MedSync</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/login">
              <Button variant="ghost" className="text-sm font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-black hover:bg-black/90 text-white text-sm font-medium px-6">
                GET STARTED →
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Virgil Abloh Bold Typography */}
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="container mx-auto px-6 lg:px-12 py-20 lg:py-32">
          <div className="max-w-6xl mx-auto">
            {/* Label - Virgil signature style with quotation marks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <span className="text-xs font-mono tracking-widest text-black/40 uppercase">
                "HEALTHCARE PLATFORM"
              </span>
            </motion.div>

            {/* Massive Headline */}
            <h1 className="text-[64px] lg:text-[96px] leading-[0.95] font-bold tracking-tight mb-8">
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="block"
              >
                AI-POWERED
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="block"
              >
                CLINICAL
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-black/40 block"
              >
                COLLABORATION
              </motion.span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-xl lg:text-2xl text-black/60 max-w-2xl mb-12 font-light"
            >
              Bridging doctors, laboratories, and patients through real-time intelligence.
              Professional. Precise. Human.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex items-center space-x-6"
            >
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-black hover:bg-black/90 text-white px-8 py-6 text-base font-medium"
                >
                  ACCESS PORTAL →
                </Button>
              </Link>
              <span className="text-sm font-mono text-black/40">v2.0.25</span>
            </motion.div>

            {/* Stats Grid - Industrial */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-black/10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="text-4xl font-bold mb-2">3</div>
                <div className="text-sm text-black/60 font-mono uppercase tracking-wide">User Roles</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="text-4xl font-bold mb-2">AI</div>
                <div className="text-sm text-black/60 font-mono uppercase tracking-wide">Powered Analysis</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="text-4xl font-bold mb-2">∞</div>
                <div className="text-sm text-black/60 font-mono uppercase tracking-wide">Real-time Sync</div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Grid Overlay - Subtle */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
          <div className="h-full w-full" style={{
            backgroundImage: `linear-gradient(to right, black 1px, transparent 1px),
                             linear-gradient(to bottom, black 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
      </section>

      {/* Features Grid - Deconstructed & Labeled */}
      <section className="border-b border-black/10">
        <div className="container mx-auto px-6 lg:px-12 py-20 lg:py-32">
          {/* Section Label */}
          <div className="mb-16">
            <span className="text-xs font-mono tracking-widest text-black/40 uppercase">
              "CORE FUNCTIONALITY"
            </span>
          </div>

          {/* 3x2 Grid with borders */}
          <div className="grid lg:grid-cols-3 gap-[1px] bg-black/10">
            {/* Feature 01 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white p-10 lg:p-12 group hover:bg-black/[0.02] transition-colors"
            >
              <div className="mb-8">
                <span className="text-xs font-mono text-black/40">01</span>
              </div>
              <div className="mb-6">
                <Activity className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">"AI ANALYSIS"</h3>
              <p className="text-black/60 leading-relaxed mb-6">
                Medical image interpretation with confidence scoring. X-ray fracture detection and brain tumor MRI analysis.
              </p>
              <div className="flex items-center text-sm font-mono text-black/40">
                GEMINI + ML →
              </div>
            </motion.div>

            {/* Feature 02 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white p-10 lg:p-12 group hover:bg-black/[0.02] transition-colors"
            >
              <div className="mb-8">
                <span className="text-xs font-mono text-black/40">02</span>
              </div>
              <div className="mb-6">
                <Zap className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">"REAL-TIME"</h3>
              <p className="text-black/60 leading-relaxed mb-6">
                Instant communication between doctors, labs, and patients. Live notifications and synchronized dashboards.
              </p>
              <div className="flex items-center text-sm font-mono text-black/40">
                WEBSOCKET →
              </div>
            </motion.div>

            {/* Feature 03 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-10 lg:p-12 group hover:bg-black/[0.02] transition-colors"
            >
              <div className="mb-8">
                <span className="text-xs font-mono text-black/40">03</span>
              </div>
              <div className="mb-6">
                <Shield className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">"SECURE"</h3>
              <p className="text-black/60 leading-relaxed mb-6">
                Role-based access control with audit trails. HIPAA-compliant infrastructure and encrypted data storage.
              </p>
              <div className="flex items-center text-sm font-mono text-black/40">
                RLS + JWT →
              </div>
            </motion.div>

            {/* Feature 04 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white p-10 lg:p-12 group hover:bg-black/[0.02] transition-colors"
            >
              <div className="mb-8">
                <span className="text-xs font-mono text-black/40">04</span>
              </div>
              <div className="mb-6">
                <div className="h-8 w-8 flex items-center justify-center">
                  <span className="text-2xl">👨‍⚕️</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">"DOCTORS"</h3>
              <p className="text-black/60 leading-relaxed mb-6">
                Complete patient management with AI diagnostic support. Review reports, schedule consultations, communicate.
              </p>
              <div className="flex items-center text-sm font-mono text-black/40">
                DASHBOARD →
              </div>
            </motion.div>

            {/* Feature 05 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white p-10 lg:p-12 group hover:bg-black/[0.02] transition-colors"
            >
              <div className="mb-8">
                <span className="text-xs font-mono text-black/40">05</span>
              </div>
              <div className="mb-6">
                <div className="h-8 w-8 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">"PATIENTS"</h3>
              <p className="text-black/60 leading-relaxed mb-6">
                Access health records and communicate with healthcare providers. AI assistant for medication information.
              </p>
              <div className="flex items-center text-sm font-mono text-black/40">
                PORTAL →
              </div>
            </motion.div>

            {/* Feature 06 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white p-10 lg:p-12 group hover:bg-black/[0.02] transition-colors"
            >
              <div className="mb-8">
                <span className="text-xs font-mono text-black/40">06</span>
              </div>
              <div className="mb-6">
                <div className="h-8 w-8 flex items-center justify-center">
                  <span className="text-2xl">🔬</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4">"LABS"</h3>
              <p className="text-black/60 leading-relaxed mb-6">
                Sample management and result uploads with automatic AI processing. Coordinate directly with physicians.
              </p>
              <div className="flex items-center text-sm font-mono text-black/40">
                INTERFACE →
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Visualization Section - Futuristic */}
      <section className="border-b border-black/10 bg-gradient-to-b from-white to-black/[0.02]">
        <div className="container mx-auto px-6 lg:px-12 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <span className="text-xs font-mono tracking-widest text-black/40 uppercase">
                "TECHNICAL ARCHITECTURE"
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl lg:text-6xl font-bold tracking-tight mb-8"
            >
              BUILT FOR
              <br />
              <span className="text-black/40">SCALE</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl text-black/60 mb-16 font-light max-w-2xl mx-auto"
            >
              Next.js 15, Supabase, Google Gemini AI. Production-grade infrastructure with real-time capabilities.
            </motion.p>

            {/* Tech Stack Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[1px] bg-black/10">
              <motion.div
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
                className="bg-white p-8 hover:bg-black/[0.02] transition-colors"
              >
                <div className="text-sm font-mono text-black/40 mb-2">FRONTEND</div>
                <div className="font-bold">Next.js 15</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
                className="bg-white p-8 hover:bg-black/[0.02] transition-colors"
              >
                <div className="text-sm font-mono text-black/40 mb-2">BACKEND</div>
                <div className="font-bold">Supabase</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.6 }}
                className="bg-white p-8 hover:bg-black/[0.02] transition-colors"
              >
                <div className="text-sm font-mono text-black/40 mb-2">AI/ML</div>
                <div className="font-bold">Gemini API</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.7 }}
                className="bg-white p-8 hover:bg-black/[0.02] transition-colors"
              >
                <div className="text-sm font-mono text-black/40 mb-2">VIDEO</div>
                <div className="font-bold">Agora RTC</div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Deconstructed */}
      <section className="border-b border-black/10">
        <div className="container mx-auto px-6 lg:px-12 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="mb-6">
                  <span className="text-xs font-mono tracking-widest text-black/40 uppercase">
                    "GET ACCESS"
                  </span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                  Start collaborating
                  <br />
                  today.
                </h2>
                <p className="text-xl text-black/60 font-light">
                  Join healthcare professionals transforming patient care.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-start gap-4"
              >
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-black hover:bg-black/90 text-white px-10 py-6 text-base font-medium"
                  >
                    CREATE ACCOUNT →
                  </Button>
                </Link>
                <span className="text-sm text-black/40 font-mono">
                  // FREE TRIAL AVAILABLE
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Minimal Archive */}
      <footer className="bg-black text-white">
        <div className="container mx-auto px-6 lg:px-12 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="text-xs font-mono text-white/40 mb-4 tracking-widest uppercase">
                Platform
              </div>
              <ul className="space-y-3 text-sm text-white/80">
                <li><Link href="#" className="hover:text-white transition-colors">Platform</Link></li>
                <li><Link href="/doctors" className="hover:text-white transition-colors">Doctors</Link></li>
                <li><Link href="/patients" className="hover:text-white transition-colors">Patients</Link></li>
                <li><Link href="/labs" className="hover:text-white transition-colors">Laboratories</Link></li>
                <li><Link href="/ai" className="hover:text-white transition-colors">AI Assistant</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40 mb-4 tracking-widest uppercase">
                Resources
              </div>
              <ul className="space-y-3 text-sm text-white/80">
                <li><Link href="/resources" className="hover:text-white transition-colors">Resources</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40 mb-4 tracking-widest uppercase">
                Company
              </div>
              <ul className="space-y-3 text-sm text-white/80">
                <li><Link href="/about" className="hover:text-white transition-colors">Company</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40 mb-4 tracking-widest uppercase">
                Connect
              </div>
              <ul className="space-y-3 text-sm text-white/80">
                <li><Link href="#" className="hover:text-white transition-colors">Connect</Link></li>
                <li><Link href="https://twitter.com" className="hover:text-white transition-colors">Twitter</Link></li>
                <li><Link href="https://linkedin.com" className="hover:text-white transition-colors">LinkedIn</Link></li>
                <li><Link href="https://github.com" className="hover:text-white transition-colors">GitHub</Link></li>
                <li><Link href="mailto:contact@medsync.com" className="hover:text-white transition-colors">Email</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/medi.png"
                alt="MedSync"
                width={24}
                height={24}
                className="rounded"
                priority
              />
              <span className="font-bold">MedSync</span>
            </div>
            <div className="text-sm text-white/40 font-mono">
              "© 2025" — Healthcare Platform v2.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}