import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  type EmailTopic,
  type EmailTopicInput,
  createTopic,
  deleteTopic,
  listTopics,
  resetDefaults,
  updateTopic,
} from "../../api/emailTopicsClient";

const PRESET_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
  "#52525b",
];

type Props = {
  onClose: () => void;
};

export default function TopicsSettingsModal({ onClose }: Props) {
  const [topics, setTopics] = useState<EmailTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTopics();
      setTopics(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(String(err));
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const input: EmailTopicInput = {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        color: newColor,
        display_order: topics.length + 1,
      };
      const created = await createTopic(input);
      setTopics((prev) => [...prev, created]);
      setNewName("");
      setNewDesc("");
      setNewColor(PRESET_COLORS[0]);
      setShowAddForm(false);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleColorChange = async (id: number, color: string) => {
    try {
      const updated = await updateTopic(id, { color });
      setTopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setColorPickerFor(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleMove = async (id: number, direction: "up" | "down") => {
    const idx = topics.findIndex((t) => t.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === topics.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newTopics = [...topics];
    const a = newTopics[idx];
    const b = newTopics[swapIdx];

    try {
      const [updA, updB] = await Promise.all([
        updateTopic(a.id, { display_order: b.display_order }),
        updateTopic(b.id, { display_order: a.display_order }),
      ]);
      newTopics[idx] = updA;
      newTopics[swapIdx] = updB;
      // Re-sort by display_order
      newTopics.sort((x, y) => x.display_order - y.display_order);
      setTopics(newTopics);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleEditSave = async (id: number) => {
    try {
      const updated = await updateTopic(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setTopics((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    try {
      const result = await resetDefaults();
      setTopics(result.topics);
      setConfirmReset(false);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-foreground">
            Paramètres des catégories
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-600">
            {error}
            <button
              className="ml-2 underline"
              onClick={() => setError(null)}
            >
              Fermer
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {loading && (
            <p className="text-xs text-gray-400 py-4 text-center">
              Chargement…
            </p>
          )}
          {!loading &&
            topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0"
              >
                {/* Color dot */}
                <button
                  onClick={() =>
                    setColorPickerFor(
                      colorPickerFor === topic.id ? null : topic.id,
                    )
                  }
                  className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                  style={{ backgroundColor: topic.color }}
                  title="Changer couleur"
                />

                {/* Color picker popover */}
                {colorPickerFor === topic.id && (
                  <div className="absolute z-10 mt-6 bg-white border border-gray-200 rounded-lg p-2 flex gap-1.5 flex-wrap w-32 shadow-lg">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => void handleColorChange(topic.id, c)}
                        className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: c,
                          borderColor:
                            topic.color === c ? "white" : "transparent",
                          borderWidth: 2,
                          borderStyle: "solid",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  {editingId === topic.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded px-2 py-0.5 text-xs text-foreground outline-none w-full"
                        autoFocus
                      />
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description (optionnel)"
                        className="bg-gray-50 border border-gray-300 rounded px-2 py-0.5 text-[10px] text-muted-foreground outline-none w-full"
                      />
                      <div className="flex gap-1.5 mt-0.5">
                        <button
                          onClick={() => void handleEditSave(topic.id)}
                          className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-muted-foreground hover:text-foreground"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="text-left w-full"
                      onClick={() => {
                        setEditingId(topic.id);
                        setEditName(topic.name);
                        setEditDesc(topic.description || "");
                      }}
                    >
                      <p className="text-xs font-medium text-foreground hover:text-gray-700">
                        {topic.name}
                      </p>
                      {topic.description && (
                        <p className="text-[10px] text-gray-400 truncate">
                          {topic.description}
                        </p>
                      )}
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => void handleMove(topic.id, "up")}
                    className="p-1 text-gray-400 hover:text-foreground transition-colors"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => void handleMove(topic.id, "down")}
                    className="p-1 text-gray-400 hover:text-foreground transition-colors"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => void handleDelete(topic.id)}
                    disabled={topic.name === "Autre"}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      topic.name === "Autre"
                        ? "Le topic de repli ne peut pas être supprimé"
                        : "Supprimer"
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-5 pb-3 border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-medium text-foreground">
              Nouvelle catégorie
            </p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom *"
              className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-foreground placeholder:text-gray-300 outline-none"
              autoFocus
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optionnel)"
              className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-muted-foreground placeholder:text-gray-300 outline-none"
            />
            <div className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-gray-400" />
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: newColor === c ? "white" : "transparent",
                    borderWidth: 2,
                    borderStyle: "solid",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void handleAdd()}
                disabled={!newName.trim()}
                className="text-xs px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-xs px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setShowAddForm(true);
              setConfirmReset(false);
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-muted-foreground hover:text-foreground transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une catégorie
          </button>
          <button
            onClick={() => void handleReset()}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              confirmReset
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-gray-100 border-gray-200 text-gray-400 hover:text-muted-foreground"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {confirmReset ? "Confirmer la réinitialisation" : "Réinitialiser"}
          </button>
        </div>
      </div>
    </div>
  );
}
