import { SupportNav } from "@/components/layout/research-widgets";
import { PageHeader } from "@/components/news/page-header";
import { RichText } from "@/components/ui/rich-text";

export function LegalPage({ title, gold, path, text, children }: { title: string; gold?: string; path: string; text: string; children?: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} gold={gold} crumbs={[{ name: "Home", path: "/" }, { name: `${title}${gold ? ` ${gold}` : ""}`, path }]} />
      <div className="container-site py-10 fx-support-layout"><SupportNav active={path}/>
        <div className="max-w-3xl fx-legal-document"><RichText text={text} className="prose-fx" />{children}</div>
      </div>
    </>
  );
}
