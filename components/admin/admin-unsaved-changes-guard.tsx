"use client";

import { useEffect } from "react";

type AdminUnsavedChangesGuardProps = {
  formId: string;
};

const WARNING_MESSAGE =
  "Имате незапазени промени. Сигурни ли сте, че искате да напуснете без запис?";

export function AdminUnsavedChangesGuard({
  formId,
}: AdminUnsavedChangesGuardProps) {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    let dirty = false;
    let submitted = false;
    const parentDetails = form.closest("details");

    const markDirty = () => {
      if (!submitted) {
        dirty = true;
      }
    };
    const handleSubmit = () => {
      submitted = true;
      dirty = false;
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || submitted) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    const handleDocumentClick = (event: MouseEvent) => {
      if (!dirty || submitted || event.defaultPrevented) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const link = target.closest("a[href]");
      if (!link || form.contains(link)) {
        return;
      }
      if (!window.confirm(WARNING_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        dirty = false;
      }
    };
    const handleDetailsToggle = () => {
      if (
        dirty &&
        !submitted &&
        parentDetails instanceof HTMLDetailsElement &&
        !parentDetails.open
      ) {
        if (!window.confirm(WARNING_MESSAGE)) {
          parentDetails.open = true;
        } else {
          dirty = false;
        }
      }
    };

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", handleSubmit);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    parentDetails?.addEventListener("toggle", handleDetailsToggle);

    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", handleSubmit);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      parentDetails?.removeEventListener("toggle", handleDetailsToggle);
    };
  }, [formId]);

  return null;
}
