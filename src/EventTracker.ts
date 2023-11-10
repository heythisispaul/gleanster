import { type TrackingService } from "./types";

export class EventTracker {
  private readonly services: TrackingService[];
  private initComplete: boolean;

  constructor(services: TrackingService[]) {
    this.initComplete = false;
    this.services = services;
  }

  private forAllServices(trackAction: (service: TrackingService) => void) {
    for (const service of this.services) {
      trackAction(service);
    }
  }

  initClient() {
    if (!this.initComplete) {
      this.forAllServices((service) => service.init?.());
    }
    this.initComplete = true;
  }

  track(event: string, properties?: object): void {
    this.forAllServices((service) => service.emitEvent(event, properties));
  }
}
