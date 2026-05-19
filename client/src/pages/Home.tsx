/**
 * Frizeria 9 — Home Page
 * Design: Dark Luxury Barbershop
 * Palette: Near-black #111, Gold #D4AF37, Cream #F5F0E8
 * Typography: Cormorant Garamond (display) + Raleway (body)
 */

import { useState, useEffect, useRef } from "react";
import { Scissors, Clock, Phone, MapPin, ChevronDown, Menu, X, Check, Star, Calendar } from "lucide-react";
import BookingModal from "@/components/BookingModal";
import { trpc } from "@/lib/trpc";

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
  const { data: services = [], isLoading, error } = trpc.services.getAll.useQuery();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  // Service images mapping
  const serviceImages: Record<string, string> = {
    "Tuns": HAIRCUT_IMG,
    "Bărbierit": SHAVE_IMG,
    "Tuns + Bărbierit": TOOLS_IMG,
  };

  const getServiceImage = (serviceName: string) => {
    return serviceImages[serviceName] || HAIRCUT_IMG;
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
              className="px-6 py-2 bg-gold text-background font-semibold tracking-wider uppercase text-xs hover:bg-gold/90 transition-colors"
              style={{ fontFamily: "'Raleway', sans-serif" }}
            >
              Programează-te
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-foreground hover:text-gold transition-colors"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md">
            <div className="container py-4 space-y-3">
              {[
                { label: "Servicii", id: "servicii" },
                { label: "Programare", id: "programare" },
                { label: "Contact", id: "contact" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="block w-full text-left py-2 text-sm tracking-widest uppercase text-foreground/70 hover:text-gold transition-colors"
                  style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setBookingOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-2 bg-gold text-background font-semibold tracking-wider uppercase text-xs hover:bg-gold/90 transition-colors mt-4"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                Programează-te
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
        style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />

        <div className="container relative z-10 max-w-2xl">
          <div className="animate-fade-in-up opacity-0 animate-delay-200 space-y-6">
            <div className="flex items-center gap-3">
              <div className="gold-divider w-8" />
              <span
                className="text-xs tracking-[0.3em] uppercase text-gold"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
              >
                Bun venit la
              </span>
            </div>

            <h1
              className="text-6xl md:text-7xl font-bold leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Frizeria 9
            </h1>

            <p
              className="text-lg text-foreground/80 leading-relaxed max-w-md"
              style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
            >
              Arta barbierului și a tunsului, redefinită. O experiență premium pentru barbatul modern.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => setBookingOpen(true)}
                className="px-8 py-3 bg-gold text-background font-semibold tracking-wider uppercase text-sm hover:bg-gold/90 transition-colors flex items-center justify-center gap-2"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                <Calendar size={18} />
                Programează-te Acum
              </button>
              <button
                onClick={() => scrollTo("servicii")}
                className="px-8 py-3 border-2 border-gold text-gold font-semibold tracking-wider uppercase text-sm hover:bg-gold/10 transition-colors"
                style={{ fontFamily: "'Raleway', sans-serif" }}
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
            {isLoading ? (
              <div className="col-span-full text-center py-12 text-foreground/60">
                Se încarcă serviciile...
              </div>
            ) : error ? (
              <div className="col-span-full text-center py-12 text-red-500/70">
                Eroare la încărcarea serviciilor. Încearcă din nou mai târziu.
              </div>
            ) : services.length === 0 ? (
              <div className="col-span-full text-center py-12 text-foreground/60">
                Nu sunt servicii disponibile în acest moment.
              </div>
            ) : (
              services.map((service, index) => (
                <AnimatedSection key={service.id}>
                  <div className="card-lift group relative overflow-hidden border border-border bg-card">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={getServiceImage(service.name)}
                        alt={`Serviciu ${service.name}`}
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
                            Serviciu {String(index + 1).padStart(2, "0")}
                          </div>
                          <h3
                            className="text-3xl font-bold"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          >
                            {service.name}
                          </h3>
                        </div>
                        <Scissors className="text-gold mt-1" size={28} />
                      </div>
                      <p
                        className="text-foreground/60 text-sm leading-relaxed mb-6"
                        style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                      >
                        {service.description || `${service.name} profesional. Durată: ${service.duration} minute. Preț: ${service.price} RON`}
                      </p>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs px-3 py-1 border border-gold/30 text-gold/70 tracking-wider"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          {service.duration} min
                        </span>
                        <span
                          className="text-xs px-3 py-1 border border-gold/30 text-gold/70 tracking-wider font-bold"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          {service.price} RON
                        </span>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 md:py-32 relative overflow-hidden border-t border-border">
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
            {isLoading ? (
              <div className="col-span-full text-center py-12 text-foreground/60">
                Se încarcă prețurile...
              </div>
            ) : error ? (
              <div className="col-span-full text-center py-12 text-red-500/70">
                Eroare la încărcarea prețurilor. Încearcă din nou mai târziu.
              </div>
            ) : services.length === 0 ? (
              <div className="col-span-full text-center py-12 text-foreground/60">
                Nu sunt servicii disponibile în acest moment.
              </div>
            ) : (
              services.map((service, index) => (
                <AnimatedSection key={`price-${service.id}`}>
                  <div className="border border-border bg-card hover:border-gold/40 transition-all duration-300 overflow-hidden group">
                    <div className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div
                            className="text-xs tracking-[0.25em] uppercase text-gold mb-2"
                            style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
                          >
                            Serviciu {String(index + 1).padStart(2, "0")}
                          </div>
                          <h3
                            className="text-3xl font-bold"
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          >
                            {service.name}
                          </h3>
                        </div>
                      </div>

                      <div className="mb-6 pb-6 border-b border-border">
                        <div
                          className="text-4xl font-bold text-gold mb-1"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {service.price} RON
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
                        {service.description || `${service.name} profesional cu consultație inclusă și finisaj cu produse premium.`}
                      </p>

                      <div className="text-xs text-foreground/40 pt-4 border-t border-border">
                        <span style={{ fontFamily: "'Raleway', sans-serif" }}>⏱ Durată: {service.duration} minute</span>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── BOOKING MODAL ── */}
      <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
