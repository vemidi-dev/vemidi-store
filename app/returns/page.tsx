import type { Metadata } from "next";

import { InformationPage, InformationSection } from "@/components/legal/information-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Връщане и рекламации",
  description: "Условия за отказ, връщане и рекламации на продукти от VeMiDi crafts.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  const { business } = siteConfig;
  return (
    <InformationPage eyebrow="Помощ при проблем" title="Връщане и рекламации" description="Как да заявите отказ или да ни уведомите за дефект и несъответствие.">
      <p className="text-xs uppercase tracking-wider">Последна актуализация: 28 май 2026 г.</p>
      <InformationSection title="Право на отказ">
        <p>За неперсонализирани продукти клиентът има право на отказ в 14-дневен срок от получаването, при спазване на законовите условия и връщане на стоката в добър търговски вид.</p>
      </InformationSection>
      <InformationSection title="Персонализирани продукти">
        <p>Изделия, изработени по поръчка или с персонализирано име, дата, текст или друга индивидуална характеристика, могат да не подлежат на отказ и връщане, освен при дефект, несъответствие или грешка от страна на търговеца.</p>
      </InformationSection>
      <InformationSection title="Процедура за рекламация">
        <ul className="list-disc space-y-1 pl-5">
          <li>свържете се с нас по имейл или телефон и опишете проблема;</li>
          <li>посочете дата и данни за поръчката;</li>
          <li>приложете снимки при видим дефект или транспортна повреда;</li>
          <li>изчакайте инструкции, преди да изпратите продукта обратно.</li>
        </ul>
      </InformationSection>
      <InformationSection title="Разходи по връщането">
        <p>При отказ без дефект разходите за връщане са за сметка на клиента, освен ако не е уговорено друго. При основателна рекламация условията се уточняват според конкретния случай.</p>
      </InformationSection>
      <InformationSection title="Контакт">
        <p>Имейл: <a href={`mailto:${business.email}`}>{business.email}</a></p>
        <p>Телефон: <a href={`tel:${business.phoneHref}`}>{business.phoneDisplay}</a></p>
        <p>Адрес: {business.address}</p>
      </InformationSection>
    </InformationPage>
  );
}
