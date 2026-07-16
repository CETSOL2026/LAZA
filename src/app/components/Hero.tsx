import { Search, ArrowRight, TrendingUp, Database, Globe } from 'lucide-react';
import { useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { getIndicatorById } from '../data/indicators';

export function Hero() {
  const [searchQuery, setSearchQuery] = useState('');
  const gdpGrowth = getIndicatorById('gdp-growth');
  const inflationRate = getIndicatorById('inflation-rate');

  const carouselSlides = [
    {
      id: 1,
      title: 'GDP Growth',
      value: gdpGrowth?.value ?? '—',
      description: 'Year-over-year growth',
      trend: 'positive',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 2,
      title: 'Inflation Rate',
      value: inflationRate?.value ?? '—',
      description: 'Year-over-year change',
      trend: 'neutral',
      image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      id: 3,
      title: 'Laza Equity Index',
      value: '1,248.5',
      description: 'Latest index reading',
      trend: 'positive',
      image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 4,
      title: 'Economic Diversification Index',
      value: '64.2',
      description: 'Diversification score',
      trend: 'positive',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    pauseOnHover: true,
  };

  return (
    <div className="relative bg-gradient-to-br from-primary/5 via-white to-accent border-b border-border">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#bf1f27]/10 text-[#bf1f27] text-sm mb-6">
              <Database className="w-4 h-4" />
              Laza's Intelligence Hub
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Unlock insights into Angola's economy, society, and finance
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              Centralized, curated data providing a comprehensive understanding of Angola's economic indicators, financial systems, and social dynamics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search datasets, indicators, reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#bf1f27]/20 focus:border-[#bf1f27] transition-all"
                />
              </div>
              <button className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#bf1f27] to-[#DC2626] text-white hover:from-[#8a0d1f] hover:to-[#b91c1c] transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap">Explore Data<ArrowRight className="w-4 h-4" /></button>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#bf1f27]/20 flex items-center justify-center border-2 border-white">
                    <TrendingUp className="w-4 h-4 text-[#bf1f27]" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-white">
                    <Database className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-white">
                    <Globe className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <span>50+ Data Sources</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground">Updated Daily</span> • Real-time insights
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center relative">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#bf1f27]/20 to-blue-500/20 rounded-2xl blur-3xl opacity-50"></div>

              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-white">
                <Slider {...sliderSettings}>
                  {carouselSlides.map((slide) => (
                    <div key={slide.id} className="outline-none">
                      <div className="relative">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-64 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <p className="text-sm opacity-90 mb-1">{slide.description}</p>
                          <h3 className="text-2xl mb-2">{slide.title}</h3>
                          <p className="text-4xl">{slide.value}</p>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${slide.bgColor}`}>
                          <TrendingUp className={`w-5 h-5 ${slide.color}`} />
                          <span className={`text-sm ${slide.color}`}>
                            {slide.trend === 'positive' ? 'Positive Trend' : 'Stable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </Slider>
              </div>

              <style jsx global>{`
                .slick-dots {
                  bottom: -35px;
                }
                .slick-dots li button:before {
                  color: #bf1f27;
                  font-size: 8px;
                }
                .slick-dots li.slick-active button:before {
                  color: #bf1f27;
                  opacity: 1;
                }
              `}</style>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
