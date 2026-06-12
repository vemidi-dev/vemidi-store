import type { ImageProfileId } from "@/lib/images/profiles";
import { getImageProfile } from "@/lib/images/profiles";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i;

export function isValidImageUuid(value: string) {
  return UUID_PATTERN.test(value.trim());
}

function assertSafeSegment(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("/")) {
    throw new Error(`Невалиден ${label} за съхранение на изображение.`);
  }
  return trimmed;
}

export function buildImageStoragePath(
  profileId: ImageProfileId,
  scopeId: string,
  imageId: string,
) {
  const profile = getImageProfile(profileId);
  const safeImageId = assertSafeSegment(imageId, "идентификатор");

  if (!isValidImageUuid(safeImageId)) {
    throw new Error("Невалиден идентификатор на изображение.");
  }

  if (profileId === "hero") {
    return `${profile.storageDirectory}/${safeImageId}.webp`;
  }

  const safeScopeId = assertSafeSegment(scopeId, "обхват");
  if (!isValidImageUuid(safeScopeId) && profileId !== "event_gallery") {
    throw new Error("Невалиден идентификатор на обхват.");
  }

  if (profileId === "event_gallery" && !isValidImageUuid(safeScopeId) && safeScopeId !== "gallery") {
    if (!SLUG_PATTERN.test(safeScopeId)) {
      throw new Error("Невалиден идентификатор на събитие.");
    }
  }

  return `${profile.storageDirectory}/${safeScopeId}/${safeImageId}.webp`;
}

export function getImageStoragePrefix(profileId: ImageProfileId, scopeId: string) {
  const profile = getImageProfile(profileId);

  if (profileId === "hero") {
    return profile.storageDirectory;
  }

  const safeScopeId = assertSafeSegment(scopeId, "обхват");
  return `${profile.storageDirectory}/${safeScopeId}`;
}

export function isPathWithinImageScope(
  path: string,
  profileId: ImageProfileId,
  scopeId: string,
) {
  const prefix = `${getImageStoragePrefix(profileId, scopeId)}/`;
  return path.startsWith(prefix);
}
