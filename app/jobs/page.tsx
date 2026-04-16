"use client";

import { useState, useMemo } from "react";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  experience: string;
  salary: string;
  description: string;
  tags: string[];
  posted: string;
  emoji: string;
  applyUrl: string;
}

const JOBS: Job[] = [
  {
    id: 1,
    title: "Développeur Frontend",
    company: "BNP Paribas",
    location: "Paris",
    type: "CDI",
    experience: "Junior",
    salary: "45 000 € – 55 000 €/an",
    description:
      "Rejoignez notre équipe tech pour créer des interfaces modernes pour nos clients bancaires.",
    tags: ["React", "TypeScript", "Tailwind CSS"],
    posted: "Il y a 2 jours",
    emoji: "🏦",
    applyUrl: "#",
  },
  {
    id: 2,
    title: "Data Scientist",
    company: "L'Oréal",
    location: "Paris",
    type: "CDI",
    experience: "Mid-level",
    salary: "55 000 € – 70 000 €/an",
    description:
      "Analyser les données consommateurs pour optimiser nos stratégies marketing globales.",
    tags: ["Python", "Machine Learning", "SQL"],
    posted: "Il y a 1 jour",
    emoji: "💄",
    applyUrl: "#",
  },
  {
    id: 3,
    title: "Consultant Strategy",
    company: "McKinsey & Company",
    location: "Paris",
    type: "CDI",
    experience: "Senior",
    salary: "80 000 € – 120 000 €/an",
    description:
      "Conseiller des dirigeants sur leurs stratégies de transformation et de croissance.",
    tags: ["Strategy", "Management", "Excel"],
    posted: "Il y a 3 jours",
    emoji: "📊",
    applyUrl: "#",
  },
  {
    id: 4,
    title: "Stage Marketing Digital",
    company: "LVMH",
    location: "Paris",
    type: "Stage",
    experience: "Junior",
    salary: "1 200 €/mois",
    description:
      "Participer aux campagnes digitales et réseaux sociaux des marques du groupe.",
    tags: ["Marketing", "Social Media", "Analytics"],
    posted: "Il y a 5 jours",
    emoji: "💎",
    applyUrl: "#",
  },
  {
    id: 5,
    title: "Software Engineer",
    company: "Doctolib",
    location: "Paris",
    type: "CDI",
    experience: "Mid-level",
    salary: "60 000 € – 75 000 €/an",
    description:
      "Développer des fonctionnalités pour améliorer l'accès aux soins de santé en France.",
    tags: ["Ruby on Rails", "React", "PostgreSQL"],
    posted: "Il y a 1 jour",
    emoji: "🏥",
    applyUrl: "#",
  },
  {
    id: 6,
    title: "Product Manager",
    company: "BlaBlaCar",
    location: "Télétravail",
    type: "CDI",
    experience: "Mid-level",
    salary: "65 000 € – 80 000 €/an",
    description:
      "Définir la roadmap produit et collaborer avec les équipes engineering et design.",
    tags: ["Product", "Agile", "Data"],
    posted: "Il y a 4 jours",
    emoji: "🚗",
    applyUrl: "#",
  },
  {
    id: 7,
    title: "Alternance Finance",
    company: "TotalEnergies",
    location: "La Défense",
    type: "Alternance",
    experience: "Junior",
    salary: "1 500 €/mois",
    description:
      "Rejoindre l'équipe finance pour accompagner la transition énergétique mondiale.",
    tags: ["Finance", "Excel", "Reporting"],
    posted: "Il y a 6 jours",
    emoji: "⚡",
    applyUrl: "#",
  },
  {
    id: 8,
    title: "UX Designer",
    company: "Figma",
    location: "Télétravail",
    type: "CDI",
    experience: "Mid-level",
    salary: "55 000 € – 70 000 €/an",
    description:
      "Créer des expériences utilisateurs intuitives pour notre plateforme de design collaborative.",
    tags: ["Figma", "UX Research", "Prototyping"],
    posted: "Il y a 2 jours",
    emoji: "🎨",
    applyUrl: "#",
  },
  {
    id: 9,
    title: "Ingénieur DevOps",
    company: "Criteo",
    location: "Paris",
    type: "CDI",
    experience: "Senior",
    salary: "70 000 € – 90 000 €/an",
    description:
      "Gérer l'infrastructure cloud et optimiser les pipelines CI/CD pour nos plateformes publicitaires.",
    tags: ["Kubernetes", "AWS", "Terraform"],
    posted: "Il y a 3 jours",
    emoji: "☁️",
    applyUrl: "#",
  },
  {
    id: 10,
    title: "Stage Ressources Humaines",
    company: "Airbus",
    location: "Toulouse",
    type: "Stage",
    experience: "Junior",
    salary: "1 100 €/mois",
    description:
      "Accompagner les équipes RH dans le recrutement et le développement des talents.",
    tags: ["RH", "Recrutement", "HRIS"],
    posted: "Il y a 7 jours",
    emoji: "✈️",
    applyUrl: "#",
  },
];

const JOB_TYPES = ["Tous", "CDI", "CDD", "Stage", "Alternance", "Télétravail"];
const LOCATIONS = ["Tous", "Paris", "La Défense", "Télétravail", "Toulouse"];
const EXPERIENCES = ["Tous", "Junior", "Mid-level", "Senior"];

const TYPE_STYLES: Record<string, string> = {
  CDI: "bg-green-100 text-green-700",
  CDD: "bg-yellow-100 text-yellow-700",
  Stage: "bg-blue-100 text-blue-700",
  Alternance: "bg-purple-100 text-purple-700",
};

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("Tous");
  const [selectedLocation, setSelectedLocation] = useState("Tous");
  const [selectedExperience, setSelectedExperience] = useState("Tous");

  const hasFilters =
    search !== "" ||
    selectedType !== "Tous" ||
    selectedLocation !== "Tous" ||
    selectedExperience !== "Tous";

  const filteredJobs = useMemo(() => {
    return JOBS.filter((job) => {
      const q = search.toLowerCase();
      const matchesSearch =
        q === "" ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.tags.some((t) => t.toLowerCase().includes(q));

      const matchesType =
        selectedType === "Tous" ||
        job.type === selectedType ||
        (selectedType === "Télétravail" && job.location === "Télétravail");

      const matchesLocation =
        selectedLocation === "Tous" || job.location === selectedLocation;

      const matchesExperience =
        selectedExperience === "Tous" || job.experience === selectedExperience;

      return matchesSearch && matchesType && matchesLocation && matchesExperience;
    });
  }, [search, selectedType, selectedLocation, selectedExperience]);

  function resetFilters() {
    setSearch("");
    setSelectedType("Tous");
    setSelectedLocation("Tous");
    setSelectedExperience("Tous");
  }

  return (
    <main className="min-h-screen bg-hec-ivory">
      {/* Hero */}
      <div className="bg-hec-navy px-4 pt-8 pb-12 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hec-gold/20 blur-3xl"
        />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-hec-gold text-xs font-semibold uppercase tracking-widest mb-2">
            HEC Paris · Carrières
          </p>
          <h1 className="text-white text-2xl font-bold leading-tight mb-1">
            Trouvez votre prochaine opportunité
          </h1>
          <p className="text-white/70 text-sm mb-6">
            {JOBS.length} offres disponibles · Mis à jour aujourd'hui
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              placeholder="Poste, entreprise ou compétence…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white text-hec-ink placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-hec-gold shadow-card"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-card border border-hec-stone p-4 mb-4">
          <FilterGroup
            label="Type de contrat"
            options={JOB_TYPES}
            selected={selectedType}
            onChange={setSelectedType}
          />
          <FilterGroup
            label="Lieu"
            options={LOCATIONS}
            selected={selectedLocation}
            onChange={setSelectedLocation}
          />
          <FilterGroup
            label="Expérience"
            options={EXPERIENCES}
            selected={selectedExperience}
            onChange={setSelectedExperience}
            last
          />
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-hec-navy">
            {filteredJobs.length} offre{filteredJobs.length !== 1 ? "s" : ""}{" "}
            trouvée{filteredJobs.length !== 1 ? "s" : ""}
          </p>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-hec-gold font-semibold active:scale-95 transition-all"
            >
              Réinitialiser ✕
            </button>
          )}
        </div>

        {/* Job cards */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-hec-stone p-10 text-center mb-8">
            <p className="text-4xl mb-3">🔎</p>
            <p className="text-hec-navy font-semibold mb-1">Aucune offre trouvée</p>
            <p className="text-slate-500 text-sm">
              Essayez d'autres critères de recherche.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-10">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl shadow-card border border-hec-stone p-5 hover:border-hec-navy transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-hec-sand flex items-center justify-center text-2xl flex-shrink-0">
                    {job.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-hec-navy font-semibold text-sm leading-tight">
                          {job.title}
                        </h2>
                        <p className="text-slate-500 text-xs mt-0.5">{job.company}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                          TYPE_STYLES[job.type] ?? "bg-hec-gold-soft text-hec-navy"
                        }`}
                      >
                        {job.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                      <span>📍 {job.location}</span>
                      <span>💰 {job.salary}</span>
                      <span>🎯 {job.experience}</span>
                    </div>

                    <p className="text-slate-600 text-xs mt-2 leading-relaxed line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-hec-sand text-hec-navy text-xs rounded-full font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-slate-400">{job.posted}</span>
                      <a
                        href={job.applyUrl}
                        className="px-4 py-2 bg-hec-navy text-white text-xs font-semibold rounded-full active:scale-95 transition-all hover:bg-hec-blue inline-block"
                      >
                        Postuler →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onChange,
  last = false,
}: {
  label: string;
  options: string[];
  selected: string;
  onChange: (v: string) => void;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-3"}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              selected === opt
                ? "bg-hec-navy text-white"
                : "bg-hec-sand text-hec-navy hover:bg-hec-stone"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
