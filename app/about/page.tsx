import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { PageHero } from "@/components/ui/page-hero";

export const metadata: Metadata = { title: "За нас", description: "Историята и творческият подход на VeMiDi crafts.", alternates: { canonical: "/about" } };
export default function AboutPage() {
  return <div><PageHero eyebrow="VeMiDi crafts" title="За нас" description="Малко ателие за лични подаръци, творчески идеи и спомени." /><section className="py-14 md:py-20"><PageContainer className="grid items-center gap-10 lg:grid-cols-2"><div className="aspect-[4/3] overflow-hidden rounded-3xl"><MediaPlaceholder label="Снимка от ателието" /></div><div><h2 className="font-heading text-3xl text-boutique-ink">Ръчна работа с лично отношение</h2><p className="mt-5 leading-8 text-boutique-muted">VeMiDi crafts създава персонализирани изделия и творчески преживявания с внимание към човека, повода и малките детайли.</p><p className="mt-4 leading-8 text-boutique-muted">Тук ще добавим пълната история на бранда, представяне на твореца и снимки от процеса.</p></div></PageContainer></section></div>;
}
