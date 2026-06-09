import type { Metadata } from "next";

import {
  InformationPage,
  InformationSection,
} from "@/components/legal/information-page";

export const metadata: Metadata = {
  title: "Доставка и плащане",
  description: "Информация за изработката, доставката и плащането на поръчки от VeMiDi crafts.",
  alternates: { canonical: "/delivery" },
};

export default function DeliveryPage() {
  return (
    <InformationPage
      eyebrow="Полезна информация"
      title="Доставка и плащане"
      description="Как подготвяме, потвърждаваме и изпращаме вашата поръчка."
    >
      <InformationSection title="Потвърждение">
        <p>
          След изпращане на поръчката ще се свържем с вас за потвърждение на
          продуктите, персонализацията и ориентировъчния срок за изработка.
        </p>
      </InformationSection>

      <InformationSection title="Срок за изработка">
        <p>
          Срокът зависи от вида и сложността на изделието. Посочената в продуктовата
          страница информация е ориентировъчна и се потвърждава преди започване на
          изработката.
        </p>
      </InformationSection>

      <InformationSection title="Доставка">
        <p>
          Поръчките се изпращат с избрания при поръчката куриер до офис или адрес.
          Цената за доставка се определя от тарифата на куриера и се заплаща отделно.
        </p>
      </InformationSection>

      <InformationSection title="Плащане">
        <p>
          За момента приемаме плащане само с наложен платеж при получаване. В
          магазина не се събират и обработват данни за банкови карти.
        </p>
      </InformationSection>
    </InformationPage>
  );
}
