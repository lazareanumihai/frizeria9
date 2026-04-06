/**
 * Frizeria 9 — Home Page
 * Design: Dark Luxury Barbershop
 * Palette: Near-black #111, Gold #D4AF37, Cream #F5F0E8
 * Typography: Cormorant Garamond (display) + Raleway (body)
 */

import { useState, useEffect, useRef } from "react";
import { Scissors, Clock, Phone, MapPin, ChevronDown, Menu, X, Check, Star, Calendar } from "lucide-react";
import BookingModal from "@/components/BookingModal";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663495348750/AzJrPCXs6rygdqwEVH7v2L/hero-barber-72bwpZC7UCSRkBLLkfNbZM.webp";
const HAIRCUT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663495348750/AzJrPCXs6rygdqwEVH7v2L/service-haircut-46zJPjbCFqJoCfXL9u7sG3.webp";
const SHAVE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663495348750/AzJrPCXs6rygdqwEVH7v2L/service-shave-PWcPeEFcLmid3YHWoMgPN3.webp";
const TOOLS_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663495348750/AzJrPCXs6rygdqwEVH7v2L/barber-tools-SddCNPutLfKtRgTDNMM9Gj.webp";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="container flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2 group">
            <span className="text-gold font-bold text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Frizeria
            </span>
            <span
              className="text-2xl font-bold px-2 py-0.5 border border-gold text-gold"
              style={{ fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}
            >
              9
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: "Servicii", id: "servicii" },
              { label: "Programare", id: "programare" },
              { label: "Contact", id: "contact" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-sm tracking-widest uppercase text-foreground/70 hover:text-gold transition-colors duration-300"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => setBookingOpen(true)}
              className="btn-gold px-6 py-2.5 text-xs rounded-none"
            >
              Programează-te
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-foreground/80 hover:text-gold transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-background/98 backdrop-blur-md border-t border-border px-6 py-6 flex flex-col gap-5">
            {[
              { label: "Servicii", id: "servicii" },
              { label: "Programare", id: "programare" },
              { label: "Contact", id: "contact" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-left text-sm tracking-widest uppercase text-foreground/70 hover:text-gold transition-colors"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { setBookingOpen(true); setMenuOpen(false); }}
              className="btn-gold px-6 py-3 text-xs rounded-none w-full"
            >
              Programează-te
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Frizeria 9 interior"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Hero content */}
        <div className="container relative z-10 pt-24 pb-16">
          <div className="max-w-xl">
            <div className="animate-fade-in-up opacity-0 animate-delay-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="gold-divider w-12" />
                <span
                  className="text-xs tracking-[0.3em] uppercase text-gold"
                  style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                >
                  Barbershop Premium
                </span>
              </div>
            </div>

            <h1
              className="animate-fade-in-up opacity-0 animate-delay-200 text-6xl md:text-8xl font-bold leading-none mb-6"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}
            >
              Frizeria
              <br />
              <span className="text-gold italic">9</span>
            </h1>

            <p
              className="animate-fade-in-up opacity-0 animate-delay-300 text-foreground/70 text-base md:text-lg leading-relaxed mb-10 max-w-sm"
              style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
            >
              Arta bărbieritului și a tunsului, redefinită. O experiență premium pentru bărbatul modern.
            </p>

            <div className="animate-fade-in-up opacity-0 animate-delay-400 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setBookingOpen(true)}
                className="btn-gold px-8 py-4 text-sm rounded-none flex items-center gap-2 justify-center"
              >
                <Calendar size={16} />
                Programează-te Acum
              </button>
              <button
                onClick={() => scrollTo("servicii")}
                className="btn-outline-gold px-8 py-4 text-sm rounded-none flex items-center gap-2 justify-center"
              >
                Descoperă Serviciile
              </button>
            </div>

            {/* Stats */}
            <div className="animate-fade-in-up opacity-0 animate-delay-500 flex gap-8 mt-12 pt-8 border-t border-border">
              {[
                { value: "500+", label: "Clienți Mulțumiți" },
                { value: "5★", label: "Rating Mediu" },
                { value: "10+", label: "Ani Experiență" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-2xl font-bold text-gold"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-xs text-foreground/50 tracking-wider uppercase mt-0.5"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={() => scrollTo("servicii")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-foreground/40 hover:text-gold transition-colors animate-bounce"
        >
          <ChevronDown size={28} />
        </button>
      </section>

      {/* ── SERVICES ── */}
      <section id="servicii" className="py-24 md:py-32 relative overflow-hidden">
        <div className="section-number" style={{ top: "2rem", right: "2rem" }}>01</div>
        <div className="container">
          <AnimatedSection>
            <div className="flex items-center gap-4 mb-3">
              <div className="gold-divider w-12" />
              <span
                className="text-xs tracking-[0.3em] uppercase text-gold"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
              >
                Ce Oferim
              </span>
            </div>
            <h2
              className="text-4xl md:text-6xl font-bold mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Serviciile Noastre
            </h2>
            <p
              className="text-foreground/60 max-w-md mb-16"
              style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
            >
              Fiecare serviciu este executat cu precizie și atenție la detalii, folosind produse premium.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Tuns */}
            <AnimatedSection>
              <div className="card-lift group relative overflow-hidden border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={HAIRCUT_IMG}
                    alt="Serviciu tuns"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                </div>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div
                        className="text-xs tracking-[0.25em] uppercase text-gold mb-2"
                        style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                      >
                        Serviciu 01
                      </div>
                      <h3
                        className="text-3xl font-bold"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        Tuns
                      </h3>
                    </div>
                    <Scissors className="text-gold mt-1" size={28} />
                  </div>
                  <p
                    className="text-foreground/60 text-sm leading-relaxed mb-6"
                    style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                  >
                    Tuns profesional adaptat stilului tău. Consultație inclusă, finisaj cu produse premium.
                  </p>
                  <div className="flex items-center gap-3">
                    {["Consultație", "Spălat", "Finisaj"].map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-3 py-1 border border-gold/30 text-gold/70 tracking-wider"
                        style={{ fontFamily: "'Raleway', sans-serif" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Bărbierit */}
            <AnimatedSection>
              <div className="card-lift group relative overflow-hidden border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={SHAVE_IMG}
                    alt="Serviciu bărbierit"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                </div>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div
                        className="text-xs tracking-[0.25em] uppercase text-gold mb-2"
                        style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                      >
                        Serviciu 02
                      </div>
                      <h3
                        className="text-3xl font-bold"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        Bărbierit
                      </h3>
                    </div>
                    <svg className="text-gold mt-1" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3l18 18M8.5 8.5C7 10 6 12 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-2-1-4-2.5-5.5" />
                      <path d="M12 2v4M12 2c-1.5 0-3 .5-4 1.5" />
                    </svg>
                  </div>
                  <p
                    className="text-foreground/60 text-sm leading-relaxed mb-6"
                    style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                  >
                    Bărbierit clasic cu lamă dreaptă. Prosop cald, spumă artizanală și after-shave de calitate.
                  </p>
                  <div className="flex items-center gap-3">
                    {["Lamă dreaptă", "Prosop cald", "After-shave"].map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-3 py-1 border border-gold/30 text-gold/70 tracking-wider"
                        style={{ fontFamily: "'Raleway', sans-serif" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 md:py-32 relative overflow-hidden border-t border-border">
        <div className="section-number" style={{ top: "2rem", right: "2rem" }}>02</div>
        <div className="container">
          <AnimatedSection>
            <div className="flex items-center gap-4 mb-3">
              <div className="gold-divider w-12" />
              <span
                className="text-xs tracking-[0.3em] uppercase text-gold"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
              >
                Tarife
              </span>
            </div>
            <h2
              className="text-4xl md:text-6xl font-bold mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Prețurile Noastre
            </h2>
            <p
              className="text-foreground/60 max-w-md mb-16"
              style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
            >
              Tarife transparente și competitive. Fiecare serviciu include consultație și finisaj profesional.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Tuns */}
            <AnimatedSection>
              <div className="border border-border bg-card hover:border-gold/40 transition-all duration-300 overflow-hidden group">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div
                        className="text-xs tracking-[0.25em] uppercase text-gold mb-2"
                        style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                      >
                        Serviciu 01
                      </div>
                      <h3
                        className="text-3xl font-bold"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        Tuns
                      </h3>
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-border">
                    <div
                      className="text-4xl font-bold text-gold mb-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      40 RON
                    </div>
                    <p
                      className="text-xs text-foreground/50 tracking-wider"
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                      Preț standard
                    </p>
                  </div>

                  <p
                    className="text-foreground/60 text-sm leading-relaxed mb-6"
                    style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                  >
                    Tuns profesional adaptat stilului tău, cu consultație inclusă și finisaj cu produse premium.
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      "Consultație personalizată",
                      "Spălare și tratament",
                      "Tuns precis cu foarfeci",
                      "Finisaj cu produse premium",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <Check size={12} className="text-gold mt-1.5 shrink-0" />
                        <span
                          className="text-xs text-foreground/70"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-foreground/40 pt-4 border-t border-border">
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>⏱ Durată: 45 minute</span>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Bărbierit */}
            <AnimatedSection>
              <div className="border border-border bg-card hover:border-gold/40 transition-all duration-300 overflow-hidden group">
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div
                        className="text-xs tracking-[0.25em] uppercase text-gold mb-2"
                        style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                      >
                        Serviciu 02
                      </div>
                      <h3
                        className="text-3xl font-bold"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        Bărbierit
                      </h3>
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-border">
                    <div
                      className="text-4xl font-bold text-gold mb-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      35 RON
                    </div>
                    <p
                      className="text-xs text-foreground/50 tracking-wider"
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                      Preț standard
                    </p>
                  </div>

                  <p
                    className="text-foreground/60 text-sm leading-relaxed mb-6"
                    style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                  >
                    Bărbierit clasic cu lamă dreaptă, prosop cald și spumă artizanală de calitate superioară.
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      "Prosop cald și abur",
                      "Spumă artizanală premium",
                      "Lamă dreaptă profesională",
                      "After-shave și balsam",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <Check size={12} className="text-gold mt-1.5 shrink-0" />
                        <span
                          className="text-xs text-foreground/70"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-foreground/40 pt-4 border-t border-border">
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>⏱ Durată: 30 minute</span>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Tuns + Bărbierit */}
            <AnimatedSection>
              <div className="border-2 border-gold bg-card/50 overflow-hidden group relative">
                <div className="absolute top-4 right-4 bg-gold text-background px-3 py-1 text-xs font-bold tracking-wider" style={{ fontFamily: "'Raleway', sans-serif" }}>
                  POPULAR
                </div>
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div
                        className="text-xs tracking-[0.25em] uppercase text-gold mb-2"
                        style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                      >
                        Serviciu 03
                      </div>
                      <h3
                        className="text-3xl font-bold"
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      >
                        Pachet Complet
                      </h3>
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-gold/20">
                    <div
                      className="text-4xl font-bold text-gold mb-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      65 RON
                    </div>
                    <p
                      className="text-xs text-foreground/50 tracking-wider"
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                      Economisești 10 RON!
                    </p>
                  </div>

                  <p
                    className="text-foreground/60 text-sm leading-relaxed mb-6"
                    style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                  >
                    Experiența completă — tuns profesional + bărbierit clasic în același serviciu.
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      "Tuns cu consultație",
                      "Spălare și tratament",
                      "Prosop cald și abur",
                      "Bărbierit cu lamă dreaptă",
                      "Finisaj premium complet",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <Check size={12} className="text-gold mt-1.5 shrink-0" />
                        <span
                          className="text-xs text-foreground/70"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-foreground/40 pt-4 border-t border-gold/20">
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>⏱ Durată: 75 minute</span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Additional Info */}
          <AnimatedSection className="mt-16">
            <div className="border border-gold/20 bg-background/30 p-8 md:p-10">
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    title: "Metode de Plată",
                    items: ["Numerar", "Card (Visa/Mastercard)", "Plată online"],
                  },
                  {
                    title: "Oferte Speciale",
                    items: ["Abonament lunar — 10% reducere", "Referrals — 15 RON bonus", "Clienți noi — 5 RON reducere"],
                  },
                  {
                    title: "Politica Anulării",
                    items: ["Anulare cu 24h înainte — fără taxă", "Anulare cu mai puțin de 24h — 50% din preț", "No-show — taxa completă"],
                  },
                ].map((section) => (
                  <div key={section.title}>
                    <h4
                      className="text-sm font-bold text-gold mb-3 tracking-wider uppercase"
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                      {section.title}
                    </h4>
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="text-xs text-foreground/60 flex items-start gap-2"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          <span className="text-gold mt-1.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── ABOUT / TOOLS SECTION ── */}
      <section className="py-24 md:py-32 relative overflow-hidden border-t border-border">
        <div className="absolute inset-0">
          <img src={TOOLS_IMG} alt="Unelte frizerie" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-background/80" />
        </div>
        <div className="container relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="flex items-center gap-4 mb-3">
                <div className="gold-divider w-12" />
                <span
                  className="text-xs tracking-[0.3em] uppercase text-gold"
                  style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                >
                  Despre Noi
                </span>
              </div>
              <h2
                className="text-4xl md:text-5xl font-bold mb-6"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Meșteșug &amp;
                <br />
                <span className="text-gold italic">Tradiție</span>
              </h2>
              <p
                className="text-foreground/60 leading-relaxed mb-6"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                La Frizeria 9, fiecare client este tratat cu atenție individuală. Combinăm tehnicile clasice de bărbierit cu stilul modern, oferind o experiență completă și relaxantă.
              </p>
              <p
                className="text-foreground/60 leading-relaxed mb-8"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                Folosim exclusiv produse de înaltă calitate și unelte profesionale pentru a garanta cele mai bune rezultate.
              </p>
              <div className="space-y-3">
                {[
                  "Produse premium selectate cu grijă",
                  "Tehnici clasice și moderne combinate",
                  "Atmosferă relaxantă și primitoare",
                  "Programare rapidă și flexibilă",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Check size={14} className="text-gold shrink-0" />
                    <span
                      className="text-sm text-foreground/70"
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Scissors size={24} />, label: "Tuns Profesional", desc: "Tehnici moderne adaptate" },
                  { icon: <Star size={24} />, label: "Calitate Premium", desc: "Produse de top" },
                  { icon: <Clock size={24} />, label: "Punctualitate", desc: "Respectăm programul" },
                  { icon: <Phone size={24} />, label: "Suport Rapid", desc: "Răspundem prompt" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="border border-border bg-card/50 p-6 group hover:border-gold/50 transition-colors duration-300"
                  >
                    <div className="text-gold mb-3 group-hover:scale-110 transition-transform duration-300">
                      {item.icon}
                    </div>
                    <div
                      className="font-semibold text-sm mb-1"
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-xs text-foreground/50"
                      style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── BOOKING CTA ── */}
      <section id="programare" className="py-24 md:py-32 relative overflow-hidden border-t border-border">
        <div className="section-number" style={{ top: "2rem", left: "2rem" }}>03</div>
        <div className="container">
          <AnimatedSection>
            <div className="border border-gold/20 bg-card/30 p-12 md:p-16 text-center relative overflow-hidden">
              {/* Decorative corners */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-gold/40" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-gold/40" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-gold/40" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-gold/40" />

              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="gold-divider w-16" />
                <span
                  className="text-xs tracking-[0.3em] uppercase text-gold"
                  style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                >
                  Rezervă Acum
                </span>
                <div className="gold-divider w-16" />
              </div>

              <h2
                className="text-4xl md:text-6xl font-bold mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Programează-te
                <br />
                <span className="text-gold italic">Online</span>
              </h2>

              <p
                className="text-foreground/60 max-w-md mx-auto mb-10 leading-relaxed"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                Alege serviciul, data și ora care ți se potrivesc. Confirmare imediată, fără așteptare.
              </p>

              <button
                onClick={() => setBookingOpen(true)}
                className="btn-gold px-12 py-5 text-sm rounded-none inline-flex items-center gap-3"
              >
                <Calendar size={18} />
                Alege Data și Ora
              </button>

              <div className="mt-8 flex items-center justify-center gap-6 text-foreground/40 text-xs tracking-wider uppercase" style={{ fontFamily: "'Raleway', sans-serif" }}>
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  Luni – Sâmbătă
                </div>
                <div className="w-1 h-1 rounded-full bg-gold/40" />
                <div>08:00 – 18:00</div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 md:py-32 border-t border-border relative overflow-hidden">
        <div className="section-number" style={{ top: "2rem", right: "2rem" }}>04</div>
        <div className="container">
          <AnimatedSection>
            <div className="flex items-center gap-4 mb-3">
              <div className="gold-divider w-12" />
              <span
                className="text-xs tracking-[0.3em] uppercase text-gold"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
              >
                Găsește-ne
              </span>
            </div>
            <h2
              className="text-4xl md:text-6xl font-bold mb-16"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Contact
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Phone size={22} />,
                title: "Telefon",
                value: "0758 900 900",
                sub: "Sună-ne oricând în program",
                href: "tel:0758900900",
              },
              {
                icon: <Clock size={22} />,
                title: "Program",
                value: "Luni – Sâmbătă",
                sub: "08:00 – 18:00",
                href: null,
              },
              {
                icon: <MapPin size={22} />,
                title: "Locație",
                value: "Frizeria 9",
                sub: "Vino să ne vizitezi",
                href: null,
              },
            ].map((item) => (
              <AnimatedSection key={item.title}>
                <div className="border border-border bg-card p-8 group hover:border-gold/40 transition-colors duration-300">
                  <div className="text-gold mb-4">{item.icon}</div>
                  <div
                    className="text-xs tracking-[0.25em] uppercase text-foreground/40 mb-2"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  >
                    {item.title}
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-xl font-semibold text-foreground hover:text-gold transition-colors block mb-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <div
                      className="text-xl font-semibold mb-1"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {item.value}
                    </div>
                  )}
                  <div
                    className="text-sm text-foreground/50"
                    style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                  >
                    {item.sub}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="text-gold font-bold text-lg"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Frizeria
            </span>
            <span
              className="text-lg font-bold px-1.5 py-0.5 border border-gold text-gold"
              style={{ fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}
            >
              9
            </span>
          </div>
          <p
            className="text-xs text-foreground/30 tracking-wider"
            style={{ fontFamily: "'Raleway', sans-serif" }}
          >
            © {new Date().getFullYear()} Frizeria 9. Toate drepturile rezervate.
          </p>
          <a
            href="tel:0758900900"
            className="text-xs text-foreground/50 hover:text-gold transition-colors tracking-wider"
            style={{ fontFamily: "'Raleway', sans-serif" }}
          >
            0758 900 900
          </a>
        </div>
      </footer>

      {/* Booking Modal */}
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
