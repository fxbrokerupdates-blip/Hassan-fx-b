"use client";
import { useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { updateAvatarAction } from "@/app/dashboard/actions";

const MAX = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

export function AvatarUpload({ userId, current, name }: { userId: string; current: string | null; name: string }) {
  const [url, setUrl] = useState(current);
  const [msg, setMsg] = useState<string | null>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!TYPES.includes(file.type)) { setMsg("Use a PNG, JPG or WebP image."); return; }
    if (file.size > MAX) { setMsg("Image must be 2 MB or smaller."); return; }
    const supabase = createSupabaseBrowser();
    if (!supabase) return;
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
    if (error) { setMsg("Upload failed."); return; }
    const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const r = await updateAvatarAction(publicUrl);
    if (r.error) setMsg(r.error); else { setUrl(publicUrl); setMsg("Profile image updated."); }
  }
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-20 place-items-center overflow-hidden rounded-full bg-gold-500 text-3xl font-bold text-navy-950">
        {url ? <Image src={url} alt="" width={80} height={80} className="size-full object-cover" unoptimized /> : name.slice(0, 1).toUpperCase()}
      </span>
      <label className="btn-outline h-10 cursor-pointer px-4">
        <Upload className="size-4" />Change photo
        <input type="file" accept={TYPES.join(",")} onChange={onFile} className="sr-only" />
      </label>
      {msg && <span role="status" className="text-sm text-white/80">{msg}</span>}
    </div>
  );
}
