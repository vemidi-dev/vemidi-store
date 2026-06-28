import {
  productEditAnchorId,
  productEditDetailsId,
  resolveProductEditScrollTargetId,
} from "@/lib/admin/product-edit-navigation";

export type ProductEditScrollRestoreAttempt = {
  restored: boolean;
  scrollTargetId: string;
  foundTarget: boolean;
  foundDetails: boolean;
  unhidProduct: boolean;
};

export function attemptProductEditScrollRestore(
  productId: string,
  hash = "",
): ProductEditScrollRestoreAttempt {
  const scrollTargetId = resolveProductEditScrollTargetId(productId, hash);
  const details = document.getElementById(productEditDetailsId(productId));
  const article = document.getElementById(productEditAnchorId(productId));

  let unhidProduct = false;
  if (article instanceof HTMLElement && article.hidden) {
    article.hidden = false;
    unhidProduct = true;
  }

  if (details instanceof HTMLDetailsElement && !details.open) {
    details.open = true;
  }

  const scrollTarget = document.getElementById(scrollTargetId);
  if (!(scrollTarget instanceof HTMLElement)) {
    return {
      restored: false,
      scrollTargetId,
      foundTarget: false,
      foundDetails: details instanceof HTMLDetailsElement,
      unhidProduct,
    };
  }

  scrollTarget.scrollIntoView({ block: "start", behavior: "auto" });

  return {
    restored: true,
    scrollTargetId,
    foundTarget: true,
    foundDetails: details instanceof HTMLDetailsElement,
    unhidProduct,
  };
}

export function scheduleProductEditScrollRestore(
  productId: string,
  hash = "",
  options?: { maxWaitMs?: number },
): () => void {
  const maxWaitMs = options?.maxWaitMs ?? 800;
  const startedAt = performance.now();
  let frameId = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const previousScrollRestoration =
    typeof history !== "undefined" ? history.scrollRestoration : undefined;
  if (typeof history !== "undefined") {
    history.scrollRestoration = "manual";
  }

  const tick = () => {
    if (cancelled) {
      return;
    }

    const result = attemptProductEditScrollRestore(productId, hash);
    if (result.restored) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (typeof history !== "undefined" && previousScrollRestoration) {
        history.scrollRestoration = previousScrollRestoration;
      }
      return;
    }

    if (performance.now() - startedAt >= maxWaitMs) {
      if (typeof history !== "undefined" && previousScrollRestoration) {
        history.scrollRestoration = previousScrollRestoration;
      }
      return;
    }

    frameId = window.requestAnimationFrame(tick);
  };

  frameId = window.requestAnimationFrame(tick);
  timeoutId = setTimeout(() => {
    if (!cancelled) {
      attemptProductEditScrollRestore(productId, hash);
      if (typeof history !== "undefined" && previousScrollRestoration) {
        history.scrollRestoration = previousScrollRestoration;
      }
    }
  }, maxWaitMs);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(frameId);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (typeof history !== "undefined" && previousScrollRestoration) {
      history.scrollRestoration = previousScrollRestoration;
    }
  };
}
