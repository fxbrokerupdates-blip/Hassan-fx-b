import { ContactForm } from "@/components/forms/contact-form";

export const metadata = { title: "Help & Support" };

const FAQ = [
  ["How do I copy a daily banner prompt?", "Open Daily Banner Prompts and press “Copy Prompt”. Paste it into your preferred image generator."],
  ["Is there a limit on AI generations?", "Yes — a daily per-member limit set by the administrators. The remaining count is shown under the Generate button."],
  ["Does FX Broker Updates provide trading signals or courses?", "No. We publish news and content tools only. Dott Plus is a separate external app."],
  ["How do I stop notifications?", "Go to Settings → Notification preferences, or turn off notifications for a specific broker under Favourite Brokers."],
  ["Can I delete my account?", "Yes. Settings → Your data → Request account deletion. You can also download your data there."],
];

export default function SupportPage() {
  return (
    <div className="max-w-4xl space-y-6 fx-member-support">
      <h2 className="font-display text-2xl font-bold">Help & <span className="gold-text">Support</span></h2>
      <section className="card-plain divide-y divide-white/5">
        {FAQ.map(([q, a]) => (
          <details key={q} className="p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-white/75">{a}</p></details>
        ))}
      </section>
      <ContactForm />
    </div>
  );
}
