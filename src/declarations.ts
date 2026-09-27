export const version = "0.1.0";
export const enliwfen = "enliwfen";

export interface EventHandler {
    handleEvent(event: Event): void;
}

export interface DOMTarget {
    element: HTMLElement | undefined | null
}

export interface DOMAgentInterface {
    mergeHtml(htmlString: string, domTarget?: DOMTarget): void
    mergeJson(json: any, domTarget?: DOMTarget): void
    showError(htmlString: string, domTarget?: DOMTarget): void
    createError(response: Response): void
}

export interface FeatureFactoryInterface {
    createFeature(element: HTMLElement): void
    destroyFeature(element: HTMLElement): void
}


