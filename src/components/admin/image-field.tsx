"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX = 5 * 1024 * 1024;

/** URL input with an upload button to the public "media" bucket (staff only; validated type and size). */
export function ImageField({ name, defaultValue, id }: { name: string; defaultValue: string; id: string }) {
  const [value, setValue] = useState(defaultValue);
  const [msg, setMsg] = useState<string | null>(null);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TYPES.includes(file.type)) { setMsg("PNG, JPG, WebP or GIF only"); return; }
    if (file.size > MAX) { setMsg("Max 5 MB"); return; }
    const supabase = createSupabaseBrowser();
    if (!supabase) return;
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60);
    const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${safe}`;
    setMsg("Uploading…");
    const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) { setMsg(`Upload failed: ${error.message}`); return; }
    const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("media_library").insert({ bucket: "media", path, url, mime_type: file.type, size_bytes: file.size, uploaded_by: u.user?.id });
    setValue(url); setMsg("Uploaded");
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input id={id} name={name} value={value} onChange={(e) => setValue(e.target.value)} className="input" placeholder="https://… or /images/…" />
        <label className="btn-outline h-[42px] shrink-0 cursor-pointer px-3"><Upload className="size-4" /><span className="sr-only">Upload</span>
          <input type="file" accept={TYPES.join(",")} onChange={upload} className="sr-only" /></label>
      </div>
      {value && /^(https?:\/\/|\/)/.test(value) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="max-h-32 rounded border border-white/10 object-contain" />
      )}
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
