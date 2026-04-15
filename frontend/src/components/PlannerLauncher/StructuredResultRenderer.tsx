// ── Shape-aware renderer for Smart Extract results ────────────────────────────
//
// Detects 3 known shapes (prospect, contrat, notes) + a generic fallback.
// All labels are in French.

// ── Prospect / Email client view ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProspectView({ data }: { data: any }) {
  const prospect = data.prospect ?? data;
  return (
    <div className="space-y-6">
      <SectionHeader label="Fiche prospect" />

      {/* Metadata grid */}
      <MetadataGrid
        items={[
          ["Nom", prospect.nom ?? prospect.nom_complet],
          ["Email", prospect.email],
          ["Téléphone", prospect.telephone ?? prospect.tel],
          ["Adresse", prospect.adresse],
          ["Recommandation", prospect.recommandation],
        ]}
      />

      {/* Project */}
      {(prospect.projet || prospect.project) && (
        <>
          <SectionHeader label="Projet" />
          <MetadataGrid
            items={[
              ["Type de travaux", prospect.projet?.type ?? prospect.project?.type],
              ["Surface", prospect.projet?.surface ?? prospect.project?.surface],
              ["Budget", prospect.projet?.budget ?? prospect.project?.budget],
              ["Délais", prospect.projet?.delais ?? prospect.project?.delais],
              ["Urgence", prospect.projet?.urgence ?? prospect.project?.urgence],
            ]}
          />
        </>
      )}

      {/* Secondary projects */}
      {prospect.projets_secondaires && (
        <>
          <SectionHeader label="Projets secondaires" />
          <BulletList items={arrayify(prospect.projets_secondaires)} />
        </>
      )}

      {/* Questions */}
      {(prospect.questions || prospect.points_a_traiter) && (
        <>
          <SectionHeader label="Questions / Points à traiter" />
          <BulletList
            items={arrayify(prospect.questions ?? prospect.points_a_traiter)}
          />
        </>
      )}
    </div>
  );
}

// ── Contrat view ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ContratView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <SectionHeader label="Récapitulatif du contrat" />

      {/* Parties */}
      {data.parties && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(data.parties).map(([role, info]) => (
            <div
              key={role}
              className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4"
            >
              <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium mb-2">
                {formatKey(role)}
              </p>
              {typeof info === "object" && info !== null ? (
                <MetadataGrid
                  items={Object.entries(info as Record<string, unknown>).map(
                    ([k, v]) => [formatKey(k), v]
                  )}
                  compact
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">
                  {String(info)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Object + dates */}
      <MetadataGrid
        items={[
          ["Objet", data.objet],
          ["Date de début", data.date_debut],
          ["Date de livraison", data.date_livraison ?? data.date_fin],
          ["Durée", data.duree],
        ]}
      />

      {/* Financial */}
      <SectionHeader label="Conditions financières" />
      <MetadataGrid
        items={[
          ["Prix HT", data.prix_ht ?? data.montant_ht],
          ["Prix TTC", data.prix_ttc ?? data.montant_ttc],
          ["TVA", data.tva],
          [
            "Taux journalier complémentaire",
            data.taux_journalier ?? data.taux_complementaire,
          ],
        ]}
      />

      {/* Payment schedule */}
      {data.echeancier && (
        <>
          <SectionHeader label="Échéancier de paiement" />
          <SimpleTable data={arrayify(data.echeancier)} />
        </>
      )}

      {/* Penalties */}
      {(data.penalites || data.penalites_retard) && (
        <>
          <SectionHeader label="Pénalités de retard" />
          {typeof (data.penalites ?? data.penalites_retard) === "string" ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {data.penalites ?? data.penalites_retard}
            </p>
          ) : (
            <MetadataGrid
              items={Object.entries(
                (data.penalites ?? data.penalites_retard) as Record<
                  string,
                  unknown
                >
              ).map(([k, v]) => [formatKey(k), v])}
            />
          )}
        </>
      )}

      {/* Résiliation */}
      {(data.resiliation || data.preavis) && (
        <>
          <SectionHeader label="Résiliation" />
          <MetadataGrid
            items={[
              ["Préavis", data.preavis],
              ["Conditions", data.resiliation],
            ]}
          />
        </>
      )}
    </div>
  );
}

// ── Notes de chantier view ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NotesView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* Tasks */}
      {data.taches && (
        <>
          <SectionHeader label="Plan d'actions" />
          <SimpleTable data={arrayify(data.taches)} />
        </>
      )}

      {/* Materials */}
      {(data.materiaux || data.materiaux_consommes) && (
        <>
          <SectionHeader label="Matériaux consommés" />
          <SimpleTable
            data={arrayify(data.materiaux ?? data.materiaux_consommes)}
          />
        </>
      )}

      {/* Billing items */}
      {(data.facturation || data.elements_a_facturer) && (
        <>
          <SectionHeader label="Éléments à facturer" />
          <BulletList
            items={arrayify(
              data.facturation ?? data.elements_a_facturer
            ).map((item) =>
              typeof item === "string" ? item : JSON.stringify(item)
            )}
          />
        </>
      )}

      {/* Contacts */}
      {data.contacts && (
        <>
          <SectionHeader label="Contacts mentionnés" />
          <SimpleTable data={arrayify(data.contacts)} />
        </>
      )}
    </div>
  );
}

// ── Generic fallback ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GenericView({ data }: { data: any }) {
  if (typeof data !== "object" || data === null) {
    return (
      <pre className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-xs font-mono text-gray-600 dark:text-gray-300 max-h-96 overflow-auto whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  const entries = Object.entries(data);
  const scalarEntries: [string, unknown][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arrayEntries: [string, any[]][] = [];
  const objectEntries: [string, Record<string, unknown>][] = [];

  for (const [key, val] of entries) {
    if (Array.isArray(val)) {
      arrayEntries.push([key, val]);
    } else if (typeof val === "object" && val !== null) {
      objectEntries.push([key, val as Record<string, unknown>]);
    } else {
      scalarEntries.push([key, val]);
    }
  }

  return (
    <div className="space-y-6">
      {scalarEntries.length > 0 && (
        <>
          <SectionHeader label="Informations" />
          <MetadataGrid
            items={scalarEntries.map(([k, v]) => [formatKey(k), v])}
          />
        </>
      )}

      {arrayEntries.map(([key, arr]) => (
        <div key={key}>
          <SectionHeader label={formatKey(key)} />
          {arr.length > 0 && typeof arr[0] === "object" ? (
            <SimpleTable data={arr} />
          ) : (
            <BulletList items={arr.map(String)} />
          )}
        </div>
      ))}

      {objectEntries.map(([key, obj]) => (
        <div key={key}>
          <SectionHeader label={formatKey(key)} />
          <MetadataGrid
            items={Object.entries(obj).map(([k, v]) => [formatKey(k), v])}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

interface StructuredResultRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export function StructuredResultRenderer({
  data,
}: StructuredResultRendererProps) {
  if (!data) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Aucune donnée extraite.
      </p>
    );
  }

  // Shape detection
  if (data.prospect || data.type === "prospect") {
    return <ProspectView data={data} />;
  }
  if (data.parties || data.type === "contrat") {
    return <ContratView data={data} />;
  }
  if (data.taches || data.type === "notes") {
    return <NotesView data={data} />;
  }

  return <GenericView data={data} />;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold whitespace-nowrap">
        {label}
      </p>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

function MetadataGrid({
  items,
  compact = false,
}: {
  items: [string, unknown][];
  compact?: boolean;
}) {
  const filtered = items.filter(([, v]) => v != null && v !== "");
  if (filtered.length === 0) return null;

  return (
    <div
      className={
        compact
          ? "space-y-1.5"
          : "grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2"
      }
    >
      {filtered.map(([label, value], i) => (
        <div key={i} className="flex justify-between sm:flex-col gap-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {label}
          </span>
          <span
            className={`text-sm font-medium text-gray-900 dark:text-white ${compact ? "" : "sm:mt-0"}`}
          >
            {String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SimpleTable({ data }: { data: Record<string, any>[] }) {
  if (data.length === 0) return null;
  const columns = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-blue-50 dark:bg-blue-900/20">
            {columns.map((col) => (
              <th
                key={col}
                className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300"
              >
                {formatKey(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300"
                >
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function arrayify(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return [val];
  return [];
}
