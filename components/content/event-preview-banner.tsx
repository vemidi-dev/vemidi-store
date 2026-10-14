type EventPreviewBannerProps = {
  isPublished: boolean;
};

export function EventPreviewBanner({ isPublished }: EventPreviewBannerProps) {
  const headline = isPublished
    ? "Преглед — публикувано събитие"
    : "Преглед — събитието не е публично";
  const detail = isPublished
    ? "Това е администраторски преглед. Публичната страница е достъпна в сайта."
    : "Публичният URL връща 404, докато събитието не бъде публикувано.";

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{headline}</p>
          <p className="mt-0.5 text-amber-900">{detail}</p>
        </div>
        <a
          href="/admin?tab=events"
          className="inline-flex w-fit shrink-0 rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-950 transition hover:border-amber-400"
        >
          Обратно към админ
        </a>
      </div>
    </div>
  );
}
