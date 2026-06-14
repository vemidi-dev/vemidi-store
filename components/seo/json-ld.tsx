import { serializeJsonLd } from "@/lib/seo/json-ld";

type JsonLdProps = {
  data: unknown | unknown[];
};

export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];

  return (
    <>
      {payload.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(entry),
          }}
        />
      ))}
    </>
  );
}
