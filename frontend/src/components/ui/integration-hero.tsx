const ICONS_ROW1 = [
  "https://cdn-icons-png.flaticon.com/512/5968/5968854.png", // Gmail
  "https://cdn-icons-png.flaticon.com/512/732/732221.png",  // Outlook
  "https://cdn-icons-png.flaticon.com/512/733/733609.png",  // Teams
  "https://cdn-icons-png.flaticon.com/512/732/732084.png",  // OneDrive
  "https://cdn-icons-png.flaticon.com/512/5968/5968816.png", // Google Drive
  "https://cdn-icons-png.flaticon.com/512/281/281763.png",  // Google
  "https://cdn-icons-png.flaticon.com/512/888/888879.png",  // Sheets
  "https://cdn-icons-png.flaticon.com/512/906/906324.png",  // Slack
];

const ICONS_ROW2 = [
  "https://cdn-icons-png.flaticon.com/512/174/174857.png",  // LinkedIn
  "https://cdn-icons-png.flaticon.com/512/888/888841.png",  // Drive
  "https://cdn-icons-png.flaticon.com/512/5968/5968875.png", // Notion
  "https://cdn-icons-png.flaticon.com/512/906/906361.png",  // Dropbox
  "https://cdn-icons-png.flaticon.com/512/732/732190.png",  // Excel
  "https://cdn-icons-png.flaticon.com/512/888/888847.png",  // Docs
  "https://cdn-icons-png.flaticon.com/512/5968/5968705.png", // HubSpot
  "https://cdn-icons-png.flaticon.com/512/2504/2504903.png", // Salesforce
];

const repeatedIcons = (icons: string[], repeat = 4) =>
  Array.from({ length: repeat }).flatMap(() => icons);

export default function IntegrationHero() {
  return (
    <div className="relative overflow-hidden">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.035)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Title */}
      <div className="relative text-center mb-10">
        <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold rounded-full border border-violet-200 bg-violet-50 text-violet-700 uppercase tracking-widest">
          Intégrations
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
          Bien sûr, on peut se connecter à toutes les applications que vous utilisez déjà
        </h2>
        <p className="text-base text-gray-600 max-w-2xl mx-auto">
          Synthèse ne vous demande pas de changer vos habitudes. Il s'intègre
          à ce que vous utilisez déjà — emails, messagerie, stockage,
          comptabilité, CRM — pour travailler avec vos données existantes, là
          où elles sont.
        </p>
      </div>

      {/* Carousel */}
      <div className="relative overflow-hidden pb-2">
        {/* Row 1 — scrolls left */}
        <div className="flex gap-6 whitespace-nowrap animate-scroll-left mb-6">
          {repeatedIcons(ICONS_ROW1, 4).map((src, i) => (
            <div
              key={i}
              className="h-14 w-14 flex-shrink-0 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center"
            >
              <img src={src} alt="" className="h-9 w-9 object-contain" />
            </div>
          ))}
        </div>

        {/* Row 2 — scrolls right */}
        <div className="flex gap-6 whitespace-nowrap animate-scroll-right">
          {repeatedIcons(ICONS_ROW2, 4).map((src, i) => (
            <div
              key={i}
              className="h-14 w-14 flex-shrink-0 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center"
            >
              <img src={src} alt="" className="h-9 w-9 object-contain" />
            </div>
          ))}
        </div>

        {/* Fade masks */}
        <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-stone-100 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-stone-100 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
