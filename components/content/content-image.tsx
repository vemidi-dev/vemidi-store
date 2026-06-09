import Image from "next/image";

import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export function ContentImage({
  src,
  alt,
  label,
  dark = false,
}: {
  src: string | null;
  alt: string;
  label: string;
  dark?: boolean;
}) {
  return src ? (
    <div className="relative h-full w-full">
      <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
    </div>
  ) : (
    <MediaPlaceholder label={label} dark={dark} />
  );
}
