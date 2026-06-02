/**
 * Frizeria 9 — Booking Modal
 * Design: Dark Luxury Barbershop
 * Multi-step booking: Service → Barber → Date → Time → Details → Confirm
 */

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Check, Calendar, Clock, Scissors, User, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  selectedBarberId?: number | null;
}

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

export default function BookingModal({ open, onClose, selectedBarberId }: BookingModalProps) {
  const today = new Date();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<number | null | "any">(selectedBarberId ? selectedBarberId : "any"); // null = not selected, "any" = any barber
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query services from database
  const { data: services = [] } = trpc.services.getAll.useQuery();
  
  // Query active barbers
  const { data: barbers = [] } = trpc.barbers.getActive.useQuery();
  
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

  // Update selectedBarber when selectedBarberId changes
  useEffect(() => {
    if (open && selectedBarberId) {
      setSelectedBarber(selectedBarberId);
    }
  }, [selectedBarberId, open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedService(null);
      setSelectedBarber(selectedBarberId ? selectedBarberId : "any");
      setSelectedDate(null);
      setSelectedTime(null);
      setName("");
      setPhone("");
    }
  }, [open, selectedBarberId]);

  // Query occupied slots for selected date and barber
  const { data: occupiedSlots = [] } = trpc.bookings.getOccupiedSlots.useQuery(
    { bookingDate: selectedDate || new Date(), barberId: selectedBarber === "any" ? null : (selectedBarber || null) },
    { enabled: !!selectedDate && step === 4 }
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

  const getSelectedServiceDetails = () => {
    return services.find(s => s.id === selectedService);
  };

  const getSelectedBarberDetails = () => {
    if (selectedBarber === "any") return null;
    return barbers.find(b => b.id === selectedBarber);
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !name || !phone) {
      toast.error("Completează toate câmpurile");
      return;
    }

    setIsSubmitting(true);
    try {
      const service = getSelectedServiceDetails();
      await createBookingMutation.mutateAsync({
        serviceType: service?.name || "Serviciu",
        bookingDate: selectedDate,
        bookingTime: selectedTime,
        clientName: name,
        clientPhone: phone,
        barberId: selectedBarber === "any" ? null : (selectedBarber || null),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      setStep(1);
      setSelectedService(null);
      setSelectedBarber("any");
      setSelectedDate(null);
      setSelectedTime(null);
      setName("");
      setPhone("");
      setSubmitted(false);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Programează-te</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Programare confirmată!</h3>
              <p className="text-muted-foreground mb-6">
                Mulțumim! Te așteptăm pe {formatDate(selectedDate!)} la {selectedTime}.
              </p>
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
              >
                Închide
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: Service Selection */}
              {step === 1 && (
                <div className="space-y-3">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Se încarcă serviciile...
                    </div>
                  ) : (
                    services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service.id);
                          setStep(2);
                        }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedService === service.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{service.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {service.duration} min
                              </span>
                              <span className="font-bold text-primary">{service.price} RON</span>
                            </div>
                          </div>
                          {selectedService === service.id && (
                            <Check className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Step 2: Barber Selection */}
              {step === 2 && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-4">
                    Alege frizerul dorit sau lasă "Oricare frizer disponibil"
                  </div>
                  <div
                    onClick={() => {
                      setSelectedBarber("any");
                      setStep(3);
                    }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedBarber === "any"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">Oricare frizer disponibil</h3>
                        <p className="text-sm text-muted-foreground mt-1">Sistemul va alege cel mai potrivit frizer</p>
                      </div>
                      {selectedBarber === "any" && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  {barbers.map((barber) => (
                    <div
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarber(barber.id);
                        setStep(3);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedBarber === barber.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {barber.photoUrl && (
                          <img
                            src={barber.photoUrl}
                            alt={barber.name}
                            className="w-16 h-16 object-cover rounded-lg border border-border flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{barber.name}</h3>
                          {barber.phone && (
                            <p className="text-sm text-muted-foreground mt-1">Tel: {barber.phone}</p>
                          )}
                        </div>
                        {selectedBarber === barber.id && (
                          <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Date Selection */}
              {step === 3 && (
                <div className="space-y-4">
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
                      className="p-2 hover:bg-accent rounded"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-semibold text-foreground">
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </h3>
                    <button
                      onClick={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(calendarYear + 1);
                        } else {
                          setCalendarMonth(calendarMonth + 1);
                        }
                      }}
                      className="p-2 hover:bg-accent rounded"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {DAY_NAMES.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const disabled = isDateDisabled(day);
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            if (!disabled) {
                              setSelectedDate(new Date(calendarYear, calendarMonth, day));
                              setStep(4);
                            }
                          }}
                          disabled={disabled}
                          className={`p-2 rounded text-sm font-medium transition-all ${
                            disabled
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : "text-foreground hover:bg-primary/20 cursor-pointer"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Time Selection */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Data selectată: <span className="font-semibold text-foreground">{formatDate(selectedDate!)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const occupied = isTimeSlotOccupied(slot);
                      const inPast = isTimeSlotInPast(slot);
                      const disabled = occupied || inPast;

                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            if (!disabled) {
                              setSelectedTime(slot);
                              setStep(5);
                            }
                          }}
                          disabled={disabled}
                          className={`p-2 rounded text-sm font-medium transition-all border ${
                            disabled
                              ? occupied
                                ? "border-red-500/50 bg-red-500/10 text-red-500/50 cursor-not-allowed"
                                : "border-muted-foreground/30 text-muted-foreground/30 cursor-not-allowed"
                              : selectedTime === slot
                              ? "border-primary bg-primary/20 text-foreground"
                              : "border-green-500/50 bg-green-500/10 text-foreground hover:border-primary"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 5: Details */}
              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nume *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Introduceți numele"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Telefon *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Introduceți telefonul"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Serviciu:</span>
                      <span className="font-semibold text-foreground">{getSelectedServiceDetails()?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frizer:</span>
                      <span className="font-semibold text-foreground">
                        {selectedBarber === "any" ? "Oricare disponibil" : getSelectedBarberDetails()?.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-semibold text-foreground">{formatDate(selectedDate!)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ora:</span>
                      <span className="font-semibold text-foreground">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="text-muted-foreground">Preț:</span>
                      <span className="font-bold text-primary">{getSelectedServiceDetails()?.price} RON</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-6">
                {step > 1 && !submitted && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-accent transition-all"
                  >
                    Înapoi
                  </button>
                )}
                {step < 5 && !submitted && (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={
                      (step === 1 && !selectedService) ||
                      (step === 2 && selectedBarber === null) ||
                      (step === 3 && !selectedDate) ||
                      (step === 4 && !selectedTime)
                    }
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Continuă
                  </button>
                )}
                {step === 5 && !submitted && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Se procesează...
                      </>
                    ) : (
                      "Confirmă Programarea"
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
