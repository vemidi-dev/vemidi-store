import Image from "next/image";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export function ContentImage({
  src,
  alt,
  label,
  dark = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  src: string | null;
  alt: string;
  label: string;
  dark?: boolean;
  sizes?: string;
}) {
  return src ? (
    <div className="relative h-full w-full">
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  ) : (
    <MediaPlaceholder label={label} dark={dark} />
  );
}
