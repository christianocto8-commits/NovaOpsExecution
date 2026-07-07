"use client";

import { ReactNode } from "react";

import { ConfirmationDialog } from "./confirmation-dialog";

type ConfirmationProviderProps = {
  children: ReactNode;
};

export function ConfirmationProvider({ children }: ConfirmationProviderProps) {
  return (
    <>
      {children}
      <ConfirmationDialog />
    </>
  );
}
