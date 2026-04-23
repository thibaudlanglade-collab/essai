// Demo team for the "Mon équipe" full-screen page when no DB employees exist yet.

export interface DemoTeamMember {
  id: number
  name: string
  position: string
  hours_per_week: number
  working_days: string[]
  skills: string[]
  unavailable_dates: string[]
  email: string | null
  phone: string | null
  hire_date: string | null
}

export const DEMO_TEAM: DemoTeamMember[] = [
  {
    id: -1,
    name: "Marie Dupont",
    position: "Cheffe de chantier",
    hours_per_week: 39,
    working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    skills: ["pose carrelage", "plomberie", "encadrement"],
    unavailable_dates: ["2025-04-25"],
    email: "marie@durand-btp.fr",
    phone: "06 12 34 56 78",
    hire_date: "2019-03-12",
  },
  {
    id: -2,
    name: "Thomas Bernard",
    position: "Apprenti maçon",
    hours_per_week: 28,
    working_days: ["monday", "tuesday", "wednesday", "thursday"],
    skills: ["maçonnerie", "manutention"],
    unavailable_dates: [],
    email: "thomas@durand-btp.fr",
    phone: "06 23 45 67 89",
    hire_date: "2024-09-02",
  },
  {
    id: -3,
    name: "Khaled Mansouri",
    position: "Plombier-chauffagiste",
    hours_per_week: 35,
    working_days: ["tuesday", "wednesday", "thursday", "friday", "saturday"],
    skills: ["plomberie", "chauffage", "soudure"],
    unavailable_dates: ["2025-04-28", "2025-04-29"],
    email: "khaled@durand-btp.fr",
    phone: "06 34 56 78 90",
    hire_date: "2021-06-01",
  },
  {
    id: -4,
    name: "Sophie Lambert",
    position: "Électricienne",
    hours_per_week: 35,
    working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    skills: ["électricité", "domotique", "tableaux"],
    unavailable_dates: [],
    email: "sophie@durand-btp.fr",
    phone: "06 45 67 89 01",
    hire_date: "2022-11-15",
  },
  {
    id: -5,
    name: "Jean-Paul Roux",
    position: "Maçon expérimenté",
    hours_per_week: 39,
    working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    skills: ["maçonnerie", "lecture de plans", "coffrage"],
    unavailable_dates: ["2025-05-02"],
    email: null,
    phone: "06 56 78 90 12",
    hire_date: "2015-01-10",
  },
  {
    id: -6,
    name: "Léa Moreau",
    position: "Peintre",
    hours_per_week: 30,
    working_days: ["monday", "wednesday", "friday"],
    skills: ["peinture", "enduits", "papier-peint"],
    unavailable_dates: [],
    email: "lea@durand-btp.fr",
    phone: "06 67 89 01 23",
    hire_date: "2023-04-20",
  },
]
