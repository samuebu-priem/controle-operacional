declare module "react" {
  export type ReactNode = any;
  export type ReactElement = any;
  export const StrictMode: any;
}

declare module "react-dom/client" {
  import type { ReactNode } from "react";

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module "react-router-dom" {
  import type { ReactNode } from "react";

  export interface RouteProps {
    path?: string;
    element?: ReactNode;
  }

  export interface RoutesProps {
    children?: ReactNode;
  }

  export interface NavigateProps {
    to: string;
    replace?: boolean;
  }

  export const BrowserRouter: any;
  export const Routes: any;
  export const Route: any;
  export const Navigate: any;
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare global {
  namespace JSX {
    interface Element {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
