"use client";

import { Toaster as HotToaster } from "react-hot-toast";

/** App-wide toast host (mounted once in the root layout), styled with theme tokens. */
export function Toaster() {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        className: "!rounded-xl !border !border-border/60 !bg-card !text-foreground !text-sm !shadow-xl",
      }}
    />
  );
}
