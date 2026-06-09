import type { Metadata } from "next";
import Link from "next/link";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Общи условия",
  description: "Общи условия за поръчки от онлайн магазина VeMiDi crafts.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const { business } = siteConfig;
  return (
    <InformationPage eyebrow="Информация за клиента" title="Общи условия" description="Основни правила при поръчка на готови и персонализирани изделия.">
      <p className="text-xs uppercase tracking-wider">Последна актуализация: 28 май 2026 г.</p>
      <InformationSection title="Данни за търговеца">
        <p><strong>Търговец:</strong> {business.legalName}</p>
        <p><strong>ЕИК/Булстат:</strong> {business.registrationNumber}</p>
        <p><strong>Адрес:</strong> {business.address}</p>
        <p><strong>Имейл:</strong> <a href={`mailto:${business.email}`}>{business.email}</a></p>
        <p><strong>Телефон:</strong> <a href={`tel:${business.phoneHref}`}>{business.phoneDisplay}</a></p>
      </InformationSection>
      <InformationSection title="Поръчка и потвърждение">
        <p>Изпращането на формата регистрира поръчка. При необходимост ще се свържем с клиента за уточняване на персонализацията, наличността, срока или данните за доставка.</p>
      </InformationSection>
      <InformationSection title="Цени и плащане">
        <p>Цените са обявени в евро (EUR). Курирската доставка не е включена, освен ако изрично не е посочено друго. Плащането е с наложен платеж при получаване.</p>
      </InformationSection>
      <InformationSection title="Персонализирани изделия">
        <p>Клиентът носи отговорност за точността на предоставените имена, дати и текстове. Преди изработка може да бъде поискано допълнително потвърждение.</p>
      </InformationSection>
      <InformationSection title="Доставка">
        <p>Поръчките се изпращат с Еконт или Спиди до офис, автомат или адрес според избора на клиента. Подробностите са публикувани в <Link className="font-semibold text-boutique-ink underline" href="/delivery">„Доставка и плащане“</Link>.</p>
      </InformationSection>
      <InformationSection title="Отказ, връщане и рекламации">
        <p>Правилата и процедурата са описани в страницата <Link className="font-semibold text-boutique-ink underline" href="/returns">„Връщане и рекламации“</Link>.</p>
      </InformationSection>
    </InformationPage>
  );
}
