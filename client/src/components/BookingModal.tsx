/**
 * Frizeria 9 — Booking Modal
 * Design: Dark Luxury Barbershop
 * Multi-step booking: Service → Date → Time → Details → Confirm
 */

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check, Calendar, Clock, Scissors, User, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
}

const SERVICES = [
  {
    id: "tuns",
    name: "Tuns",
    duration: "45 min",
    price: "40 RON",
    description: "Tuns profesional cu consultație și finisaj",
  },
  {
    id: "barbierit",
    name: "Bărbierit",
    duration: "30 min",
    price: "35 RON",
    description: "Bărbierit clasic cu lamă dreaptă și prosop cald",
  },
  {
    id: "pachet_complet",
    name: "Tuns + Bărbierit",
    duration: "75 min",
    price: "65 RON",
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query settings to get closed days
  const { data: settings } = trpc.settings.get.useQuery();
  const [closedDays, setClosedDays] = useState<string[]>([]);

  useEffect(() => {
    if (settings?.closedDays) {
      try {
        setClosedDays(JSON.parse(settings.closedDays));
      } catch (e) {
        console.error("Failed to parse closed days:", e);
      }
    }
  }, [settings]);

  // Query occupied slots for selected date
  const { data: occupiedSlots = [] } = trpc.bookings.getOccupiedSlots.useQuery(
    { bookingDate: selectedDate || new Date() },
    { enabled: !!selectedDate && step === 3 }
  );

  // Create booking mutation
  const createBookingMutation = trpc.bookings.create.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Programare confirmată! Te așteptăm!");
    },
    onError: (error) => {
      toast.error(error.message || "Eroare la crearea programării");
      setIsSubmitting(false);
    },
  });

  if (!open) return null;

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  const isDateDisabled = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    if (dayOfWeek === 0) return true; // Sunday closed
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return true;
    
    // Check if date is in closed days
    const dateStr = date.toISOString().split('T')[0];
    if (closedDays.includes(dateStr)) return true;
    
    return false;
  };

  const formatDate = (date: Date) => {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  };

  const isTimeSlotOccupied = (slot: string) => {
    return occupiedSlots.includes(slot);
  };

  const isTimeSlotInPast = (slot: string) => {
    if (!selectedDate) return false;
    const now = new Date();
    const isToday = selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate();
    
    if (!isToday) return false;
    
    const [hours, minutes] = slot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    return slotTime <= now;
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Te rugăm să completezi numele și numărul de telefon.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Numărul de telefon trebuie să aibă 10 cifre.");
      return;
    }

    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Te rugăm să completezi toate câmpurile.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createBookingMutation.mutateAsync({
        clientName: name,
        clientPhone: phone,
        serviceType: selectedService as "tuns" | "barbierit" | "pachet_complet",
        bookingDate: selectedDate,
        bookingTime: selectedTime,
      });
    } catch (error) {
      // Error is handled by mutation's onError
    }
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
      setIsSubmitting(false);
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
                Alege data:
              </p>

              {/* Calendar header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  }}
                  className="text-foreground/50 hover:text-gold transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div
                  className="text-sm font-semibold text-center flex-1"
                  style={{ fontFamily: "'Raleway', sans-serif" }}
                >
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </div>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }}
                  className="text-foreground/50 hover:text-gold transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs text-foreground/40 py-2"
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
                  const date = new Date(calendarYear, calendarMonth, day);
                  const disabled = isDateDisabled(day);
                  const selected = selectedDate?.getDate() === day && selectedDate?.getMonth() === calendarMonth && selectedDate?.getFullYear() === calendarYear;
                  return (
                    <button
                      key={day}
                      onClick={() => !disabled && setSelectedDate(date)}
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
                {TIME_SLOTS.map((slot) => {
                  const occupied = isTimeSlotOccupied(slot);
                  const inPast = isTimeSlotInPast(slot);
                  const selected = selectedTime === slot;
                  const disabled = occupied || inPast;
                  return (
                    <button
                      key={slot}
                      onClick={() => !disabled && setSelectedTime(slot)}
                      disabled={disabled}
                      className={`py-2.5 text-sm border transition-all duration-200 ${
                        selected
                          ? "border-gold bg-gold/10 text-gold font-semibold"
                          : disabled
                          ? "border-red-500/50 bg-red-500/10 text-red-400 cursor-not-allowed"
                          : "border-green-500/50 bg-green-500/10 text-green-400 hover:border-green-500"
                      }`}
                      style={{ fontFamily: "'Raleway', sans-serif" }}
                      title={inPast ? "Ora a trecut deja" : occupied ? "Ora ocupata" : ""}
                    >
                      {slot}
                    </button>
                  );
                })}
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
                    <User size={12} />
                    Nume complet
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Ion Popescu"
                    className="w-full bg-background/50 border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-gold transition-colors"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  />
                </div>

                <div>
                  <label
                    className="text-xs text-foreground/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  >
                    <Phone size={12} />
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Ex: 0758900900"
                    className="w-full bg-background/50 border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-gold transition-colors"
                    style={{ fontFamily: "'Raleway', sans-serif" }}
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !name.trim() || !phone.trim()}
                className={`mt-6 w-full py-3.5 text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                  !isSubmitting && name.trim() && phone.trim()
                    ? "btn-gold"
                    : "bg-muted text-foreground/30 cursor-not-allowed"
                }`}
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Se procesează...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Confirmă Programarea
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 5 — Confirmation */}
          {submitted && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-gold" />
              </div>
              <p
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Programare Confirmată!
              </p>
              <p
                className="text-sm text-foreground/60 mb-6"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                Te așteptăm pe {selectedDate && formatDate(selectedDate)} la {selectedTime}
              </p>
              <p
                className="text-xs text-foreground/40 mb-6"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                Vei primi o confirmare pe WhatsApp la {phone}
              </p>
              <button
                onClick={handleClose}
                className="btn-gold px-8"
                style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 600 }}
              >
                Gata
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
