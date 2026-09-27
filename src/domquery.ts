import { enliwfen } from "./declarations";

export class DOMQuery {
    
    static selectFirst(selectors: string, scope: HTMLElement | null = null): HTMLElement | null {
        const queryResult = scope === null ?
                            document.querySelector(selectors)
                            : scope.querySelector(selectors);
                            
        return queryResult instanceof HTMLElement ? queryResult : null; 
    }
    
    static *queryAll(selectors: string, scope: HTMLElement | null = null): Iterable<HTMLElement> {
        const queryResult = (scope === null) ?
                            document.querySelectorAll(selectors)
                            : scope.querySelectorAll(selectors);

        for (const element of queryResult) {
            if (element instanceof HTMLElement) {
                yield element;
            }
        }
    }
    
    static selectAll(selectors: string, scope: HTMLElement | null = null): Array<HTMLElement> {
        return [...DOMQuery.queryAll(selectors, scope)];
    }
 
    static *featureElements(scope: HTMLElement | null = null): Iterable<HTMLElement> {
        const queryResult = (scope === null) ?
                            document.getElementsByClassName(enliwfen)
                            : scope.getElementsByClassName(enliwfen);

        if ((scope !== null) && scope.classList.contains(enliwfen)) {
            yield scope;
        }
        
        for (const element of queryResult) {
            if (element instanceof HTMLElement) {
                yield element;
            }
        }
    }

    static getFeatureElements(scope: HTMLElement | null = null): Array<HTMLElement> {
        return [...DOMQuery.featureElements(scope)];
    } 
}
