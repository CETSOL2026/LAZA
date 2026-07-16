import svgPaths from "../../imports/DesignUiLazaBrand/svg-3gxmkyr2kz";
import { useState } from "react";

// ── SVG icon helpers ────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path d={svgPaths.p107a080} stroke="#64748B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M14 14L11.1333 11.1333" stroke="#64748B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
      <path d={svgPaths.p23ad1400} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d={svgPaths.p19411800} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
      <path d="M8 10V2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
      <path d="M4 1V3" stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 1V3" stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" />
      <path d={svgPaths.p333d5300} stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 5H10.5" stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DlIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
      <path d={svgPaths.p2752e200} stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 5L6 7.5L8.5 5" stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7.5V1.5" stroke="#0A0A0A" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Dataset icon variants ────────────────────────────────────────────────────

function IconGdp() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p3c797180} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p3ac0b600} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </svg>
  );
}

function IconPopulation() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p25397b80} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2c4f400} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p2241fff0} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.pae3c380} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </svg>
  );
}

function IconBanking() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
      <g clipPath="url(#clip0_ds_banking)">
        <path d={svgPaths.p37143280} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d={svgPaths.p1d7f0000} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d={svgPaths.p2b722f80} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d="M8.33333 5H11.6667" stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d="M8.33333 8.33333H11.6667" stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d="M8.33333 11.6667H11.6667" stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        <path d="M8.33333 15H11.6667" stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      </g>
      <defs>
        <clipPath id="clip0_ds_banking"><rect fill="white" height="20" width="20" /></clipPath>
      </defs>
    </svg>
  );
}

function IconGovt() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
      <path d={svgPaths.p3e8f800} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p11d57a00} stroke="#bf1f27" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </svg>
  );
}

// reuse GDP icon for Trade
function IconTrade() { return <IconGdp />; }
// reuse Population icon for Education
function IconEducation() { return <IconPopulation />; }

// ── Types ────────────────────────────────────────────────────────────────────

interface Dataset {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  categoryTextColor: string;
  priceBadge: string;
  priceBadgeColor: string;
  priceBadgeTextColor: string;
  description: string;
  format: string;
  frequency: string;
  lastUpdated: string;
  downloads: string;
  icon: React.ReactNode;
}

const DATASETS: Dataset[] = [
  {
    id: "gdp",
    title: "GDP & Economic Indicators",
    category: "economy",
    categoryColor: "#f8fafc",
    categoryTextColor: "#64748b",
    priceBadge: "Free",
    priceBadgeColor: "#dcfce7",
    priceBadgeTextColor: "#008236",
    description: "Comprehensive economic data including GDP, inflation, exchange rates, and sectoral contributions.",
    format: "CSV, JSON, Excel",
    frequency: "Quarterly",
    lastUpdated: "2024-05-01",
    downloads: "1,248",
    icon: <IconGdp />,
  },
  {
    id: "population",
    title: "Population & Demographics",
    category: "society",
    categoryColor: "#f8fafc",
    categoryTextColor: "#64748b",
    priceBadge: "Free",
    priceBadgeColor: "#dcfce7",
    priceBadgeTextColor: "#008236",
    description: "Detailed population statistics, urbanization trends, age distribution, and regional breakdown.",
    format: "CSV, JSON",
    frequency: "Annual",
    lastUpdated: "2024-04-28",
    downloads: "892",
    icon: <IconPopulation />,
  },
  {
    id: "banking",
    title: "Banking Sector Data",
    category: "finance",
    categoryColor: "#f8fafc",
    categoryTextColor: "#64748b",
    priceBadge: "$49/month",
    priceBadgeColor: "#dbeafe",
    priceBadgeTextColor: "#1447e6",
    description: "Banking assets, loans, deposits, interest rates, and financial institution performance metrics.",
    format: "CSV, JSON, Excel",
    frequency: "Monthly",
    lastUpdated: "2024-05-03",
    downloads: "654",
    icon: <IconBanking />,
  },
  {
    id: "govt",
    title: "Government Budget & Expenditure",
    category: "public",
    categoryColor: "#f8fafc",
    categoryTextColor: "#64748b",
    priceBadge: "Free",
    priceBadgeColor: "#dcfce7",
    priceBadgeTextColor: "#008236",
    description: "Public finance data including revenue, expenditure, deficit, and sectoral budget allocation.",
    format: "CSV, JSON",
    frequency: "Annual",
    lastUpdated: "2024-04-30",
    downloads: "723",
    icon: <IconGovt />,
  },
  {
    id: "trade",
    title: "Trade & Export Statistics",
    category: "economy",
    categoryColor: "#f8fafc",
    categoryTextColor: "#64748b",
    priceBadge: "$29/month",
    priceBadgeColor: "#dbeafe",
    priceBadgeTextColor: "#1447e6",
    description: "International trade data, export/import values, trading partners, and commodity breakdown.",
    format: "CSV, Excel",
    frequency: "Monthly",
    lastUpdated: "2024-05-02",
    downloads: "534",
    icon: <IconTrade />,
  },
  {
    id: "education",
    title: "Education & Healthcare Metrics",
    category: "society",
    categoryColor: "#f8fafc",
    categoryTextColor: "#64748b",
    priceBadge: "Free",
    priceBadgeColor: "#dcfce7",
    priceBadgeTextColor: "#008236",
    description: "Social indicators covering education enrollment, literacy rates, healthcare access, and outcomes.",
    format: "CSV, JSON",
    frequency: "Annual",
    lastUpdated: "2024-04-25",
    downloads: "412",
    icon: <IconEducation />,
  },
];

const FILTERS = ["All Data", "Economy", "Society", "Finance", "Public Finance"];

// ── Dataset card ─────────────────────────────────────────────────────────────

function DatasetCard({ dataset }: { dataset: Dataset }) {
  return (
    <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-6 flex flex-col gap-0 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start gap-3 mb-4">
        <div className="bg-[rgba(159,15,35,0.1)] rounded-[10px] p-2.5 shrink-0">
          {dataset.icon}
        </div>
        <div className="min-w-0">
          <p
            className="font-['Inter:Medium',sans-serif] font-medium text-[18px] leading-[28px] text-[#0a0a0a] tracking-[-0.44px]"
          >
            {dataset.title}
          </p>
          <div className="flex gap-2 mt-1">
            <span
              className="px-2 py-0.5 rounded-[4px] text-[12px] leading-[16px] capitalize"
              style={{ background: dataset.categoryColor, color: dataset.categoryTextColor }}
            >
              {dataset.category}
            </span>
            <span
              className="px-2 py-0.5 rounded-[4px] text-[12px] leading-[16px]"
              style={{ background: dataset.priceBadgeColor, color: dataset.priceBadgeTextColor }}
            >
              {dataset.priceBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="font-['Inter:Regular',sans-serif] text-[14px] leading-[20px] text-[#64748b] tracking-[-0.15px] mb-4 line-clamp-2">
        {dataset.description}
      </p>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        <div>
          <p className="text-[12px] leading-[16px] text-[#64748b]">Format</p>
          <p className="text-[14px] leading-[20px] text-[#0a0a0a] tracking-[-0.15px] mt-1">{dataset.format}</p>
        </div>
        <div>
          <p className="text-[12px] leading-[16px] text-[#64748b]">Update Frequency</p>
          <p className="text-[14px] leading-[20px] text-[#0a0a0a] tracking-[-0.15px] mt-1">{dataset.frequency}</p>
        </div>
        <div>
          <p className="text-[12px] leading-[16px] text-[#64748b]">Last Updated</p>
          <div className="flex items-center gap-1 mt-1">
            <CalendarIcon />
            <p className="text-[14px] leading-[20px] text-[#0a0a0a] tracking-[-0.15px]">{dataset.lastUpdated}</p>
          </div>
        </div>
        <div>
          <p className="text-[12px] leading-[16px] text-[#64748b]">Downloads</p>
          <div className="flex items-center gap-1 mt-1">
            <DlIcon />
            <p className="text-[14px] leading-[20px] text-[#0a0a0a] tracking-[-0.15px]">{dataset.downloads}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button className="flex-1 flex items-center justify-center gap-2 bg-[#bf1f27] hover:bg-[#8a0d1f] text-white rounded-[10px] px-4 py-2.5 transition-colors">
          <DownloadIcon />
          <span className="font-['Inter:Medium',sans-serif] font-medium text-[16px] leading-[24px] tracking-[-0.31px]">Download</span>
        </button>
        <button className="shrink-0 border border-[#e2e8f0] rounded-[10px] px-4 py-2.5 font-['Inter:Medium',sans-serif] font-medium text-[16px] leading-[24px] text-[#0a0a0a] hover:bg-gray-50 transition-colors">
          Preview
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DataMarketplaceDesign() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Data");

  const filtered = DATASETS.filter((d) => {
    const matchesSearch =
      search === "" ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "All Data" ||
      d.category.toLowerCase() === activeFilter.toLowerCase() ||
      (activeFilter === "Public Finance" && d.category === "public");
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="font-['Inter:Medium',sans-serif] font-medium text-[30px] leading-[36px] text-[#0a0a0a] tracking-[-0.35px]">
          Data Marketplace
        </h1>
        <p className="font-['Inter:Regular',sans-serif] text-[16px] leading-[24px] text-[#64748b] tracking-[-0.31px] mt-2">
          Access curated datasets on Angola's economy, society, and finance
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1 max-w-[460px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search datasets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[46px] pl-10 pr-4 rounded-[10px] border border-[#e2e8f0] bg-white text-[16px] text-[#0a0a0a] placeholder-[rgba(10,10,10,0.5)] focus:outline-none focus:ring-2 focus:ring-[#bf1f27]/30"
          />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 h-[46px] px-4 rounded-[10px] font-['Inter:Medium',sans-serif] font-medium text-[14px] leading-[20px] transition-colors ${
                activeFilter === f
                  ? "bg-[#bf1f27] text-white"
                  : "bg-[#f8fafc] text-[#0a0a0a] hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Dataset grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
        {filtered.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-[#64748b]">
            No datasets match your search.
          </div>
        )}
      </div>
    </div>
  );
}
