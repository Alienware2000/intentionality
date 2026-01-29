/**
 * ModalPortal - Renders children at document body level using React Portal
 *
 * This ensures modal backdrops cover the entire viewport regardless of
 * where the modal component is nested in the DOM tree. Fixes issues with
 * fixed positioning in deeply nested scroll containers.
 */
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: React.ReactNode;
};

export default function ModalPortal({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
