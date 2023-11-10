import { type ComponentType, useCallback } from "react";
import { useTracking } from "./useTracking";
import { type MaybeAnyFunction } from "./types";

// TODO: get types working for track_property function args
export type WithTrackingProps<T> = T & {
  track_eventName?: string;
  track_properties?: ((props: T, ...args: unknown[]) => unknown) | object;
  track_handlerType?: string;
  track_disabled?: boolean;
};

export type TrackingConfigOpts<T> = Pick<
  WithTrackingProps<T>,
  "track_eventName" | "track_handlerType" | "track_properties"
>;

/**
  An HOC that co-opts an event handler ("onClick", "onChange", "onMouseEnter", etc),
  and fires a tracking event based off the config provided at the time the HOC was called,
  or using the track_* props applied directly to the component.
*/
export function withTracking<T>(
  Component: ComponentType<WithTrackingProps<T>>
) {
  return function (trackingConfig: TrackingConfigOpts<T> = {}) {
    function Tracking(props: WithTrackingProps<T>) {
      const eventTracker = useTracking();
      const {
        track_disabled,
        track_eventName,
        track_handlerType,
        track_properties,
        ...componentProps
      } = props;

      const eventName = track_eventName ?? trackingConfig.track_eventName;

      const trackingProperties =
        track_properties ?? trackingConfig.track_properties;

      const trackType = (track_handlerType ??
        trackingConfig.track_handlerType) as keyof T;

      const trackHandler = useCallback(
        (...args: unknown[]) => {
          const handlerActual = props[trackType] as MaybeAnyFunction;
          if (eventName && trackType) {
            /*
              Get the event properties from both the global handler, and the local handler
              and then combine them into one object to send with the event
            */
            const properties = [
              trackingConfig.track_properties,
              trackingProperties,
            ].reduce(
              (eventProperties, handler) => ({
                ...eventProperties,
                ...(typeof handler === "function"
                  ? handler(props, ...args)
                  : handler),
              }),
              {}
            );

            eventTracker.track(eventName, properties);
          }

          handlerActual?.(...args);
        },
        [trackType, eventName, trackingProperties, props]
      );

      const trackProps = track_disabled
        ? undefined
        : { [trackType]: trackHandler };

      return (
        <Component
          {...(componentProps as WithTrackingProps<T>)}
          {...trackProps}
        />
      );
    }

    Tracking.displayName = `withTracking(${
      Component.displayName ?? Component.name
    })`;

    return Tracking;
  };
}
