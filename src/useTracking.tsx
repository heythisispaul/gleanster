import { type ReactNode, createContext, useContext, useEffect } from "react";
import { type EventTracker } from "./EventTracker";

export const TrackingContext = createContext<EventTracker | null>(null);

/**
 * The tracking context provider from gleanster.
 */
export const TrackingProvider = ({
  eventTracker,
  children,
}: {
  eventTracker: EventTracker;
  children: ReactNode;
}) => {
  useEffect(() => {
    eventTracker?.initClient();
  }, []);

  return (
    <TrackingContext.Provider value={eventTracker}>
      {children}
    </TrackingContext.Provider>
  );
};

/**
 * returns the event tracker provided from gleanster's tracking context provider.
 */
export const useTracking = () => {
  const tracking = useContext(TrackingContext);

  return tracking as EventTracker;
};
