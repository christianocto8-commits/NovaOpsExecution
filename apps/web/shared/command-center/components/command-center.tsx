"use client";

import { useEffect } from "react";

import { useCommandCenter } from "../hooks/use-command-center";
import { CommandDialog } from "./command-dialog";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function CommandCenter() {
  const { toggleCommandCenter } = useCommandCenter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommandK =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (!isCommandK) return;

      if (isTypingTarget(event.target)) {
        event.preventDefault();
      }

      event.preventDefault();
      toggleCommandCenter();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleCommandCenter]);

  return <CommandDialog />;
}