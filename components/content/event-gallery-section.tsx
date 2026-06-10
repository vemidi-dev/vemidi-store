import { EventGalleryGrid } from "@/components/content/event-gallery-grid";
import { PageContainer } from "@/components/layout/page-container";
import {
  countPublishedEventGalleryImages,
  getPublishedEventGalleryImages,
  EVENT_GALLERY_PAGE_SIZE,
} from "@/lib/content/event-gallery";

export async function EventGallerySection() {
  const [images, totalCount] = await Promise.all([
    getPublishedEventGalleryImages(EVENT_GALLERY_PAGE_SIZE, 0),
    countPublishedEventGalleryImages(),
  ]);

  if (totalCount === 0) {
    return null;
  }

  return (
    <section className="border-y border-boutique-line bg-boutique-paper py-14 md:py-18">
      <PageContainer>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-rose-deep">
            Моменти от ателието
          </p>
          <h2 className="mt-3 font-heading text-4xl text-boutique-ink">
            Галерия от минали събития
          </h2>
          <div className="mx-auto mt-4 flex max-w-40 items-center gap-3 text-boutique-rose-deep">
            <span className="h-px flex-1 bg-boutique-rose/45" />
            <span className="font-heading text-xl">♡</span>
            <span className="h-px flex-1 bg-boutique-rose/45" />
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-boutique-muted">
            Усмивки, цветове и малки творби от нашите творчески работилници.
          </p>
        </div>

        <div className="mt-10">
          <EventGalleryGrid initialImages={images} totalCount={totalCount} />
        </div>
      </PageContainer>
    </section>
  );
}
