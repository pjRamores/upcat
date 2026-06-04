import { useEffect, useState } from "react";
import { API_ROUTES } from "@upcat/shared";
import apiClient from "@lib/api";
import { useToastStore } from "@stores/toastStore";

interface FeatureGateConfig {
    id: string;
    accessLevel: "all" | "premium" | "disabled";
    hasLimit?: boolean;
    limits?: { free?: number | null; premium?: number | null };
    limitPeriod?: "daily" | "weekly" | "monthly" | "total" | null;
    description?: string;
}

interface FeatureEditState {
    freeLimit: string;
    premiumLimit: string;
    limitPeriod: "daily" | "weekly" | "monthly" | "total" | "";
}

export default function AdminFeaturesPage() {
    const [loading, setLoading] = useState(true);
    const [features, setFeatures] = useState<FeatureGateConfig[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingData, setEditingData] = useState<FeatureEditState | null>(null);
    const [saving, setSaving] = useState(false);
    const toast = useToastStore();

    const loadFeatures = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get<{ success: boolean; data: FeatureGateConfig[] }>({
                API_ROUTES.ADMIN.FEATURES,
            });
            if (data.success && Array.isArray(data.data)) {
                setFeatures(data.data);
            }
        } catch (error) {
            toast.addToast("error", "Failed to load features");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFeatures();
    }, []);

    const handleEdit = (feature: FeatureGateConfig) => {
        setEditingId(feature.id);
        setEditingData({
            freeLimit: feature.limits?.free === null || feature.limits?.free === undefined ? "" : String(feature.limits.free),
            premiumLimit: feature.limits?.premium === null || feature.limits?.premium === undefined ? "" : String(feature.limits.premium),
            limitPeriod: (feature.limitPeriod ?? "") as FeatureEditState["limitPeriod"],
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditingData(null);
    };

    const parseLimit = (value: string): number | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed);
        if (Number.isNaN(parsed)) return null;
        return Math.max(0, Math.floor(parsed));
    };

    const handleSave = async () => {
        if (!editingId || !editingData) return;

        try {
            setSaving(true);
            const { data } = await apiClient.put(`${API_ROUTES.ADMIN.FEATURES}/${editingId}`, {
                limits: {
                    free: parseLimit(editingData.freeLimit),
                    premium: parseLimit(editingData.premiumLimit),
                },
                limitPeriod: editingData.limitPeriod || null,
            });

            if (data.success) {
                toast.addToast("success", `Feature "${editingId}" updated successfully`);
                await loadFeatures();
                setEditingId(null);
                setEditingData(null);
            }
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to update feature";
            toast.addToast("error", message);
            console.error(error);
        } finally {
            setSaving(false);
        }
    };
}
.setSaving(false);
};

if (loading) {
    return <div className="p-6 text-slate-500">Loading features...</div>;
}

return (
    <div className="space-y-6 p-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Feature Limits</h1>
            <p className="mt-2 text-sm text-slate-600">
                Configure usage limits and periods for features across subscription tiers.
            </p>
        </div>
        <div className="grid gap-4">
            {features.map((feature) => (
                <div key={feature.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{feature.id}</h3>
                            {feature.description && (
                                <p className="mt-1 text-sm text-slate-600">{feature.description}</p>
                            )}
                        </div>
                        {editingId !== feature.id && (
                            <button
                                onClick={() => handleEdit(feature)}
                                className="ml-4 rounded bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700 hover:bg-primary-100"
                            >
                                Edit
                            </button>
                        )}
                    </div>
                    {editingId === feature.id ? (
                        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Free tier limit (blank = unlimited)
                                </label>
                                <input
                                    type="number"
                                    value={editingData?.freeLimit ?? ""}
                                    onChange={(e) => {
                                        prev => {
                                            ...prev,
                                            freeLimit: e.target.value,
                                        }
                                    }}
                                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Enter limit or leave blank for unlimited"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Premium tier limit (blank = unlimited)
                                </label>
                                <input
                                    type="number"
                                    value={editingData?.premiumLimit ?? ""}
                                    onChange={(e) => {
                                        prev => {
                                            ...prev,
                                            premiumLimit: e.target.value,
                                        }
                                    }}
                                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Enter limit or leave blank for unlimited"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Period
                                </label>
                                <select
                                    value={editingData?.limitPeriod ?? ""}
                                    onChange={(e) => {
                                        prev => {
                                            ...prev,
                                            limitPeriod: (e.target.value || "") as FeatureEditState["limitPeriod"],
                                        }
                                    }}
                                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="">Select period</option>
                                    <option value="1">1 month</option>
                                    <option value="3">3 months</option>
                                    <option value="6">6 months</option>
                                    <option value="12">12 months</option>
                                </select>
                            </div>
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    </div>
);
<option value="">None</option>
<option value="daily">Daily</option>
<option value="weekly">Weekly</option>
<option value="monthly">Monthly</option>
<option value="total">Total</option>
</select>
</div>
<div className="flex-gap-2">
<button
  onClick={handleSave}
  disabled={saving}
  className="rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
>
  {saving ? "Saving..." : "Save"}
</button>
<button
  onClick={handleCancel}
  disabled={saving}
  className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
>
  Cancel
</button>
</div>
): (
  <div className="mt-3 flex gap-4 text-sm text-slate-600">
    <div>
      <span className="font-medium">Free:</span>{" "}
      {feature.limits?.free === null || feature.limits?.free === undefined
        ? "Unlimited"
        : feature.limits.free}
    </div>
    <div>
      <span className="font-medium">Premium:</span>{" "}
      {feature.limits?.premium === null || feature.limits?.premium === undefined
        ? "Unlimited"
        : feature.limits.premium}
    </div>
    <div>
      <span className="font-medium">Period:</span>{" "}
      {feature.limitPeriod ?? "none"}
    </div>
  </div>
)}
</div>
{features.length === 0 && (
  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
    <p className="text-sm text-slate-600">No features found</p>
  </div>
)}
</div>;