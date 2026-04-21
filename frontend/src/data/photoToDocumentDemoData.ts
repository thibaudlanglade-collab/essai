export interface PhotoExample {
  id: string
  iconName: string
  title: string
  description: string
  imagePath: string
  resultType: "pdf" | "excel" | "both"
  resultPreview?: string
  resultData?: any
}

export const PHOTO_EXAMPLES: PhotoExample[] = [
  {
    id: "note-manuscrite",
    iconName: "Pen",
    title: "Note manuscrite",
    description: "Notes prises au stylo dans un carnet pendant un rendez-vous client",
    imagePath: "/demo-photos/photo-note-manuscrite.jpg",
    resultType: "pdf",
    resultPreview: `RENDEZ-VOUS CLIENT — CATHERINE LEBLANC

Date du rendez-vous : Mardi 15 avril 2025, 14h30

CONTEXTE
- Recommandée par Mme Rousseau

PROJET
- Rénovation salle de bain
- Surface : 8 à 9 m² environ

SOUHAITS DU CLIENT
- Douche italienne
- Meuble vasque suspendu

BUDGET ET DÉLAI
- Budget : 15 000 à 18 000 €
- Délai souhaité : avant fin juin

POINTS TECHNIQUES À PRÉVOIR
- Tuyaux à changer
- Tableau électrique à mettre aux normes

CONTACT
- Téléphone : 06 42 58 91 23`
  },
  {
    id: "ticket-berghotel",
    iconName: "Receipt",
    title: "Ticket de caisse (allemand)",
    description: "Addition restaurant suisse en allemand — démontre la lecture multilingue",
    imagePath: "/demo-photos/photo-ticket-berghotel.jpg",
    resultType: "excel",
    resultPreview: "Tableau Excel généré : 4 lignes produits + totaux + conversion EUR",
    resultData: {
      filename: "berghotel-grosse-scheidegg-30-07-2007.xlsx",
      header: {
        title: "Berghotel Grosse Scheidegg",
        address: "3818 Grindelwald, Suisse",
        owner: "Famille R. Müller",
        invoiceNumber: "4572",
        date: "30/07/2007 — 13:29",
        table: "7/01",
        server: "Ursula"
      },
      sheets: [
        {
          name: "Addition",
          headers: ["Produit (original)", "Traduction FR", "Quantité", "Prix unit. (CHF)", "Total (CHF)"],
          rows: [
            ["Latte Macchiato", "Latte Macchiato", 2, 4.50, 9.00],
            ["Gloki", "Gloki (digestif local)", 1, 5.00, 5.00],
            ["Schweinschnitzel", "Escalope de porc", 1, 22.00, 22.00],
            ["Chässpätzli", "Spätzli au fromage", 1, 18.50, 18.50]
          ],
          totals: [
            ["Total", "", "", "", 54.50],
            ["TVA 7,6% (incluse)", "", "", "", 3.85],
            ["Équivalent EUR", "", "", "", "36,33 €"]
          ]
        }
      ]
    }
  },
  {
    id: "tableau-imprime",
    iconName: "Table",
    title: "Tableau imprimé",
    description: "Planning chantier semaine sur A4 (10 compagnons × 5 jours)",
    imagePath: "/demo-photos/photo-tableau-imprime.jpg",
    resultType: "excel",
    resultPreview: "Tableau Excel reconstruit : planning 10 lignes × 5 jours",
    resultData: {
      filename: "planning-chantiers-semaine-16.xlsx",
      header: {
        title: "Planning Chantiers — Semaine 16",
        subtitle: "Du 14 au 18 avril 2025",
        company: "Durand BTP — Rochefort-du-Gard"
      },
      sheets: [
        {
          name: "Planning S16",
          headers: ["Compagnon", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
          rows: [
            ["Marc Dubois", "Mairie", "Mairie", "Mairie", "Mairie", "Mairie"],
            ["Pierre Lefebvre", "SCI Olivier", "SCI Olivier", "SCI Olivier", "M. Martin", "M. Martin"],
            ["Ahmed Hassan", "Mairie", "Mairie", "Copropriété", "Copropriété", "Copropriété"],
            ["Lucas Bernard", "M. Martin", "M. Martin", "M. Martin", "M. Martin", "M. Martin"],
            ["Paulo Silva", "M. Martin", "M. Martin", "M. Martin", "M. Martin", "Congés"],
            ["Mohamed C.", "Mairie", "M. Martin", "M. Martin", "Mairie", "Mairie"],
            ["François M.", "Congés", "Congés", "Mairie", "M. Martin", "Mairie"],
            ["Samuel D.", "SCI Olivier", "SCI Olivier", "Copropriété", "Copropriété", "Copropriété"],
            ["Kevin Rodriguez", "Restaurant", "Restaurant", "—", "—", "—"],
            ["Cédric Nguyen", "Formation", "M. Martin", "M. Martin", "M. Martin", "M. Martin"]
          ]
        }
      ]
    }
  }
]

export const PHOTO_FEATURES = [
  {
    iconName: "PenTool",
    title: "Lecture des écritures manuscrites",
    description: "Synthèse déchiffre vos notes manuscrites, même mal écrites. Pattes de mouche, pâtés, ratures : le texte ressort propre et lisible dans le document final."
  },
  {
    iconName: "Table",
    title: "Reconstruction de tableaux",
    description: "Un tableau imprimé ou photographié de travers ? Synthèse identifie les lignes et les colonnes, et vous le rend dans Excel parfaitement aligné, prêt à être trié, filtré, calculé."
  },
  {
    iconName: "Receipt",
    title: "Tickets et factures papier",
    description: "Photographiez un ticket de caisse, une facture reçue par courrier, un bon de livraison : Synthèse extrait les lignes, calcule les totaux, et vous fait un PDF ou un Excel propre."
  },
  {
    iconName: "Globe",
    title: "Multilingue",
    description: "Vos documents sont en français, anglais, espagnol, italien ou allemand ? Synthèse les lit dans toutes ces langues et vous les rend dans la langue de votre choix."
  },
  {
    iconName: "Palette",
    title: "Export à votre charte",
    description: "Les documents PDF générés peuvent reprendre votre logo, vos couleurs, votre mise en page habituelle. Vous restez maître de votre identité visuelle."
  },
  {
    iconName: "Smartphone",
    title: "Depuis votre téléphone",
    description: "Prenez la photo directement depuis votre téléphone, où que vous soyez : sur un chantier, dans un restaurant, en visite client. Le résultat arrive sur votre ordinateur en quelques secondes."
  }
]
