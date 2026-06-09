import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";

export const metadata: Metadata = { title: "Контакти", description: "Свържете се с VeMiDi crafts.", alternates: { canonical: "/contact" } };
export default function ContactPage() {
  return <div><PageHero eyebrow="Свържете се с нас" title="Контакти" description="За персонална поръчка, събитие или въпрос относно продукт." /><section className="pb-24 pt-10"><PageContainer><div className="mx-auto max-w-3xl rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm"><h2 className="font-heading text-2xl text-boutique-ink">Данни за контакт</h2><p className="mt-4 leading-7 text-boutique-muted">Тук трябва да добавим официалния имейл, телефон, социални профили и адрес за кореспонденция преди окончателното публикуване на основния домейн.</p><p className="mt-6 rounded-xl bg-boutique-bg p-4 text-sm text-boutique-muted">За момента използвайте обичайния канал, по който комуникирате с VeMiDi crafts.</p></div></PageContainer></section></div>;
}
