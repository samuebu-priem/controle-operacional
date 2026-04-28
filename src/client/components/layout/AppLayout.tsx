import type { ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
  className?: string;
};

export default function AppLayout({ children, className = "" }: AppLayoutProps) {
  return (
    <div className={`app-shell app-layout ${className}`.trim()}>
      <div className="app-shell__frame">
        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}
