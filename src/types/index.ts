export interface TrackingService {
  emitEvent: (event: string, properties?: object) => void | Promise<void>;
  init?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MaybeAnyFunction = ((...args: any[]) => any) | undefined;
