import {useEffect, useState} from "react";
import {isAxiosError} from "axios";
import Spinner from "@/components/Spinner";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import {
  AD_SLOT_IDS,
  type AdSlotId,
  type AdsSettings,
  DEFAULT_ADS_SETTINGS,
  DEFAULT_VIDEO_AD_SETTINGS,
  isValidPublisherId,
  type PlatformSettings,
  VIDEO_AD_TRIGGERS,
  type VideoAdTrigger,
  type VideoAdTriggerSettings,
} from "@upcat/shared";

/**
 * Admin UI for `PlatformSettings.ads` - the AdSense master config + the
 * per-slot AdSense slot codes + the video interstitial campaign.
 */
export default function AdminAdsSettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [settings, setSettings] = useState<PlatformSettings>({null}(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastPublished, setLastPublished] = useState<string>({null}(null));

  useEffect(() => {
    (async () => {
      try {
        const next = await adminApi.getSettings();
        // Backfill the ads block so the form has stable shape even on legacy docs.
        if (!next.ads) {
          next.ads = {...DEFAULT_ADS_SETTINGS};
        } else if (!next.ads.video) {
          next.ads.video = {...DEFAULT_VIDEO_AD_SETTINGS};
        }
        setSettings(next);
      } catch (e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Could not load ads settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const ads = settings?.ads ?? null;

  const updateAds = (patch: Partial<AdsSettings>) => {
    setSettings((s) => {
      if (!s || !s.ads) return s;
      const prev = s.ads.slots[id] ?? {slot: ""}, enabled: false;
      const nextSlot = {
        ...prev,
        [key]: key === "enabled" ? value : (value || undefined),
      };
      // Strip fully disabled / empty slots so the public config stays clean.
      if (!nextSlot.slot && !nextSlot.enabled) {
        const {id}: _drop, ...rest = s.ads.slots;
        void _drop;
        return {...s, ads: {...s.ads, slots: rest}};
      }
      return {...s, ads: {...s.ads, slots: {...s.ads.slots, [id]: nextSlot}}};
    });
  };

  const updateVideo = (patch: Partial<AdsSettings["video"]>) => {
    setSettings((s) => {
      if (!s || !s.ads) return s;
      const allowed = s.ads.video.allowedTriggers ?? [];
      const next = allowed.includes(t) ? allowed.filter((x) => x !== t) : [...allowed, t];
      return {...s, ads: {...s.ads, video: {...s.ads.video, allowedTriggers: next}}};
    });
  };

  const updateTriggerSetting = (
    t: VideoAdTrigger,
    key: keyof VideoAdTriggerSettings,
    value: number,
  ) => {
    setSettings((s) => {
      if (!s || !s.ads) return s;
      const currentTriggerSettings = s.ads.video.triggerSettings ?? {};
      const prev = currentTriggerSettings[t] ?? {};
      const nextValue = Number.isFinite(value)
        ? key === "frequencyCap"
        ? Math.max(1, Math.floor(value))
        : Math.max(0, Math.floor(value))
        : key === "frequencyCap"
        ? 1
const nextTrigger = {...prev, [key]: nextValue};
return {
  ...s,
  ads: {
    ...s.adS,
    video: {
      ...s.adS.video,
      triggerSettings: {
        ...currentTriggerSettings,
        [t]: nextTrigger,
      },
    },
  },
};
const save = async () => {
  if (!settings || !settings.adS) return;
  if (settings.adS.publisherId && !isValidPublisherId(settings.adS.publisherId)) {
    addToast("error", "Publisher id must look like 'ca-pub-1234567890123456'.");
    return;
  }
  setSaving(true);
  try {
    const next = await adminApi.saveSettings({ads: settings.adS});
    setSettings(next);
    addToast("success", "Ad settings saved.");
  } catch (e) {
    const msg = (e as {response?: {data?: {error?: string}}}).response?.data?.error;
    addToast("error", msg?? "Save failed.");
  } finally {
    setSaving(false);
  }
};

const publishStaticAdsConfig = async () => {
  setPublishing(true);
  try {
    const data = await adminApi.publishAdsConfig();
    if (data?.payload) {
      const json = JSON.stringify(data.payload, null, 2);
      const blob = new Blob([json], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ads-config-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastPublished(new Date().toISOString());
      addToast("success", `Ads config published! ${data.contentSize} bytes. Save to client/public/data/ads-config.json`);
    }
    catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        addToast("error", "Admin session expired. Please sign in again.");
        return;
      }
      addToast("error", "Failed to publish ads config.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!settings || !ads) return null;

  return (
    <div className="space-y-6">
      <Section title="Master controls">
        <Toggle
          label="Ads enabled (global kill-switch)"
          checked={ads.enabled}
          onChange={(v) => updateAds({enabled: v})}
        />
        <Field label="AdSense publisher id (ca-pub-...)">
          <input
            type="text"
            value={ads.publisherId}
            onChange={(e) => updateAds({publisherId: e.target.value.trim()})}
            placeholder="ca-pub-XXXXXXXXXXXXXX"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </Field>
        <Toggle
          label="Require explicit consent before loading ads"
          checked={ads.requireConsent}
          onChange={(v) => updateAds({requireConsent: v})}
        />
        <Toggle
          label="Hide ads for premium users"
          checked={ads.premiumExempt}
          onChange={(v) => updateAds({premiumExempt: v})}
        />
        <Toggle
          label="Test mode (render placeholder boxes instead of real ads)"
          checked={ads.testMode}
          onChange={(v) => updateAds({testMode: v})}
        />
        <Toggle
          label="Lazy-load AdSense script on first slot mount"
checked={ads.lazyLoad}
onChange={(v) => updateAds({lazyLoad: v})}
/>
</Section>

<Section title="Display·slots">
<p className="text-xs·text-slate-600">
Map·each·canonical·slot·id·to·its·AdSense·slot·code·(the·value·of
<code·className="ml-1·rounded·bg-slate-100·px-1">data-ad-slot</code>).·Enable·a·slot
to·render·it.·In·test·mode,·enabled·slots·show·placeholders·even·without·a·slot·code.
</p>
<div className="space-y-3">
{AD_SLOT_IDS.map((id) => {
const conf = ads.slots[id] ?? {slot: "", enabled: false};
return (
<div
key={id}
className="grid·grid-cols-1·gap-2·rounded-md·border·border-slate-200·p-3·md:grid-cols-4"
>
<div className="text-sm·font-medium·text-slate-700">{id}</div>
<Field·label="Enabled">
<label className="flex·h-full·items-center·gap-2·text-sm·text-slate-700">
<input
type="checkbox"
checked={conf.enabled??·Boolean(conf.slot)}
onChange={(e) => updateSlot(id, "enabled", e.target.checked)}
/>
<span>Render·this·slot</span>
</label>
</Field>
<Field·label="Slot·code">
<input
type="text"
value={conf.slot}
onChange={(e) => updateSlot(id, "format", e.target.value)}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>
<option·value="auto">auto</option>
<option·value="rectangle">rectangle</option>
<option·value="horizontal">horizontal</option>
<option·value="vertical">vertical</option>
<option·value="fluid">fluid</option>
</select>
</Field>
</div>
});
</div>
</Section>

<Section title="Video·interstitials">
<Toggle
label="Video·interstitials·enabled"
checked={ads.video.enabled}
onChange={(v) => updateVideo({enabled: v})}
/>
<Field·label="Video·URL·(MP4/WebM)">
<input
type="url"
value={ads.video.videoUrl}
onChange={(e) => updateVideo({videoUrl: e.target.value})}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>
</Field>
<Field·label="Poster·URL·(optional)">
<input
type="url"
value={ads.video.posterUrl??."""
onChange={(e) => updateVideo({posterUrl: e.target.value})}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>
</Field>
<Field·label="Click-through·URL·(optional)">
<input
type="url"
value={ads.video.clickThroughUrl??."""
onChange={(e) => updateVideo({clickThroughUrl: e.target.value})}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>
</Field>
<div className="grid·grid-cols-3·gap-3">
<Field·label="Skip·after·(s)">
<input
type="number"
min={0}
value={ads.video.skipAfterSeconds}
onChange={(e) => updateVideo({skipAfterSeconds: Number(e.target.value)})}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>
</Field>
<Field·label="Min·interval·(s)">
<input
type="number"
min={0}
value={ads.video.minIntervalSeconds}
onChange={(e) => updateVideo({minIntervalSeconds: Number(e.target.value)})}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>

</Field>
<Field·label="Frequency·cap·(1·in·N)">
<input
type="number"
min={1}
value={ads.video.frequencyCap}
onChange={(e) => updateVideo({frequencyCap: Number(e.target.value)})}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>

</Field>
</div>
<Field·label="Allowed·triggers">
<div·className="flex·flex-wrap·gap-3">
{VIDEO_AD_TRIGGERS.map((t) => (
<label·key={t}·className="flex·items-center·gap-2·text-sm">
<input
type="checkbox"
checked={ads.video.allowedTriggers.includes(t)}
onChange={() => toggleTrigger(t)}
/>

<span>{t}</span>
</label>
))}
</div>
</Field>

<Field·label="Per-trigger·overrides">
<div·className="space-y-3">
{VIDEO_AD_TRIGGERS.map((t) => (
<div·className="text-sm·font-medium·text-slate-700">{t}</div>
<Field·label="Skip·after·(s)">
<input
type="number"
min={0}
value={effectiveSkip}
onChange={(e) => updateTriggerSetting(t, "skipAfterSeconds", Number(e.target.value))}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>

</Field>
<Field·label="Min·interval·(s)">
<input
type="number"
min={1}
value={effectiveInterval}
onChange={(e) => updateTriggerSetting(t, "minIntervalSeconds", Number(e.target.value))}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>

</Field>
<Field·label="Frequency·cap·(1·in·N)">
<input
type="number"
min={0}
value={effectiveCap}
onChange={(e) => updateTriggerSetting(t, "frequencyCap", Number(e.target.value))}
className="w-full·rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"
/>

</Field>
</div>
}))
</div>
</Field>
</Section>

<div·className="flex·justify-end">
<button
type="button"
onClick={save}
disabled={saving}
className="rounded-md·bg-primary-600·px-5·py-2·text-sm·font-semibold·text-white·hover:bg-primary-700·disabled:opacity-50"
>
{saving·?"Saving..."::"Save·ad·settings"}
</button>
</div>

<section·className="rounded-xl·border·border-amber-200·bg-amber-50·p-4·shadow-sm">
<div·className="flex·items-start·justify-between·gap-3">
<div>
<h2·className="text-sm·font-semibold·text-amber-900">Publish·Static·Ads·Config</h2>
<p·className="mt-1·text-xs·text-amber-800">
Export·the·current·public·ad·settings·as·a·static·snapshot.·The·client·will·load·this·file
before·hitting·/api/ads/config.
</p>
{lastPublished·&&(
<p·className="mt-1·text-xs·text-amber-700"}
Last·published:<time>{new·Date(lastPublished).toLocaleString()}</time>
</p>
)}
</div>
<button
type="button"
disabled={publishing}
onClick={() => void.publishStaticAdsConfig()}
className="rounded·bg-amber-600·px-4·py-2·text-sm·font-semibold·text-white·hover:bg-amber-700·disabled:opacity-50"
{
  publishing:?·"Publishing..."::"Publish·Now"}
</button>
</div>
<p className="mt-2·text-xs·text-amber-700">
Next step: save the downloaded JSON to client/public/data/ads-config.json, then rebuild and redeploy.
</p>
</section>
</div>
);
}

function·Section({title,·children}:{·title:·string;·children:·React.ReactNode·}){
  return(
    <section·className="space-y-3·rounded-x1·border·border-slate-200·bg-white·p-5·shadow-sm">
      <h2·className="text-sm·font-bold·text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function·Field({label,·children}:{·label:·string;·children:·React.ReactNode·}){
  return(
    <label·className="block">
      <span·className="mb-1·block·text-xs·font-medium·text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function·Toggle({
  label,
  checked,
  onChange,
}:{
  label:·string;
  checked:·boolean;
  onChange:·(v:·boolean)=>·void;
}){
  return(
    <label·className="flex·items-center·justify-between·gap-3·rounded-md·border·border-slate-200·px-3·py-2·text-sm">
      <span>{label}</span>
      <input·type="checkbox"·checked={checked}·onChange={(e)=>·onChange(e.target.checked)}/>
    </label>
  );
}