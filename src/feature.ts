import type { EventHandler } from "./declarations";
import { DOMQuery } from "./domquery";
import { FeatureNode } from "./featurenode";

export class Feature implements EventHandler {
    
    private static _map = new Map<HTMLElement, Feature>()

    private readonly _node: FeatureNode;
    
    constructor(element: HTMLElement) {
        this._node = new FeatureNode(element);
        Feature._map.set(element, this);
    }

    static get(element: HTMLElement) {
        return Feature._map.get(element);
    }
    
    static forEach(callbackFunction: (feature: Feature, key: HTMLElement, map: Map<HTMLElement, Feature>) => void): void {
        Feature._map.forEach(callbackFunction);
    }
    
    static *queryAll(selectors: string, scope: HTMLElement | null = null) {
        for (const element of DOMQuery.queryAll(selectors, scope)) {
            const feature = Feature._map.get(element);

            if (feature !== undefined) {
                yield feature;
            }
        }
    }

    static *features(scope: HTMLElement | null = null): Iterable<Feature> {
        for (const featureElement of DOMQuery.featureElements(scope)) {
            const feature = Feature._map.get(featureElement);

            if (feature !== undefined) {
                yield feature;
            }
        }
    }
    
    get node() {
        return this._node;
    }
        
    handleEvent(event: Event): void {
        console.debug(`Feature.handleEvent() [${this.node}] - Received event '${event.type}'.`);
    }
    
    domUpdate(): void {}

    observerUpdate(updateDetail: string): void {
        console.debug(`Feature.observerUpdate() [${this.node}] - Received update detail '${updateDetail}'.`);
    }

    notifyObservers(updateDetail: string): void {
        const observers = this.node.observers;

        if (observers !== null) {
            for (const feature of Feature.queryAll(observers)) {
                feature.observerUpdate(updateDetail);
            }
        }
    }

    destroy() {
        const {element, event} = this.node;
        
        if (event) {
            element.removeEventListener(event, this);
        }
        
        Feature._map.delete(element);
    }
}

