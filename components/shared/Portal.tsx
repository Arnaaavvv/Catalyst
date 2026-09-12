"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renders children into document.body instead of wherever the component
// happens to sit in the tree. Every modal in this app needs this: a modal
// triggered from NavRail (sticky, flex, nested several levels deep) has no
// business inheriting stacking/positioning quirks from its trigger's
// ancestors. `fixed inset-0` should mean "the whole viewport" regardless of
// where the component that renders it lives structurally — portaling to
// body is what actually guarantees that instead of hoping no ancestor ever
// interferes.
//
// The mounted-guard avoids an SSR mismatch: document.body doesn't exist on
// the server, so we only portal after the component has mounted client-side.
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}