import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const contactMutation = trpc.contact.submit.useMutation();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      alert("Te rog completează toate câmpurile obligatorii");
      return;
    }

    if (formData.message.trim().length < 10) {
      alert("Mesajul trebuie să conțină cel puțin 10 caractere");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Te rog introdu o adresă de email validă");
      return;
    }

    try {
      await contactMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      });

      setSubmitted(true);
      setFormData({ name: "", email: "", phone: "", message: "" });

      // Reset success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("A apărut o eroare. Te rog încearcă din nou.");
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Contact</h1>
          <p className="text-lg text-muted-foreground">
            Contactează-ne pentru orice întrebări sau sugestii
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">
                Informații de Contact
              </h2>
            </div>

            {/* Phone */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Phone className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Telefon</h3>
                <p className="text-muted-foreground mt-1">
                  <a href="tel:+40123456789" className="hover:text-accent transition">
                    +40 (123) 456-789
                  </a>
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Mail className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Email</h3>
                <p className="text-muted-foreground mt-1">
                  <a href="mailto:contact@frizeria9.ro" className="hover:text-accent transition">
                    contact@frizeria9.ro
                  </a>
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Adresă</h3>
                <p className="text-muted-foreground mt-1">
                  Strada Principală 123<br />
                  București, 010101<br />
                  România
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Orarul de Funcționare</h3>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Luni - Vineri:</span>
                  <span>09:00 - 20:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Sâmbătă:</span>
                  <span>09:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Duminică:</span>
                  <span>Închis</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-6">Trimite-ne un Mesaj</h2>

            {submitted && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-600 font-medium">
                  ✓ Mulțumim! Mesajul tău a fost trimis cu succes.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Nume *
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Introdu-ți numele"
                  required
                  className="w-full"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="introdu-ti@email.com"
                  required
                  className="w-full"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                  Telefon
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+40 (123) 456-789"
                  className="w-full"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Mesaj *
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Scrie-ți mesajul aici..."
                  rows={5}
                  required
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minim 10 caractere
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={contactMutation.isPending}
                className="w-full gap-2 bg-accent hover:bg-accent/90"
              >
                {contactMutation.isPending ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Se trimite...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Trimite Mesajul
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
