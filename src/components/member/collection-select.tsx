"use client";
import { useTransition } from "react";
import { setCollectionAction } from "@/app/dashboard/actions";

export function CollectionSelect({ savedId, value, collections }: { savedId: string; value: string; collections: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <select defaultValue={value} disabled={pending || collections.length === 0} aria-label="Move to collection" className="input h-8 w-40 py-0 text-xs"
      onChange={(e) => { const v = e.target.value; start(async () => { await setCollectionAction(savedId, v || null); }); }}>
      <option value="">{collections.length ? "No collection" : "Create a collection"}</option>
      {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}
