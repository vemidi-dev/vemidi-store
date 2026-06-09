import type { Metadata } from "next";

import { InformationPage, InformationSection } from "@/components/legal/information-page";

export const metadata: Metadata = {
  title: "Доставка и плащане",
  description: "Куриери, срокове за изработка, доставка и плащане на поръчки от VeMiDi crafts.",
  alternates: { canonical: "/delivery" },
};

export default function DeliveryPage() {
  return (
    <InformationPage eyebrow="Полезна информация" title="Доставка и плащане" description="Как подготвяме, потвърждаваме и изпращаме вашата поръчка.">
      <p className="text-xs uppercase tracking-wider">Последна актуализация: 28 май 2026 г.</p>
      <InformationSection title="Куриер и начин на доставка">
        <p>Доставката се извършва чрез Еконт или Спиди според избора на клиента при завършване на поръчката.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>до офис на куриер;</li>
          <li>до автомат на куриер, когато услугата е налична;</li>
          <li>до посочен адрес.</li>
        </ul>
      </InformationSection>
      <InformationSection title="Срокове">
        <p>Обичайният срок за изработка е от 1 до 5 работни дни, освен ако в страницата на продукта не е посочено друго. Срокът за доставка зависи от графика и условията на избрания куриер.</p>
        <p>При натоварени периоди, официални празници или изделия със сложна персонализация срокът се уточнява допълнително.</p>
      </InformationSection>
      <InformationSection title="Цена на доставката">
        <p>Цената се определя по тарифата на избрания куриер и не е включена в цената на продуктите, освен ако изрично не е посочено друго.</p>
      </InformationSection>
      <InformationSection title="Плащане">
        <p>Плащането е само с наложен платеж при получаване на пратката. Магазинът не събира и не обработва данни за банкови карти.</p>
      </InformationSection>
      <InformationSection title="Данни за доставка">
        <p>Клиентът носи отговорност за правилно въведените име, телефон, населено място, адрес или офис. Неточни данни могат да доведат до забавяне или невъзможност за доставка.</p>
      </InformationSection>
    </InformationPage>
  );
}
