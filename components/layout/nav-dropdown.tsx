"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { HeaderNavDropdownItem } from "@/lib/category-navigation";

const triggerClass =
  "inline-flex items-center gap-1 rounded-sm text-sm font-medium text-boutique-muted transition-colors duration-200 hover:text-boutique-rose-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage focus-visible:ring-offset-2";

const dropdownLinkClass =
  "block rounded-md px-3 py-2 text-sm text-boutique-ink transition-colors hover:bg-boutique-paper hover:text-boutique-rose-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage";

type NavDropdownProps = {
  label: string;
  indexHref: string;
  indexLabel: string;
  items: HeaderNavDropdownItem[];
  interactionMode: "hover" | "click";
  onNavigate?: () => void;
};

export function NavDropdown({
  label,
  indexHref,
  indexLabel,
  items,
  interactionMode,
  onNavigate,
}: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const [suppressHover, setSuppressHover] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLLIElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    if (interactionMode !== "hover") {
      return;
    }

    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  function handleNavigate() {
    setOpen(false);
    setSuppressHover(true);
    onNavigate?.();
  }

  return (
    <li
      ref={rootRef}
      className="group relative"
      onMouseEnter={() => {
        if (interactionMode === "hover" && !suppressHover) {
          clearCloseTimer();
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        setSuppressHover(false);
        scheduleClose();
      }}
      onFocusCapture={() => {
        if (interactionMode === "hover") {
          setOpen(true);
        }
      }}
      onBlurCapture={(event) => {
        if (
          interactionMode === "hover" &&
          !rootRef.current?.contains(event.relatedTarget as Node)
        ) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span>{label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        id={panelId}
        role="menu"
        className={`absolute left-0 top-full z-50 min-w-[14rem] max-w-[18rem] pt-2 transition duration-150 ${
          open
            ? "visible translate-y-0 opacity-100"
            : suppressHover
              ? "invisible translate-y-1 opacity-0 pointer-events-none"
              : "invisible translate-y-1 opacity-0 pointer-events-none group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
        }`}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="rounded-xl border border-boutique-line/80 bg-white py-2 shadow-boutique">
          <div className="max-h-[min(24rem,70vh)] overflow-y-auto px-2">
              <Link
                href={indexHref}
                role="menuitem"
                className={`${dropdownLinkClass} font-semibold text-boutique-sage-deep`}
                onClick={handleNavigate}
              >
                {indexLabel}
              </Link>
              {items.length > 0 ? (
                <ul className="mt-1 border-t border-boutique-line/60 pt-1">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        role="menuitem"
                        className={`${dropdownLinkClass} ${item.isChild ? "pl-6 text-boutique-muted" : ""}`}
                        onClick={handleNavigate}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
        </div>
      </div>
    </li>
  );
}
