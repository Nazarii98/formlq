"use client";

import { createContext, useContext, useState } from "react";

interface ReferenceDrawerCtx {
  open: boolean;
  openDrawer: () => void;
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
  return (
    <Ctx.Provider value={{ open, openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}
