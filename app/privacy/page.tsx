import type { Metadata } from "next";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description: "Как VeMiDi crafts събира, използва и съхранява лични данни.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const { business } = siteConfig;
  return (
    <InformationPage eyebrow="Лични данни" title="Политика за поверителност" description="Използваме само информацията, необходима за поръчки, записвания и комуникация.">
      <p className="text-xs uppercase tracking-wider">Последна актуализация: 28 май 2026 г.</p>
      <InformationSection title="Администратор на данните">
        <p><strong>{business.legalName}</strong>, {business.address}</p>
        <p>Контакт: <a href={`mailto:${business.email}`}>{business.email}</a>, <a href={`tel:${business.phoneHref}`}>{business.phoneDisplay}</a></p>
      </InformationSection>
      <InformationSection title="Какви данни получаваме">
        <ul className="list-disc space-y-1 pl-5">
          <li>име, телефон и предоставен имейл;</li>
          <li>населено място, адрес или офис и избран куриер;</li>
          <li>данни и бележки за поръчка или персонализация;</li>
          <li>данни, изпратени при записване за събитие или абонамент.</li>
        </ul>
      </InformationSection>
      <InformationSection title="За какво ги използваме">
        <p>За обработване, изработка, потвърждение и доставка на поръчки, управление на записвания, отговор на запитвания и изпълнение на законови задължения.</p>
      </InformationSection>
      <InformationSection title="Съхранение и достъп">
        <p>Данните за магазина се съхраняват в инфраструктурата на Supabase и са достъпни само за нуждите на магазина. На куриер се предоставят единствено данните, необходими за доставката.</p>
      </InformationSection>
      <InformationSection title="Срок за съхранение">
        <p>Информацията се пази за срок, необходим за изпълнение на поръчката, рекламации, счетоводни и други законови задължения.</p>
      </InformationSection>
      <InformationSection title="Вашите права">
        <p>Можете да поискате достъп, корекция, ограничаване, изтриване или преносимост на данните и да възразите срещу обработването им в предвидените от закона случаи.</p>
        <p>Изпратете искането си на <a href={`mailto:${business.email}`}>{business.email}</a>.</p>
      </InformationSection>
    </InformationPage>
  );
}
