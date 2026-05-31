import {useEffect, useState} from "react";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import {useSetFilter} from "@/hooks/useSetFilter";
import type {QuestionMediaAsset} from "@upcat/shared";

export default function AdminQuestionMediaLibraryPage() {
  const addToast = useToastStore((s) => s.addToast);
  const {setOptions, selectedSetId, setSelectedSetId} = useSetFilter();
  const [items, setItems] = useState<QuestionMediaAsset[]>(([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [filename, setFilename] = useState("");
  const [mimeType, setMimeType] = useState("image/png");
  const [kind, setKind] = useState("<image>|<audio>|<video>|<other>>("image");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [base64Data, setBase64Data] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listQuestionMediaAssets({
        limit: 100,
        setId: selectedSetId || undefined,
      });
      setItems(result.items ?? []);
      catch (e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Could not load media assets.");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSetId]);

    const upload = async () => {
      if (!filename || !mimeType || !base64Data) {
        addToast("error", "filename, mimeType, and base64Data are required.");
        return;
      }
      setUploading(true);
      try {
        await adminApi.uploadQuestionMediaAsset({
          filename,
          mimeType,
          base64Data,
          kind,
          altText: altText || undefined,
          caption: caption || undefined,
        });
        addToast("success", "Asset uploaded.");
        setFilename("");
        setAltText("");
        setCaption("");
        setBase64Data("");
        refresh();
      } catch (e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Upload failed.");
      } finally {
        setUploading(false);
      }
    };

    const remove = async (id: string) => {
      try {
        await adminApi.deleteQuestionMediaAsset(id);
        addToast("success", "Asset deleted.");
        refresh();
      } catch (e) {
        const msg = (e as {response?: {data?: {error?: string}}})?.response?.data?.error;
        addToast("error", msg ?? "Delete failed.");
      }
    };

    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Media Asset Library</h2>
            <select
              required
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {setOptions.length === 0 ? (
                <option value="">No sets available</option>
              ) : (
                setOptions.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))
              )}
            </select>
          </div>
          <p className="mt-1 text-sm text-slate-600">Upload base64 assets and reference IDs in rich content blocks.</p>
        </div>
      </section>
    </div>
  );
}
<div className="mt-4·grid·gap-3·md:grid-cols-2">
  <input value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="Filename"
  className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"/>
  <input value={mimeType} onChange={(e) => setMimeType(e.target.value)} placeholder="MIME·type"
  className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"/>
  <select value={kind}
  onChange={(e) => setKind(e.target.value as "image" || "audio" || "video" || "other")}
  className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm">
    <option value="image">image</option>
    <option value="audio">audio</option>
    <option value="video">video</option>
    <option value="other">other</option>
  </select>
  <input value={altText} onChange={(e) => setAltText(e.target.value)}
  placeholder="Alt·text (optional)"
  className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm"/>
  <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional)"
  className="rounded-md·border·border-slate-300·px-2·py-1.5·text-sm·md:col-span-2"/>
</div>

<textarea
value={base64Data}
onChange={(e) => setBase64Data(e.target.value.trim())}
rows={6}
className="mt-3·w-full·rounded-md·border·border-slate-300·px-3·py-2·font-mono·text-xs"
placeholder="Paste·base64·payload (without·data:·prefix)"
/>

<button
type="button"
onClick={upload}
disabled={uploading}
className="mt-3·rounded-md·bg-primary-600·px-3·py-1.5·text-sm·font-semibold·text-white·hover:bg-primary-700·disabled:opacity-50"
>
{uploading·?·"Uploading..."::"Upload·Asset"}
</button>
</section>

<section className="overflow-x-auto·rounded-xl·border·border-slate-200·bg-white·shadow-sm">
<table className="min-w-full·divide-y·divide-slate-200·text-sm">
  <thead>
    <tr>
      <th className="px-3·py-2">ID</th>
      <th className="px-3·py-2">File</th>
      <th className="px-3·py-2">Kind</th>
      <th className="px-3·py-2">Size</th>
      <th className="px-3·py-2">text-right">Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="px-3·py-4·text-slate-500">colSpan={5}>Loading·assets...</td>
    </tr>
  )
  {!loading&&items.length===0&&(
    <tr>
      <td className="px-3·py-4·text-slate-500">colSpan={5}>No·assets·found.</td>
    </tr>
  )}
  {!loading&&items.map((asset)=>(
    <tr key={asset._id}>
      <td className="px-3·py-2·font-mono·text-xs">{asset._id}</td>
      <td className="px-3·py-2">{asset.filename}</td>
      <div className="text-xs·text-slate-500">{asset.mimeType}</div>
    </td>
    <td className="px-3·py-2">{asset.kind}</td>
    <td className="px-3·py-2">{Math.round((asset.size / 1024) * 10) / 10}</td>
    <td className="px-3·py-2">text-right">
      <button type="button" onClick={()=>remove(asset._id)}
      className="rounded-md·border·border-primary-300·px-2·py-1·text-xs·text-primary-700·hover:bg-primary-50">Delete</button>
    </td>
  </tr>
  </tbody>
</table>
</section>
</div>
);
}