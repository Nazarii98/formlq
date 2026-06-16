"use client";

import { createContext, useContext, useState } from "react";

interface OpenOpts {
  /** Custom PDF url to show (e.g. homework конспект). Omit for the default довідка. */
  url?: string;
  /** Header title. */
  title?: string;
}

interface ReferenceDrawerCtx {
  open: boolean;
  url?: string;
  title?: string;
  openDrawer: (opts?: OpenOpts) => void;
  closeDrawer: () => void;
}

const Ctx = createContext<ReferenceDrawerCtx>({
  open: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useReferenceDrawer = () => useContext(Ctx);

export function ReferenceDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState<string | undefined>(undefined);
  return (
    <Ctx.Provider
      value={{
        open,
        url,
        title,
        openDrawer: (opts) => {
          setUrl(opts?.url);
          setTitle(opts?.title);
          setOpen(true);
        },
        closeDrawer: () => setOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
