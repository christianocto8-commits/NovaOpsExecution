import { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  return <div className="space-y-6">{children}</div>;
}