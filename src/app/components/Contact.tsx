import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, Send } from 'lucide-react';
import { useState } from 'react';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="space-y-12 py-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#bf1f27]/10 text-[#bf1f27] text-sm mb-4">
          Get In Touch
        </div>
        <h1 className="text-4xl lg:text-5xl tracking-tight">
          Contact <span className="text-[#bf1f27]">LAZA</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Have questions about our platform? We'd love to hear from you.
        </p>
      </div>

      {/* Main Contact Section */}
      <div className="relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#bf1f27]/5 via-transparent to-blue-500/5 rounded-3xl -z-10"></div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden -z-10 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-[#bf1f27] rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 p-8">
          {/* Contact Form */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-xl">
            <h2 className="text-2xl mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm mb-2 text-muted-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#bf1f27]/20 focus:border-[#bf1f27] transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm mb-2 text-muted-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#bf1f27]/20 focus:border-[#bf1f27] transition-all"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm mb-2 text-muted-foreground">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#bf1f27]/20 focus:border-[#bf1f27] transition-all"
                  placeholder="How can we help?"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm mb-2 text-muted-foreground">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#bf1f27]/20 focus:border-[#bf1f27] transition-all resize-none"
                  placeholder="Tell us more about your inquiry..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-[#bf1f27] text-white rounded-xl hover:bg-[#8a0d1f] transition-all shadow-lg hover:shadow-xl hover:shadow-[#bf1f27]/20 flex items-center justify-center gap-2 group"
              >
                <span>Send Message</span>
                <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-card rounded-2xl border border-border p-8 shadow-xl">
              <h2 className="text-2xl mb-6">Contact Information</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#bf1f27]/10 rounded-xl">
                    <Mail className="w-6 h-6 text-[#bf1f27]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <a href="mailto:info@laza.ao" className="text-lg hover:text-[#bf1f27] transition-colors">
                      info@laza.ao
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                    <a href="tel:+244923456789" className="text-lg hover:text-[#bf1f27] transition-colors">
                      +244 923 456 789
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <MapPin className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Office</p>
                    <p className="text-lg">
                      Rua Rainha Ginga, 187<br />
                      Luanda, Angola
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">Follow Us</p>
                <div className="flex gap-3">
                  <a
                    href="#"
                    className="p-3 rounded-xl bg-muted hover:bg-[#bf1f27]/10 hover:text-[#bf1f27] transition-all"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="p-3 rounded-xl bg-muted hover:bg-[#bf1f27]/10 hover:text-[#bf1f27] transition-all"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a
                    href="#"
                    className="p-3 rounded-xl bg-muted hover:bg-[#bf1f27]/10 hover:text-[#bf1f27] transition-all"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Angola Map Illustration */}
            <div className="bg-card rounded-2xl border border-border p-8 shadow-xl">
              <div className="relative h-64 bg-gradient-to-br from-[#bf1f27]/10 to-blue-500/10 rounded-xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-48 h-48 opacity-30">
                    <path
                      d="M100 20 L180 60 L180 140 L100 180 L20 140 L20 60 Z"
                      fill="none"
                      stroke="#bf1f27"
                      strokeWidth="2"
                    />
                    <circle cx="100" cy="100" r="40" fill="#bf1f27" opacity="0.2" />
                    <circle cx="100" cy="100" r="5" fill="#bf1f27" />
                  </svg>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <p className="text-sm text-muted-foreground">Luanda, Angola</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-gradient-to-br from-[#bf1f27] to-[#8a0d1f] rounded-3xl p-12 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl">Business Hours</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div>
              <p className="opacity-80 mb-2">Monday - Friday</p>
              <p className="text-2xl">8:00 AM - 6:00 PM</p>
            </div>
            <div>
              <p className="opacity-80 mb-2">Saturday - Sunday</p>
              <p className="text-2xl">Closed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
