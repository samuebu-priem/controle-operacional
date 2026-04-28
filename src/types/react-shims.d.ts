declare module "react" {
  export type ReactNode = any;
  export type ReactElement = any;
  export type FC<P = {}> = (props: P) => ReactElement;
  export type FormEvent<T = any> = any;
  export type ChangeEvent<T = any> = any;
  export type MouseEvent<T = any> = any;
  export const StrictMode: any;
  export function useState<T>(initial: T): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps?: unknown[]): T;
}

declare module "react/jsx-runtime" {
  export {};
}
