/**
 * Compile-time assertions. There is no runtime here — if one of these
 * `@ts-expect-error`s stops being an error, `tsc` fails the build, which is
 * the point. Device-local state must never be appendable to the log.
 */
import type { Event, DeviceState } from "./types";

declare const event: Event;
declare const device: DeviceState;

// @ts-expect-error device-local state is not an Event and never enters the log
export const notAnEvent: Event = device;

// @ts-expect-error an Event is not device-local state either
export const notDeviceState: DeviceState = event;

// @ts-expect-error a bare string is not a DeviceId
export const notADevice: Event["by"] = "phone-1";
