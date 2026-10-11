export const version = "0.1.0";
export const enliwfen = "enliwfen";

export type FeatureElement = HTMLElement | undefined | null;

export interface EventHandler {
    handleEvent(event: Event): void;
}

