/**
 * Frizeria 9 — Booking Modal
 * Design: Dark Luxury Barbershop
 * Multi-step booking: Service → Date → Time → Details → Confirm
 */

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Calendar, Clock, Scissors, User, Phone } from "lucide-react";
import { toast } from "sonner";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
}

const SERVICES = [
  {
    id: "tuns",
    name: "Tuns",
    duration: "45 min",
    price: "de la 40 RON",
    description: "Tuns profesional cu consultație și finisaj",
  },
  {
    id: "barbierit",
    name: "Bărbierit",
    duration: "30 min",
    price: "de la 35 RON",
    description: "Bărbierit clasic cu lamă dreaptă și prosop cald",
  },
  {
    id: "tuns-barbierit",
    name: "Tuns + Bărbierit",
    duration: "75 min",
    price: "de la 65 RON",
    description: "Pachet complet — tuns și bărbierit",
  },
];

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

const MONTH_NAMES = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const DAY_NAMES = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

export default function BookingModal({ open, onClose }: BookingModalProps) {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  const isDateDisabled = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    if (dayOfWeek === 0) return true; // Sunday closed
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return true;
    return false;
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
  };

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Te rugăm să completezi numele și numărul de telefon.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Numărul de telefon trebuie să aibă 10 cifre.");
      return;
    }
    setSubmitted(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setName("");
      setPhone("");
      setSubmitted(false);
    }, 300);
  };

  const service = SERVICES.find((s) => s.id === selectedService);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg bg-card border border-border shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step > 1 && !submitted && (
              <button
                onClick={() => setStep(step - 1)}
                className="text-foreground/60 hover:text-gold transition-colors mr-1"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h3
                className="text-xl font-bold"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {submitted ? "Confirmat!" : "Programare Online"}
              </h3>
              {!submitted && (
                <p
                  className="text-xs text-foreground/40 tracking-wider uppercase mt-0.5"
                  style={{ fontFamily: "'Raleway', sans-serif" }}
                >
                  Pasul {step} din 4
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-foreground/50 hover:text-gold transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        {!submitted && (
          <div className="h-0.5 bg-border">
            <div
              className="h-full bg-gold transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* STEP 1 — Service */}
          {step === 1 && (
            <div>
              <p
                className="text-sm text-foreground/50 mb-5"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                Alege serviciul dorit:
              </p>
              <div className="space-y-3">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s.id)}
                    className={`w-full text-left p-4 border transition-all duration-200 ${
                      selectedService === s.id
                        ? "border-gold bg-gold/10"
                        : "border-border hover:border-gold/40 bg-background/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Scissors
                          size={16}
                          className={`mt-0.5 shrink-0 ${selectedService === s.id ? "text-gold" : "text-foreground/40"}`}
                        />
                        <div>
                          <div
                            className="font-semibold text-sm"
                            style={{ fontFamily: "'Raleway', sans-serif" }}
                          >
                            {s.name}
                          </div>
                          <div
                            className="text-xs text-foreground/50 mt-0.5"
                            style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
                          >
                            {s.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div
                          className="text-xs text-gold font-semibold"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          {s.price}
                        </div>
                        <div
                          className="text-xs text-foreground/40 mt-0.5"
                          style={{ fontFamily: "'Raleway', sans-serif" }}
                        >
                          {s.duration}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => selectedService && setStep(2)}
                disabled={!selectedService}
                className={`mt-6 w-full py-3.5 text-sm tracking-widest uppercase transition-all duration-300 ${
                  selectedService
                    ? "btn-gold"
                    : "bg-muted text-foreground/30 cursor-not-allowed"
                }`}
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600 }}
              >
                Continuă
                <ChevronRight size={16} className="inline ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2 — Date */}
          {step === 2 && (
            <div>
              <p
                className="text-sm text-foreground/50 mb-5"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                Alege data programării:
              </p>

              {/* Calendar header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                    else setCalendarMonth(m => m - 1);
                  }}
                  className="text-foreground/50 hover:text-gold transition-colors p-1"
                >
                  <ChevronLeft size={18} />
                </button>
                <span
                  className="text-sm font-semibold tracking-wider"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}
                >
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                    else setCalendarMonth(m => m + 1);
                  }}
                  className="text-foreground/50 hover:text-gold transition-colors p-1"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs text-foreground/30 py-1 tracking-wider"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const disabled = isDateDisabled(day);
                  const selected = selectedDate === dateStr;
                  return (
                    <button
                      key={day}
                      onClick={() => !disabled && setSelectedDate(dateStr)}
                      disabled={disabled}
                      className={`aspect-square flex items-center justify-center text-sm transition-all duration-200 ${
                        selected
                          ? "bg-gold text-background font-semibold"
                          : disabled
                          ? "text-foreground/20 cursor-not-allowed"
                          : "hover:bg-gold/20 hover:text-gold text-foreground/80"
                      }`}
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <p
                className="text-xs text-foreground/30 mt-3 text-center"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                Duminica suntem închiși
              </p>

              <button
                onClick={() => selectedDate && setStep(3)}
                disabled={!selectedDate}
                className={`mt-5 w-full py-3.5 text-sm tracking-widest uppercase transition-all duration-300 ${
                  selectedDate
                    ? "btn-gold"
                    : "bg-muted text-foreground/30 cursor-not-allowed"
                }`}
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600 }}
              >
                Continuă
                <ChevronRight size={16} className="inline ml-2" />
              </button>
            </div>
          )}

          {/* STEP 3 — Time */}
          {step === 3 && (
            <div>
              <p
                className="text-sm text-foreground/50 mb-1"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                Alege ora:
              </p>
              {selectedDate && (
                <p
                  className="text-xs text-gold mb-5 flex items-center gap-1.5"
                  style={{ fontFamily: "'Raleway', sans-serif" }}
                >
                  <Calendar size={12} />
                  {formatDate(selectedDate)}
                </p>
              )}
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2.5 text-sm border transition-all duration-200 ${
                      selectedTime === slot
                        ? "border-gold bg-gold/10 text-gold font-semibold"
                        : "border-border hover:border-gold/40 text-foreground/70"
                    }`}
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <button
                onClick={() => selectedTime && setStep(4)}
                disabled={!selectedTime}
                className={`mt-6 w-full py-3.5 text-sm tracking-widest uppercase transition-all duration-300 ${
                  selectedTime
                    ? "btn-gold"
                    : "bg-muted text-foreground/30 cursor-not-allowed"
                }`}
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600 }}
              >
                Continuă
                <ChevronRight size={16} className="inline ml-2" />
              </button>
            </div>
          )}

          {/* STEP 4 — Details */}
          {step === 4 && !submitted && (
            <div>
              {/* Summary */}
              <div className="border border-gold/20 bg-background/30 p-4 mb-6">
                <p
                  className="text-xs text-foreground/40 uppercase tracking-wider mb-3"
                  style={{ fontFamily: "'Raleway', sans-serif" }}
                >
                  Rezumat programare
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Scissors size={13} className="text-gold" />
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>{service?.name}</span>
                    <span className="text-foreground/40 text-xs ml-auto">{service?.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={13} className="text-gold" />
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>
                      {selectedDate ? formatDate(selectedDate) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={13} className="text-gold" />
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>{selectedTime}</span>
                  </div>
                </div>
              </div>

              <p
                className="text-sm text-foreground/50 mb-4"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                Completează datele tale:
              </p>

              <div className="space-y-4">
                <div>
                  <label
                    className="text-xs text-foreground/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  >
                    <User size={11} /> Nume complet
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ion Popescu"
                    className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold transition-colors"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs text-foreground/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  >
                    <Phone size={11} /> Număr de telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="w-full bg-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-gold transition-colors"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="btn-gold mt-6 w-full py-3.5 text-sm tracking-widest uppercase"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600 }}
              >
                Confirmă Programarea
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {submitted && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold flex items-center justify-center mx-auto mb-6">
                <Check size={28} className="text-gold" />
              </div>
              <h3
                className="text-3xl font-bold mb-3"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Programare Confirmată!
              </h3>
              <p
                className="text-foreground/60 text-sm leading-relaxed mb-6"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 300 }}
              >
                Mulțumim, <span className="text-gold">{name}</span>! Te așteptăm la{" "}
                <span className="text-gold">{selectedTime}</span>,{" "}
                {selectedDate ? formatDate(selectedDate) : ""}.
              </p>
              <div className="border border-gold/20 bg-background/30 p-4 mb-6 text-left">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Scissors size={13} className="text-gold" />
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>{service?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={13} className="text-gold" />
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>
                      {selectedDate ? formatDate(selectedDate) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={13} className="text-gold" />
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>{selectedTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={13} className="text-gold" />
                    <span style={{ fontFamily: "'Raleway', sans-serif" }}>{phone}</span>
                  </div>
                </div>
              </div>
              <p
                className="text-xs text-foreground/40 mb-6"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                Dacă ai nevoie să modifici programarea, ne poți contacta la{" "}
                <a href="tel:0758900900" className="text-gold hover:underline">
                  0758 900 900
                </a>
              </p>
              <button
                onClick={handleClose}
                className="btn-outline-gold px-8 py-3 text-xs"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600 }}
              >
                Închide
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
