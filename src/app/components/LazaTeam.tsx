import { Linkedin, Mail } from 'lucide-react';

export function LazaTeam() {
  const team = [
    {
      name: 'Dr. António Silva',
      role: 'Founder & CEO',
      expertise: 'Former Central Bank economist with 15+ years experience in macroeconomic policy and financial regulation',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
      linkedin: '#',
    },
    {
      name: 'Maria Costa',
      role: 'Economic Intelligence Lead',
      expertise: 'Specialist in economic forecasting and statistical modeling with expertise in African markets',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
      linkedin: '#',
    },
    {
      name: 'João Santos',
      role: 'Data Science Director',
      expertise: 'PhD in Machine Learning, leading AI-driven analytics and predictive modeling initiatives',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
      linkedin: '#',
    },
    {
      name: 'Isabel Fernandes',
      role: 'Financial Systems Analyst',
      expertise: 'Expert in banking sector analysis and financial market infrastructure development',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop',
      linkedin: '#',
    },
    {
      name: 'Carlos Mendes',
      role: 'Chief Technology Officer',
      expertise: 'Full-stack architect specializing in real-time data platforms and scalable cloud infrastructure',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      linkedin: '#',
    },
    {
      name: 'Ana Rodrigues',
      role: 'Public Policy Advisor',
      expertise: 'Former government advisor on fiscal policy and public finance reform initiatives',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop',
      linkedin: '#',
    },
  ];

  return (
    <div className="space-y-12 py-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#bf1f27]/10 text-[#bf1f27] text-sm mb-4">
          Our Team
        </div>
        <h1 className="text-4xl lg:text-5xl tracking-tight">
          Meet the <span className="text-[#bf1f27]">LAZA</span> Team
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A diverse team of economists, data scientists, and technology experts dedicated to transforming Angola's data landscape
        </p>
      </div>

      {/* Background decoration */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#bf1f27]/5 via-transparent to-blue-500/5 rounded-3xl -z-10"></div>

        {/* Decorative network lines */}
        <div className="absolute inset-0 overflow-hidden -z-10 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 800 600">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bf1f27" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <line x1="100" y1="100" x2="300" y2="200" stroke="url(#lineGradient)" strokeWidth="1" />
            <line x1="300" y1="200" x2="500" y2="150" stroke="url(#lineGradient)" strokeWidth="1" />
            <line x1="500" y1="150" x2="700" y2="250" stroke="url(#lineGradient)" strokeWidth="1" />
            <line x1="200" y1="400" x2="400" y2="350" stroke="url(#lineGradient)" strokeWidth="1" />
            <line x1="400" y1="350" x2="600" y2="400" stroke="url(#lineGradient)" strokeWidth="1" />
          </svg>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-8">
          {team.map((member, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-2xl hover:border-[#bf1f27]/30 transition-all duration-300 group cursor-pointer"
            >
              <div className="relative">
                {/* Glow effect on hover */}
                <div className="absolute -inset-2 bg-gradient-to-br from-[#bf1f27]/20 to-blue-500/20 rounded-full opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"></div>

                {/* Profile Image */}
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#bf1f27]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>

              <div className="text-center space-y-3">
                <h3 className="text-xl group-hover:text-[#bf1f27] transition-colors">
                  {member.name}
                </h3>
                <p className="text-sm text-[#bf1f27]">{member.role}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.expertise}
                </p>

                <div className="flex items-center justify-center gap-3 pt-3">
                  <a
                    href={member.linkedin}
                    className="p-2 rounded-lg bg-muted hover:bg-[#bf1f27]/10 hover:text-[#bf1f27] transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                  <a
                    href={`mailto:${member.name.toLowerCase().replace(' ', '.')}@laza.ao`}
                    className="p-2 rounded-lg bg-muted hover:bg-[#bf1f27]/10 hover:text-[#bf1f27] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Join Team CTA */}
      <div className="relative bg-gradient-to-br from-[#bf1f27] to-[#8a0d1f] rounded-3xl p-12 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 opacity-10"></div>
        <div className="relative max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl">Join Our Team</h2>
          <p className="text-lg opacity-95">
            We're always looking for talented individuals passionate about data, economics, and technology to join our mission of transforming Angola's intelligence landscape.
          </p>
          <button className="px-8 py-3 bg-white text-[#bf1f27] rounded-xl hover:bg-white/90 transition-colors shadow-lg">
            View Open Positions
          </button>
        </div>
      </div>
    </div>
  );
}
