import { type HTMLAttributes } from "react";
import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

import {
  withTracking,
  type WithTrackingProps,
  type TrackingConfigOpts,
} from "../withTracking";
import { EventTracker } from "../EventTracker";
import { type TrackingService } from "../types";
import { TrackingProvider } from "../useTracking";

type TestComponentProps = WithTrackingProps<
  HTMLAttributes<HTMLDivElement> & { testprop1?: string; testprop2?: number }
>;

const testEventHandler = jest.fn();

const TEST_ID = "test-id";
const TestComponent = (props: TestComponentProps) => (
  <div {...props} data-testid={TEST_ID} tabIndex={0} />
);

const setupAndRender = ({
  trackConfig,
  props,
}: {
  trackConfig: TrackingConfigOpts<TestComponentProps>;
  props: TestComponentProps;
}) => {
  const WrappedTrack = withTracking(TestComponent)(trackConfig);
  const result = render(<WrappedTrack {...props} />, {
    wrapper: ({ children }) => {
      const testService: TrackingService = { emitEvent: testEventHandler };
      const eventTracker = new EventTracker([testService]);

      return (
        <TrackingProvider eventTracker={eventTracker}>
          {children}
        </TrackingProvider>
      );
    },
  });
  const testElement = result.getByTestId(TEST_ID);

  return { result, testElement };
};

describe("withTracking", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("includes its name in the component's display name", () => {
    const WrappedComponent = withTracking(TestComponent)();

    expect(WrappedComponent.displayName).toEqual("withTracking(TestComponent)");
  });

  describe("when emitting events", () => {
    it("uses the provided tracking config values", async () => {
      const testTrackProps = { type: "test", detail: "with clicking" };
      const { testElement } = setupAndRender({
        trackConfig: {
          track_eventName: "button-clicked",
          track_properties: testTrackProps,
          track_handlerType: "onClick",
        },
        props: {
          onClick: testEventHandler,
        },
      });

      userEvent.click(testElement);

      await waitFor(() => {
        expect(testEventHandler).toHaveBeenCalledWith(
          "button-clicked",
          testTrackProps
        );
      });
    });

    it("calls the actual event handler provided to the component", async () => {
      const handleClick = jest.fn();
      const { testElement } = setupAndRender({
        trackConfig: {
          track_eventName: "button-clicked",
          track_handlerType: "onClick",
        },
        props: {
          onClick: handleClick,
        },
      });

      userEvent.click(testElement);

      await waitFor(() => {
        expect(handleClick).toHaveBeenCalled();
      });
    });

    it("can emit events for any handler specified", async () => {
      const handlerConfigs: Array<{
        type: string;
        userEvent: (element: HTMLElement) => void;
      }> = [
        {
          type: "onClick",
          userEvent: userEvent.click,
        },
        {
          type: "onMouseEnter",
          userEvent: userEvent.hover,
        },
        {
          type: "onFocus",
          userEvent: async () => {
            await userEvent.tab();
          },
        },
      ];

      for (const config of handlerConfigs) {
        jest.resetAllMocks();
        const { testElement, result } = setupAndRender({
          trackConfig: {
            track_eventName: "navigation-event",
            track_handlerType: config.type,
            track_properties: { type: config.type },
          },
          props: {
            [config.type]: testEventHandler,
          },
        });

        config.userEvent(testElement);

        await waitFor(() => {
          expect(testEventHandler).toHaveBeenCalledWith("navigation-event", {
            type: config.type,
          });
          result.unmount();
        });
      }
    });

    it("only emits events when it is not disabled", async () => {
      const handleClick = jest.fn();
      const { testElement } = setupAndRender({
        trackConfig: {
          track_eventName: "button-clicked",
          track_handlerType: "onClick",
        },
        props: {
          track_disabled: true,
          onClick: handleClick,
        },
      });

      userEvent.click(testElement);

      await waitFor(() => {
        expect(testEventHandler).not.toHaveBeenCalled();
        expect(handleClick).toHaveBeenCalled();
      });
    });
  });

  describe("creating and sending event properties", () => {
    it("overrides the config even name with the value provided in component's props", async () => {
      const GLOBAL_EVENT_NAME = "navigation-event";
      const LOCAL_EVENT_NAME = "button-clicked";
      const { testElement } = setupAndRender({
        trackConfig: {
          track_eventName: GLOBAL_EVENT_NAME,
          track_handlerType: "onClick",
          track_properties: { type: "globally set value" },
        },
        props: {
          onClick: testEventHandler,
          track_eventName: LOCAL_EVENT_NAME,
          track_properties: { type: "locally set value" },
        },
      });

      userEvent.click(testElement);

      await waitFor(() => {
        const [eventName, properties] = testEventHandler.mock.calls[0];
        expect(eventName).toEqual(LOCAL_EVENT_NAME);
        expect(properties).toEqual({ type: "locally set value" });
      });
    });

    it("combines the global track properties with the ones provided in the component's props", async () => {
      const { testElement } = setupAndRender({
        trackConfig: {
          track_eventName: "button-clicked",
          track_handlerType: "onClick",
          track_properties: { type: "globally set value" },
        },
        props: {
          onClick: testEventHandler,
          track_properties: { detail: "locally set detail" },
        },
      });

      userEvent.click(testElement);

      await waitFor(() => {
        const properties = testEventHandler.mock.calls[0]?.at(1);
        expect(properties).toEqual({
          type: "globally set value",
          detail: "locally set detail",
        });
      });
    });

    it("provides the component's props as the argument to the track_properties function", async () => {
      const { testElement } = setupAndRender({
        trackConfig: {
          track_eventName: "button-clicked",
          track_handlerType: "onClick",
          track_properties: (props: TestComponentProps) => ({
            type: props.testprop1,
            detail: `${props.testprop2}`,
          }),
        },
        props: {
          testprop1: "hello",
          testprop2: 100,
        },
      });

      userEvent.click(testElement);

      await waitFor(() => {
        const properties = testEventHandler.mock.calls[0]?.at(1);
        expect(properties).toEqual({
          type: "hello",
          detail: "100",
        });
      });
    });
  });
});
