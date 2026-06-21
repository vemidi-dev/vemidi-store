import { IMAGE_ACCEPTED_MIME_TYPES } from "@/lib/images/constants";
import { getImageProfile, type ImageProfileId } from "@/lib/images/profiles";

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }

  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

export function validateImageUploadMimeType(file: File) {
  if (!(file instanceof File)) {
    return "Невалиден файл за качване.";
  }

  if (
    !file.type ||
    !IMAGE_ACCEPTED_MIME_TYPES.includes(
      file.type as (typeof IMAGE_ACCEPTED_MIME_TYPES)[number],
    )
  ) {
    return `Файлът „${file.name}“ не е позволен формат. Използвайте JPEG, PNG или WebP.`;
  }

  return null;
}

export async function validateImageUploadFileContent(
  file: File,
  profileId: ImageProfileId,
) {
  const mimeError = validateImageUploadMimeType(file);
  if (mimeError) {
    return mimeError;
  }

  const profile = getImageProfile(profileId);
  if (file.size <= 0) {
    return `Файлът „${file.name}“ е празен или повреден.`;
  }

  if (file.size > profile.maxFileSize) {
    return `Файлът „${file.name}“ надвишава максималния размер от ${formatMegabytes(profile.maxFileSize)}.`;
  }

  if (!(await hasValidImageSignature(file))) {
    return `Файлът „${file.name}“ не съдържа валидно JPEG, PNG или WebP изображение.`;
  }

  return null;
}

export async function validateImageUploadFiles(
  profileId: ImageProfileId,
  files: File[],
  existingImageCount = 0,
) {
  const profile = getImageProfile(profileId);

  if (files.length > profile.maxFilesPerUpload) {
    return `Можете да качите най-много ${profile.maxFilesPerUpload} изображения наведнъж.`;
  }

  if (profile.maxImages !== undefined && existingImageCount + files.length > profile.maxImages) {
    return `Достигнат е лимитът от ${profile.maxImages} изображения.`;
  }

  for (const file of files) {
    const fileError = await validateImageUploadFileContent(file, profileId);
    if (fileError) {
      return fileError;
    }
  }

  return null;
}
