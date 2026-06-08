import Image from "next/image";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";

const heroMain =
  "https://images.unsplash.com/photo-1617038260897-41a1f14a93ca?auto=format&fit=crop&w=1400&q=85";
const heroInset =
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=85";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-boutique-line bg-gradient-to-b from-boutique-paper via-boutique-bg to-boutique-warm/60">
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-[min(520px,70vw)] w-[min(520px,70vw)] -translate-y-1/2 rounded-full bg-boutique-sage/[0.12] blur-2xl md:right-0"
        aria-hidden
      />
      <PageContainer className="relative grid items-center gap-12 py-16 md:gap-16 md:py-20 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-20 lg:py-28">
        <div className="relative order-1 mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
          <div
            className="pointer-events-none absolute -left-[12%] top-[18%] -z-10 hidden h-[min(340px,55vw)] w-[min(340px,55vw)] rounded-full bg-boutique-sage/20 md:block"
            aria-hidden
          />
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] shadow-boutique ring-1 ring-boutique-ink/[0.06] md:aspect-[4/5]">
            <Image
              src={heroMain}
              alt="Дървени изделия и топла ателиерна светлина"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-boutique-ink/[0.08] via-transparent to-transparent" />
          </div>

          <div className="absolute -bottom-5 -right-2 z-10 hidden w-[38%] max-w-[200px] sm:block md:-bottom-6 md:-right-4 md:max-w-[220px]">
            <div className="relative aspect-square overflow-hidden rounded-2xl border-[5px] border-boutique-paper shadow-boutique-sm ring-1 ring-boutique-ink/5">
              <Image
                src={heroInset}
                alt="Детайл от ръчно изработено изделие"
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <div className="order-2 flex flex-col justify-center space-y-8 lg:py-6">
          <div className="space-y-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-boutique-sage-deep/90">
              Ръчна изработка · По поръчка
            </p>
            <h1 className="font-heading text-[2.35rem] leading-[1.08] tracking-tight text-boutique-ink sm:text-5xl lg:text-[3.35rem] lg:leading-[1.06]">
              Подаръци, които остават в спомена
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-boutique-muted lg:text-xl">
              Персонализирани дървени изделия, пана от скандинавски мъх и внимание към всеки детайл
              — като в малко ателие, не в серия.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/shop"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-boutique-ochre px-9 py-3.5 text-sm font-semibold tracking-wide text-boutique-ink shadow-sm transition hover:brightness-[0.97] active:scale-[0.99]"
            >
              Към колекцията
            </Link>
            <Link
              href="/categories"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-boutique-sage/35 bg-boutique-paper/80 px-8 py-3.5 text-sm font-semibold tracking-wide text-boutique-ink backdrop-blur-sm transition hover:border-boutique-sage/55 hover:bg-boutique-paper"
            >
              Категории
            </Link>
          </div>

          <p className="max-w-sm text-xs font-medium uppercase tracking-[0.2em] text-boutique-muted/80">
            Безплатна консултация за надписи и поводи
          </p>
        </div>
      </PageContainer>
    </section>
  );
}
