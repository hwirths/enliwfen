/*
 Import morphdom used to merge returned document fragments
 into the live document.
 The import requires an import map as described for example
 here : https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
 */
import morphdom from "morphdom"

const version = "0.1.0";
const enliwfen = "enliwfen";

class DOMQuery {
    
    static selectFirst(selectors: string, scope: HTMLElement | null = null): HTMLElement | null {
        const queryResult = scope === null ?
                            document.querySelector(selectors)
                            : scope.querySelector(selectors);
                            
        return queryResult instanceof HTMLElement ? queryResult : null; 
    }
    
    static selectAll(selectors: string, scope: HTMLElement | null = null): Array<HTMLElement> {
        const resultList: Array<HTMLElement> = [],
              queryResult = scope === null ?
                            document.querySelectorAll(selectors)
                            : scope.querySelectorAll(selectors);
        
        for (const entry of queryResult) {
            if (entry instanceof HTMLElement) {
                resultList.push(entry);
            }
        }
            
        return resultList;
    }
 
    static getFeatureElements(scope: HTMLElement | null = null): Array<HTMLElement> {
        const resultList: Array<HTMLElement> = [],
              queryResult = scope === null ?
                            document.getElementsByClassName(enliwfen)
                            : scope.getElementsByClassName(enliwfen);
        
        if ((scope !== null) && (scope.classList.contains(enliwfen))) {
            resultList.push(scope);
        }
        
        for (const entry of queryResult) {
            if (entry instanceof HTMLElement) {
                resultList.push(entry);
            }
        }
        
        return resultList;
    }   
}


/*
 A feature node wraps an element intended
 to be enlivened. It provides the properties
 taken from the elements itself and the 
 data-enliwfen-* attributes, respectively.
 */
class FeatureNode {
    
    _element: HTMLElement;
    _dataset: DOMStringMap;
    _url?: string;
    _method?: string;
    _event?: string | null;
    _headers?: object;
    _timeout?: number;
    _observers?: string | null;
    _target?: HTMLElement;
    _targets?: NodeListOf<HTMLElement> | HTMLElement[];
    _toggleAttribute?: string | null;
    _toggleClass?: string | null;
    
    constructor(element: HTMLElement) {
        this._element = element;
        this._dataset = element.dataset;
    }
    
    /*
     Returns the wrapped element
     */
    get element() {
        return this._element;
    }
    
    /*
     Gives access to the data-* attributes
     of the wrapped element
     */
    get dataset() {
        return this._dataset;
    }
    
    /*
     Returns the URL to be used for AJAX
     requests. The URL is discovered as follows:
      - Given an anchor element, the URL is
        taken from tehe attribute 'href'
      - Given a button element, the URL is taken
        either from the attribute 'formaction' if given
        or from the attribute 'data-enliwfen-url'
        otherwise.
      - Given a form element, the URL is taken from
        the attribute 'action'.
      - Given any other element, the URL is taken from
        the attribute 'dataenliwfen-url'.
     */
    get url() {
        if (this._url === undefined) {
            const element = this._element;
            
            switch(element.tagName) {
                case "A":
                    return (element as HTMLAnchorElement).href;
                case "BUTTON":
                case "INPUT":
                    return element.dataset.enliwfenUrl || (element as HTMLButtonElement | HTMLInputElement).formAction;
                
                case "FORM":
                    return (element as HTMLFormElement).action;
                
                default:
                    return element.dataset.enliwfenUrl;
            }
        }
        
        return this._url            
    }
    
    /*
     Returns the method to use for an AJAX call.
     The method is determined as follows:
       - Given a form element:
          - If the attribute 'data-enliwfen-deferred' is given,
            the method 'GET' will be returned, in order to initially
            load the form.
          - Otherwise the method is taken from the attribute 'method'.
       - Given a button or input element:
          - If not empty the value of the attribut 'formmethod' will
            be returned.
          - If the value of the attribut 'formmethod' is empty but
            the attribute 'data-enliwfen-url' is present with a
            non-empty value, the value of the attribute
            'data-enliwfen-method' will be returned.
          - Otherwise 'GET' will be returned.
       - Given any other element:
          - If given the method is taken from the attribute
            'data-enliwfen-method'.
          - Otherwise the default method 'GET' will be returned.
     */
    get method() {
        if (this._method === undefined) {
            const element = this._element;
            
            switch(element.tagName) {
                case "FORM":
                    return this.deferred ? "GET" : (element as HTMLFormElement).method
                
                case "BUTTON":
                case "INPUT":
                    return (element as HTMLButtonElement | HTMLInputElement).formMethod || element.dataset.enliwfenMethod || "GET"
                    
                default:
                    return element.dataset.enliwfenMethod || "GET"
            }
        }
        
        return this._method
    }
    
    /*
     Delivers the additional HTTP headers to add to an AJAX
     request. They are taken from the attribute
     'data-enliwfen-headers', if given. The content
     of the attribute 'data-enliwfen-headers' is expected
     to be a JSON object, where each key / value pair
     specifies a header entry.   
     */
    get headers() {
        if (this._headers === undefined) {
            const headers = this.dataset.enliwfenHeaders;
            
            this._headers = headers ? JSON.parse(headers) : null;
        }
        
        return this._headers
    }
    
    /*
     Delivers the timeout value in milliseconds
     to be used in a fetch call. If not set the
     default value of 30000 milliseconds will
     be used. 
     */
    get timeout() {
        if (this._timeout === undefined) {
            const enliwfenTimeout = this.dataset.enliwfenTimeout;
            
            if (enliwfenTimeout) {
                const timeout = parseInt(enliwfenTimeout);
                
                this._timeout = timeout != NaN ? Math.max(0, timeout) : 30000;
            } else {
                this._timeout = 30000;
            }
        }
        
        return this._timeout
    }
    
    /*
     Delivers the target of the feature defined by
     this node. This may be the element addressed
     to take the resul of an AJAX reqeuest or an action
     like toggling a class. If given, the first element
     matching the selector given in the attribute
     'data-enliwfen-target' is returned. The method
     'document.querySelector()' is used for the query.
     Remind, that addressing a target by its id,
     the id needs to be prepended by the character '#'.
     If the attribute 'data-enliwfen-target' is missing,
     the wrapped element itself is taken as target. 
     */
    get target() {
        if (this._target === undefined) {
            const element = this._element;
            let target: HTMLElement | null = null;
            
            if (element.dataset.enliwfenTarget) {
                target = document.querySelector(element.dataset.enliwfenTarget);
            }
            
            this._target = target || element;            
        }
        
        return this._target;
    }
    
    /*
     Delivers the targets of the feature defined by
     this node. This may be the members of a checkbox
     group or elements taking the result of an AJAX request.
     The list is determined as follows:
      - If given, the attribute 'data-enliwfen-targets' contains
        the query selector addressing the target elements. The
        method document.querySelectorAll() is used to query
        the target elements.
      - Otherwise the list is filled with the target element
        returned by the property 'target' of this node.
     */
    get targets() {
        if (this._targets === undefined) {
            const element = this._element;
            let targets: HTMLElement[] = [];
            
            if (element.dataset.enliwfenTargets) {
                const queryResult = document.querySelectorAll(element.dataset.enliwfenTargets);
                
                for (const entry of queryResult) {
                    if (entry instanceof HTMLElement) {
                        targets.push(entry);
                    }
                }
            }
            
            if (targets.length === 0) {
                targets.push(this.target);
            }
            
            this._targets = targets;
        }
        
        return this._targets;
    }
    
    /*
     Delivers the event triggering for example the
     submission of a from or the toggling of an attribute.
     The event is determined as follows:
      - If given, the event is taken from the attribute
        'data-enliwfen-event'.
      - Otherwise a default event is eturned:
         - Given a form element, event 'submit' is
           returned.
         - Given an input element, event 'input'
           is returned on an input element associated
           with a datalist and event 'change' on
           any other input elements  
         - Given any other element, event 'click'
           is returned.
     */
    get event() {
        if (this._event === undefined) {
            const event = this.dataset.enliwfenEvent;
            
            if (event !== undefined) {
                this._event = event;
            } else {
                const element = this.element;
                
                switch(element.tagName) {
                    case "A":
                    case "BUTTON":
                    case "SELECT":
                        this._event = "click";
                        break;
                           
                    case "FORM":
                        this._event = "submit";
                        break;
                        
                    case "INPUT":
                        if (element.hasAttribute("list")) {
                            this._event = "input";
                        } else {
                            this._event = "change";
                        }
                        break;
                    
                    default:
                        this._event = null;
                };
            } 
        }
        
        return this._event;
    }
    
    /*
     Delivers the name of the attribute intended
     to be toggled. It is taken from the attribute
     'data-enliwfen-toggle'. If the attribute
     'data-enliwfen-toggle' is missing, 'null'
     will be returned.
     */ 
    get toggleAttribute() {
        if (this._toggleAttribute === undefined) {
            const toggle = this.dataset.enliwfenToggle;
            
            this._toggleAttribute = toggle ? toggle : null;
        }
        
        
        return this._toggleAttribute;
    }
    
    get toggleClass() {
        if (this._toggleClass === undefined) {
            const toggleClass = this.dataset.enliwfenToggleClass;
            
            this._toggleClass = toggleClass ? toggleClass : null;
        }
        
        return this._toggleClass;
    }
    
    get interval() {
        const interval = this.dataset.enliwfenInterval;
        
        return interval ? parseInt(interval) : null;
    }
    
    get deferred() {
        return "enliwfenDeferred" in this.dataset;
    }
    
    get eventSource() {
        const eventSource = this.dataset.enliwfenEventsource;
        
        return eventSource ? eventSource : null;
    }
    
    get checkboxGroup() {
        const checkboxGroup = this.dataset.enliwfenCheckboxGroup;
        
        return checkboxGroup ? checkboxGroup : null;
    }
    
    get observers() {
        if (this._observers === undefined) {
            const observers = this.dataset.enliwfenObservers;
            
            this._observers = observers ? observers : null;
        }
        
        return this._observers;
    }
    
    dispatchEvent(eventType: string) {
        this.element.dispatchEvent(new CustomEvent(eventType));
    }
}

class Feature {
    
    private static _map = new Map<HTMLElement, Feature>()
    
    public readonly _node: FeatureNode;
    private readonly _observations = new Map<HTMLElement, string[]>();
    
    constructor(element: HTMLElement) {
        this._node = new FeatureNode(element);
        Feature._map.set(element, this);
    }

    public static get(element: HTMLElement) {
        return Feature._map.get(element);
    }
    
    public static forEach(callbackFunction: (feature: Feature, key: HTMLElement, map: Map<HTMLElement, Feature>) => void): void {
        Feature._map.forEach(callbackFunction);
    }
    
    get node() {
        return this._node;
    }
    
    handleEvent(event: Event): void {
        console.log(`Received event '${event.type}'.`)
    }
    
    startObserving(element: HTMLElement, events: string[]): void {
        events.forEach(event => element.addEventListener(event, this));    
        this._observations.set(element, events);
    }
    
    stopObserving(element: HTMLElement): void {
        const events = this._observations.get(element);
        
        if (events) {
            events.forEach(event => element.removeEventListener(event, this));
            this._observations.delete(element);
        }
    }
    
    addObservers(): void {}
    
    removeObservers(): void {
        const {element, observers} = this.node;
        
        if (observers) {
            document.querySelectorAll(observers).forEach(observerElement => {
                if (observerElement instanceof HTMLElement) {
                    const feature = Feature.get(observerElement);
                    
                    if (feature) {
                        feature.stopObserving(element);
                    }
                }
            })
        }
    }
    
    domUpdated(): void {}
    
    destroy() {
        const {element, event} = this.node;
        
        this.removeObservers();
        
        for (const entry of this._observations.entries()) {
            entry[1].forEach(event => entry[0].removeEventListener(event, this));
        }
        this._observations.clear();
        
        if (event) {
            element.removeEventListener(event, this);
        }
        
        Feature._map.delete(element);
    }
}

interface DOMTarget {
    element: HTMLElement | undefined | null
}

interface DOMAgentInterface {
    mergeHtml(htmlString: string, domTarget?: DOMTarget): void
    mergeJson(json: any, domTarget?: DOMTarget): void
    showError(htmlString: string, domTarget?: DOMTarget): void
    createError(response: Response): void
}

interface FeatureFactoryInterface {
    createFeature(element: HTMLElement): void
    destroyFeature(element: HTMLElement): void
}

class Endpoint {
    
    static getMimeType(response: Response) {
        const contentType = response.headers.get("Content-Type");
        
        if (contentType !== null) {
            /* The content type always starts with the
               mime type and may have additional
               options/attributes like the encoding
               on text types. These are delimited by
               a ';' after the mime type. */
            const parameterIndex = contentType.indexOf(";");
            
            return parameterIndex === -1 ?
                contentType
                : contentType.substring(0, parameterIndex);
        }              
        
        return contentType
    }
    
    /*
     * @param node An instance of class FeatureNode
     */
    constructor(readonly node: FeatureNode, readonly domAgent: DOMAgentInterface) {}
    
    async succeeded(response: Response) {
        const mimeType = Endpoint.getMimeType(response);
              
        if (response.headers.has("Content-Length")) {
            switch(mimeType) {
                case "application/json":
                    const jsonResponse = await response.json();
                    
                    if (jsonResponse.assign_location) {
                        location.assign(jsonResponse.assign_location);
                    } else if (jsonResponse.replace_location) {
                        location.replace(jsonResponse.replace_location);
                    } else {
                        this.domAgent.mergeJson(jsonResponse, this.node);
                    }
                    break;
                
                case "text/html":
                    this.domAgent.mergeHtml(await response.text(), this.node);
                    break;
                    
                case "application/pdf":
                case "application/zip":
                    const content = await response.blob(),
                          contentURL = URL.createObjectURL(content),
                          link = document.createElement("a"),
                          headers = response.headers;
                    let filename;
                                        
                    if (headers.has("Content-Disposition")) {
                        const filenames = headers.get("Content-Disposition").split(";").filter(e => e.trimStart().startsWith("filename"));
                        
                        if (filenames.length) {
                            filename = filenames[0].split("=")[1].replaceAll("\"","").trim() 
                        }
                    }
                    
                    link.href = contentURL;
                    link.download = filename
                    link.click() 
                    
                    URL.revokeObjectURL(contentURL);
                    break;

                default:
                    this.domAgent.createError(response);
            }
        } else {
            const utf8Decoder = new TextDecoder("utf-8"),
                  updateStart = "\n:enliwfen_update_start:\n",
                  updateEnd = "\n:enliwfen_update_end:\n",
                  streamProtocolIdentifier = ":enliwfen_stream_protocol:\n",
                  jsonIdentifier = ":json:";
                  
            let enliwfenStreamProtocol, currentUpdate, remainingText = "";
            
            try {
                for await (const chunk of response.body) {
                    const text = utf8Decoder.decode(chunk);
                    
                    remainingText += text;
                    
                    if ((enliwfenStreamProtocol === undefined) &&
                        (remainingText.length >= streamProtocolIdentifier.length)) {
                        if (remainingText.startsWith(streamProtocolIdentifier)) {
                            enliwfenStreamProtocol = true
                            remainingText = remainingText.substring(streamProtocolIdentifier.length)
                        } else {
                            enliwfenStreamProtocol = false
                        }
                    }
                     
                    if (enliwfenStreamProtocol === true) {
                        if (! currentUpdate) {
                            const startOfUpdate = remainingText.indexOf(updateStart);
                            
                            if (startOfUpdate !== -1) {
                                currentUpdate = remainingText.substring(startOfUpdate + updateStart.length);
                                remainingText = currentUpdate;
                            }
                        } 
                        
                        while (currentUpdate) {
                            const endOfUpdate = remainingText.indexOf(updateEnd);
                                                    
                            if (endOfUpdate === -1) {
                                break;
                            } else {
                                currentUpdate = remainingText.substring(0, endOfUpdate);
                                remainingText = remainingText.substring(endOfUpdate + updateEnd.length);
                                
                                if (currentUpdate.startsWith(jsonIdentifier)) {
                                    try {
                                        const jsonString = currentUpdate.substring(jsonIdentifier.length),
                                              jsonUpdate = JSON.parse(jsonString);
                                        this.domAgent.mergeJson(jsonUpdate, this.node)
                                    } catch (error) {
                                        console.warn(`Error parsing expected JSON string : ${error}`);
                                    }
                                } else {
                                    this.domAgent.mergeHtml(currentUpdate, this.node);    
                                }
                                
                                const startOfUpdate = remainingText.indexOf(updateStart);
                                
                                if (startOfUpdate === -1) {
                                    currentUpdate = undefined
                                } else {
                                    currentUpdate = remainingText.substring(startOfUpdate + updateStart.length);
                                    remainingText = currentUpdate;
                                }
                            }
                        } /* endwhile (currentUdate) */
                    } /* endif (enliwfenStreamProtocol === true) */               
                } /* endfor (chunk of response.body) */
            
                if (! enliwfenStreamProtocol) {
                    switch(mimeType) {
                        case "application/json":
                            const jsonResponse = JSON.parse(remainingText);
                            
                            if (jsonResponse.assign_location) {
                                location.assign(jsonResponse.assign_location);
                            } else if (jsonResponse.replace_location) {
                                location.replace(jsonResponse.replace_location);
                            } else {
                                this.domAgent.mergeJson(jsonResponse, this.node);
                            }
                            break;
                        
                        case "text/html":
                            this.domAgent.mergeHtml(remainingText, this.node);
                            break;
                            
                        default:
                            this.domAgent.createError(response);
                    }
                }
            } catch (error) {
                console.error(`Failed to read the stream from ${this.node.url} ({error})`)
            }
        } /* endif (response.headers.has("Content-Length")) */
    }
    
    async failed(response: Response) {
        switch(Endpoint.getMimeType(response)) {            
            case "application/json":
                this.domAgent.mergeJson(await response.json(), this.node);
                break;
                
            case "text/html":
                /* In case of a failed call the returned text
                   can either en entire HTML document or a 
                   document fragment.
                   Given an enitre HTML document, it will be
                   displayed as an error.
                   Given a document fragment, it will be handled
                   like a document fragment returned by a
                   successful call. */
                const text = (await response.text()).trimStart();
                
                this.domAgent.showError(text, this.node);
                break;
                
            default:
                this.domAgent.createError(response);
        }
    }
    
    async fetched(response: Response) {
        switch(response.status) {
            case 200: /* OK */
            case 201: /* CREATED */
            case 202: /* ACCEPTED */
            case 203: /* NON-AUTHORITATIVE INFORMATION */
                /* Each of these HTTP response status codes indicate
                   a successfully processed / accepted request. 
                   As even an accepted request may return data,
                   the returned data will be inserted / merged into
                   the document as specified by the feature node. */
                await this.succeeded(response);
                break;
            
            case 205: /* RESET CONTENT */
                /* The server asks to reset the content of
                   the document, which sent the request.
                   The entire page is reloaded. */
                location.reload();
                break;
            
            case 500:
                /* An internal server error is expected
                   to return some information on the cause
                   of the error. Within the context of enliwfen
                   the returned information is handled like the
                   returned data of a successful request. It
                   will be inserted / merged into the document
                   as specified by the feature node. */
                await this.failed(response);
                break;
                
            case 204: /* NO CONTENT */
                /* The request has been successfully processed but
                   did not return any data.
                   There is nothing to do for enliwfen. */
                break;
                
            default:
                switch(Endpoint.getMimeType(response)) {            
                    case "text/html":
                        this.domAgent.showError(await response.text(), this.node);
                        break;
                        
                    default:
                        this.domAgent.createError(response);
                }
        }
    }

    /*
     * @param node An instance of class FeatureNode
     */
    async call() {
        const {element, url, method, headers, timeout} = this.node,
              requestOptions = {method: method} as any;
              
        if (url !== undefined) {
            if (headers) {
                requestOptions.headers = headers;
            }
            
            if (timeout > 0) {
                console.debug(`A timeout of '${timeout}ms' is going to be set for call of '${url}'.`)
                requestOptions.signal = AbortSignal.timeout(timeout);
            } else {
                console.debug(`No timeout ist set for call of '${url}'.`)
            }
            
            switch(element.tagName) {
                case "FORM":
                    if (method.toLowerCase() === "post") {
                        requestOptions.body = new FormData(element as HTMLFormElement);
                    }
                    break;
                    
                case "BUTTON":
                case "INPUT":
                case "SELECT":
                    /* A request body with form data will be added, if the
                       the element belongs to a form and the HTTP method
                       is set to 'post'. */
                    const form = (element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).form
                    
                    if (form && (method.toLowerCase() === "post")) {
                        requestOptions.body = new FormData(form);
                    }
                    break;
            }
    
            element.inert = true;
            
            try {
                await this.fetched(await fetch(url, requestOptions));
            } catch (error) {
                console.error(error);
                this.domAgent.showError(`<html><body><h1>An unexpected error occured.</h1><p>Details: ${error}</p></body></html>`)
            } finally {
                element.inert = false;
            }
        } else {
            console.log(`No URL to call ist set in the feature node '${element}'.`)
        }
    }

}

class ToggleAction extends Feature {
    _open: 0;
    
    constructor(element: HTMLElement) {
        super(element);
        
        if (this.node.event !== null) {
            element.addEventListener(this.node.event, this);    
        } else {
            console.log(`No event of interest set for the toggle action '${element}'.`)
        }
    }
    
    trigger() {
        const {toggleAttribute, toggleClass, targets} = this.node;

        if (toggleClass) {
            targets.forEach(target => target.classList.toggle(toggleClass));
        }
        if (toggleAttribute) {
            targets.forEach(target => target.toggleAttribute(toggleAttribute));
        }
        
    }
    
    handleEvent(event: Event) {
        if (event.type == this.node.event) {
            this.trigger();
        } else if (event.type.startsWith("enliwfen.")) {
            if (event.type.endsWith(".before")) {
                if (this._open === 0) {
                    this.trigger();
                }
                
                this._open += 1
            } else if (event.type.endsWith(".done") || event.type.endsWith(".after")) {
                this._open -= 1;
                
                if (this._open === 0) {
                    this.trigger();
                }
            }
        }
    }
}

class CheckboxGroup extends Feature {
    _checkboxes?: NodeListOf<HTMLInputElement>;
    
    constructor(element: HTMLElement) {
        super(element);

        this._checkboxes = undefined;
        
        /* Initialize this checkbox group by
           signalling an updated DOM tree. */
        this.domUpdated();
        
        /* Add this feature as event handler to
           the element of this feature.
           Map the feature to its element in
           the global element map. */
        if (this.node.event !== null) {
            element.addEventListener(this.node.event, this);    
        } else {
            console.log(`No event of interest set for teh checkbox group '${element}'`);
        }
    }
    
    get checkboxes() {
        return this._checkboxes;
    }
    
    domUpdated() {
        /* This DOM tree has been updated.
           The checkbox group needs an update.
           Any removed checkbox does not need any
           further consideration. Instead the           
           checkbox group is freshly evaluated,
           adding an event listener to every checkbox
           new to the checkbox group. */
        const {element, checkboxGroup} = this.node,
              form = (element as HTMLInputElement).form,
              selector = `input[type='checkbox'][name='${checkboxGroup}']`;
        let checkboxes: NodeListOf<HTMLInputElement>;
        
        if (form) {
            /* The element of this feature is part of a form.
               Consider each matching checkbox of the form */
            checkboxes = form.querySelectorAll<HTMLInputElement>(selector);
        } else {
            /* The element of this feature is not part of a
               form. The whole document is considered. */
            checkboxes = document.querySelectorAll<HTMLInputElement>(selector);
        }

        /* Add an event listener with this feature as handler
           to every checkbox. The call will have no effect, if
           the event listener already exists. */
        checkboxes.forEach(checkbox => checkbox.addEventListener("change", this));
        
        this._checkboxes = checkboxes;
   }
    
    destroy() {
        this.checkboxes.forEach(checkbox => checkbox.removeEventListener("change", this));
        
        super.destroy();
    }
    
    handleEvent(event: Event) {
        const element = this.node.element as HTMLInputElement,
              currentTarget = event.currentTarget as HTMLInputElement;
              
        if (currentTarget === element && event.type === this.node.event) {
            const newStatus = element.checked;
            
            this.checkboxes.forEach(checkbox => checkbox.checked = newStatus);
        } else if (currentTarget !== element && event.type === "change") {
            if (!currentTarget.checked && element.checked){
                element.checked = false;
            } else if (!element.checked && Array.prototype.every.call(this.checkboxes, (checkbox: HTMLInputElement) => checkbox.checked)) {
                element.checked = true;
            }
        }
    }
    
}

class Dialog extends Feature {
    
    constructor(element: HTMLDialogElement) {
        const dismissButtons = element.querySelectorAll<HTMLButtonElement>("button[data-enliwfen-dismissdialog]");
        
        super(element);
        
        dismissButtons.forEach(button => button.addEventListener("click", () => element.close()));
        
        if (element.dataset.enliwfenDialogstatus === "open") {
            element.showModal();
        }
    }
}

class ServerInteractionFeature extends Feature {
    readonly endpoint: Endpoint;
    
    constructor(element: HTMLElement, domAgent: DOMAgentInterface) {
        super(element);

        this.endpoint = new Endpoint(this.node, domAgent);
    }
    
    async callServer({eventBefore, eventAfter}: {eventBefore: string, eventAfter: string}) {
        const node = this.node;
        
        if (eventBefore) {
            node.dispatchEvent(`enliwfen.${eventBefore}`);
        }
        
        await this.endpoint.call();
        
        if (eventAfter) {
            node.dispatchEvent(`enliwfen.${eventAfter}`);
        }
    }
 }
 
class ActionCall extends ServerInteractionFeature {
    
    constructor(element: HTMLElement, domAgent: DOMAgentInterface) {
        super(element, domAgent);
        
        if (this.node.event !== null) {
            this.node.element.addEventListener(this.node.event, this);    
        } else {
            console.log(`There is no event of insterest set for the action call '${element}'.`);
        }
    }
    
    addObservers() {
        const {element, observers} = this.node;
        
        if (observers) {
            document.querySelectorAll(observers).forEach(observerElement => {
                if (observerElement instanceof HTMLElement) {
                    const feature = Feature.get(observerElement);
                    
                    if (feature) {
                        feature.startObserving(element, ["enliwfen.action.before", "enliwfen.action.done"]);
                    }
                }
            });
        }
    }
    
    handleEvent(event: Event) {
        if (event.type === this.node.event) {
            event.preventDefault();
            event.stopPropagation();
            this.callServer({eventBefore: "action.before", eventAfter: "action.done"});
        }
    }
}

class EventSourceMap {
    static _eventSources: Map<string, EventSource>;
        
    static get(node: FeatureNode) {
        const url = node.eventSource;
        let eventSource = undefined;
        
        if (url) {
            let eventSources = this._eventSources;
            
            if (eventSources === undefined) {
                eventSource = new EventSource(url);
                 
                this._eventSources = eventSources = new Map();
                eventSources.set(url, eventSource);
            } else {
                eventSource = eventSources.get(url);
                
                if (eventSource === undefined) {
                    eventSource = new EventSource(url);
                    
                    eventSources.set(url, eventSource);
                }
            }
            
            eventSource.addEventListener("error", (event) => {
                console.error(event);
                eventSources.delete(url);
            });
        }
        
        return eventSource;
    }
    
    static find(node: FeatureNode) {
        if (node.eventSource !== null) {
            return this._eventSources.get(node.eventSource);    
        }
        
        return undefined;
    }
}

class Component extends ServerInteractionFeature {
    _intervalID?: number;
    _eventSource?: EventSource;
    
    constructor(element: HTMLElement, readonly domAgent: DOMAgentInterface) {
        super(element, domAgent);

        const node = this.node,
              interval = node.interval;
        
        if (node.deferred) {
            this.callServer({eventBefore: "", eventAfter: ""});
        } else if (interval) {
            this._intervalID = setInterval(() => this.callServer({eventBefore: "update.before", eventAfter: "update.done"}), interval);
        } else if (node.event) {
            const eventSource = EventSourceMap.get(node);
            
            if (eventSource) {
                console.debug(`Component is going to listen on event '${node.event}' at the event source '${node.eventSource}'.`);
                eventSource.addEventListener(node.event, this);
                this._eventSource = eventSource;
            }
        }
    }
    
    destroy() {
        if (this._intervalID !== undefined) {
            clearInterval(this._intervalID);
        }
        
        if (this.node.event !== null && this._eventSource !== undefined) {
            const eventSource = EventSourceMap.find(this.node);
            
            if (eventSource !== undefined) {
                eventSource.removeEventListener(this.node.event, this);
            }
        }
        
        super.destroy()
    }
    
    handleEvent(event: Event) {
        if (event.type === this.node.event) {
            if (event instanceof MessageEvent && event.data) {
                console.debug(`Got event data ${event.data}.`);
                try {
                    const jsonUpdates = JSON.parse(event.data);
                    this.domAgent.mergeJson(jsonUpdates, this.node)
                } catch (error) {
                    console.warn(`Error parsing expected JSON string : ${error}`);
                }
            } else {
                console.debug(`Got event ${this.node.event}. Component will be updated.`);
                this.callServer({eventBefore: "update.before", eventAfter: "update.done"});
            }
        } else if (event.type.startsWith("enliwfen.") &&                
                   (event.type.endsWith(".after") || event.type.endsWith(".done"))) {
            /* TODO: Adding a component itsel to the observers list may leed to an
                     inifinite loop of updates!
                     As well there are chances of circular observer chains. */ 
            console.debug(`Got event '{event.type}'. Component will be updated.`);
            this.callServer({eventBefore: "update.before", eventAfter: "update.done"});
        }
    }
    
}

class Form extends ServerInteractionFeature {
    
    constructor(element: HTMLElement, domAgent: DOMAgentInterface) {
        super(element, domAgent);
        
        const node = this.node;
        
        if (node.deferred) {
            this.endpoint.call();
        } else if (node.event !== null) {
            element.addEventListener(node.event, this);
        }
    }

    addObservers() {
        const {element, observers} = this.node;
        
        if (observers) {
            document.querySelectorAll<HTMLElement>(observers).forEach(observerElement => {
                const feature = Feature.get(observerElement);
                
                if (feature) {
                    feature.startObserving(element, ["enliwfen.submission.before", "enliwfen.submission.after"]);
                }
            });
        } 
    }
    
    handleEvent(event: Event) {
        if (event.type === this.node.event) {
            event.preventDefault();
            this.callServer({eventBefore: "submission.before", eventAfter: "submission.after"});
        }
    }
    
}

class Datalist extends Feature {
    _datalist?: Component;
    _lastMatch?: string;
    _scheduled?: number;
    
    constructor(element: HTMLElement, domAgent: DOMAgentInterface) {
        super(element);
        
        if (this.node.event !== null) {
            /* An event is defined to listen for.
               The datalist is needed to create a
               component for its updates. The id of the
               datalist is given in the attribute 'list'
               of the input element. The query selector is
               called to lookup an element 'datalist' with
               the specified id. */
            const datalistId = `datalist#${element.getAttribute("list")}`,
                  datalistElement = document.querySelector<HTMLDataListElement>(`datalist#${datalistId}`);
            
            if (datalistElement !== null) {
                /* The referenced datalist element is present.
                   A component for datalist updates is created
                   and an event listener added to trigger
                   datalist updates. */
                this._datalist = new Component(datalistElement, domAgent);
                element.addEventListener(this.node.event, this);
            } else {
                console.log(`No datalist element with id '${datalistId}' given for feature node '${element}'.`);
            }
        } else {
            console.log(`There is no event defined for feature node '${element}'.`);
        }
    }
    
    handleEvent(event: Event) {
        const datalist = this._datalist;
        
        if ((datalist !== undefined) && (event.type == this.node.event)) {
            const {element, dataset} = this.node;
            
            if (dataset.enliwfenPattern !== undefined) {                
                const matches = (element as HTMLInputElement).value.match(dataset.enliwfenPattern);
                
                if (matches && (matches[0] !== this._lastMatch)) {
                    this._lastMatch = matches[0]
                    datalist.node.dataset.enliwfenUrl = `${dataset.enliwfenUrl}?stem=${matches[0]}`;
                    
                    if (this._scheduled !== undefined) {
                        clearTimeout(this._scheduled);
                    }
                    
                    this._scheduled = setTimeout(
                        () => {
                            datalist.callServer({eventBefore: "datalist.before", eventAfter: "datalist.done"});
                            this._scheduled = undefined;   
                        },
                        200);
                }
            } else {
                console.log(`There is no filter pattern given in the feature node '${element}' for datalist updates.`);
            }
        }
    }
}

/*
*/
class DOMAgent implements DOMAgentInterface {
    
    readonly parser = new DOMParser();
    
    constructor(readonly featureFactory: FeatureFactoryInterface) {}

    static openDialog(element: HTMLElement) {
        /* Create the elements used to build the error dialog
           and to present the error page. */
        const errorContainer = document.createElement("div"),
              shadowRoot = errorContainer.attachShadow({mode: "open"}),
              errorDialog = document.createElement("dialog"),
              closeButton = document.createElement("button"),
              body = document.body;

        /* Configure the close button */
        closeButton.appendChild(document.createTextNode("X"));
        closeButton.setAttribute("autofocus", "");
        closeButton.setAttribute("style", "display: block; width: 2rem; height: 2rem; float: right; font-size: 1rem;");
        
        /* On click close the error dialog */
        closeButton.addEventListener("click", () => errorDialog.close());

        /* Configure the error dialog and append the
           close button and the iframe. */
        errorDialog.setAttribute("style", "width: 75vw; height:75vh;");
        errorDialog.appendChild(closeButton);
        errorDialog.appendChild(element);
        
        /* Remove the error container from the body
           on close of the error dialog */
        errorDialog.addEventListener("close", () => errorContainer.remove());
        
        /* Append the error dialog to the shadow root,
           the error container to the body and
           show the dialog in modal shape */
        shadowRoot.appendChild(errorDialog);
        body.appendChild(errorContainer);
        errorDialog.showModal();
    }

    static openErrorDialog(data: string) {
        /* Create the elements used to build the error dialog
           and to present the error page. */
        const errorPage = document.createElement("iframe");

        /* Configure the error page and set the data */        
        errorPage.setAttribute("sandbox", "");        
        errorPage.setAttribute("style", "width: 100%; height: calc(100% - 3rem); margin-top: 1rem")
        errorPage.setAttribute("srcdoc", data);

        DOMAgent.openDialog(errorPage);        
    }
       
    replaceElement(this: DOMAgent, target: HTMLElement, update: HTMLElement): void {
        console.log(`New HTML element '${update.tagName}#${update.id}' is going to replace the corresponding HTML element of the document.`)
        
        /* Destroy all features of the target subtree. */
        DOMQuery.getFeatureElements(target).forEach(element => this.featureFactory.destroyFeature(element));
        
        /* Replace target with the child. */
        target.replaceWith(update);
        
        /* Before creating the new features the existing ones
           are updated. */
        Feature.forEach(feature => feature.domUpdated());
        
        /* Now that the updates have been merged into the document
           the collected feature nodes can be created.
           After the features are created and therefore present
           their observers can be initialized. */
        const featureElements = DOMQuery.getFeatureElements(update);
        
        featureElements.forEach(element => this.featureFactory.createFeature(element));
        featureElements.forEach(element => Feature.get(element)?.addObservers());
    }
    
    mergeHtml(this: DOMAgent, htmlString: string, domTarget?: DOMTarget): void {
        const updates = this.parser.parseFromString(htmlString, "text/html");
        
        for (const update of updates.body.children) {
            if (update instanceof HTMLElement) {
                let target = document.getElementById(update.id);
                
                if (target === null) {
                    target = domTarget?.element || null;     
                }
                
                if (target !== null) {
                    this.replaceElement(target, update);
                } else {
                    console.log(`New HTML element '${update.tagName}#${update.id}' is going to be appended to the body.`);
                    document.body.appendChild(update);
                }
            } else {                
                console.log(`New element '${update.tagName}#${update.id}' is appended to the body.`);
                document.body.appendChild(update);
            }
        }        
    }
    
    mergeJson(this: DOMAgent, json: any, domTarget?: DOMTarget): void {
        if (json.result) {
            this.mergeHtml(json.result, domTarget);
        }
        
        if (json.updates instanceof Object) {
            for (const [id, updateString] of Object.entries(json.updates)) {
                if (typeof id === "string" && typeof updateString === "string") {
                    this.mergeHtml(updateString, {element: document.getElementById(id)});
                }
            }
        }
    }
    
    showError(this: DOMAgent, htmlString: string, domTarget?: DOMTarget): void {
        if (htmlString.startsWith("<!DOCTYPE") || htmlString.startsWith("<!doctype") || htmlString.startsWith("<html")) {
            DOMAgent.openErrorDialog(htmlString);
        } else {
            this.mergeHtml(htmlString, domTarget);
        }
    }
    
    static _merge(target: HTMLElement | null, contents: HTMLElement | string) {        
        if (target !== null) {
            const featureNodes: Element[] = [];
            
            /* Merge the updated document fragment into
               document. Therein:
                - Destroy features built on nodes removed
                  from the document
                - Destroy features of nodes before they are updated,
                  if the updated node had either a different ID or
                  different enliwfen settings.
                - Collect new and updated feature nodes
               New and updated feature nodes are collected first and
               are created after the document fragment has completely
               been merged. Direct creation of feature nodes could
               be incomplete, if they include nodes not added to the
               document yet. */ 
            const updatedElement = morphdom(target, contents, {
                onNodeAdded: (node: Element) => {
                    if (node.classList && node.classList.contains("enliwfen")) {
                        console.debug("Add node %o", node);
                        /* A feature node. Add it to the list of feature
                           nodes. They are created after finishing the merge. */
                        featureNodes.push(node);
                    }
                },
                onBeforeElUpdated: (fromElement: Element, toElement: Element) => {
                    if (fromElement.classList.contains("enliwfen")) {
                        /* Remove the feature, if the new element either
                         * has a different ID or different 'enliwfen' settings. */
                        if (fromElement.id !== toElement.id) {
                            console.debug("Update needed due to different id! %o : %o", fromElement, toElement);
                            FeatureFactory.destroyFeature(fromElement as HTMLElement);
                        } else {
                            for (const attribute of fromElement.attributes) {
                                if (attribute.name.startsWith("data-enliwfen")
                                    && attribute.value !== toElement.getAttribute(attribute.name)) {
                                    console.debug("Update needed due to different enliwfen settings! %o : %o", fromElement, toElement);
                                    FeatureFactory.destroyFeature(fromElement as HTMLElement);
                                    break;
                                }
                            }
                        }
                    }
                },
                onElUpdated: (element: Element) => {
                    if (element.classList.contains("enliwfen")) {
                        /* The element has been updated. Add the element
                           to the list of feature nodes. They are craeted
                           after finishing the merge. */
                        featureNodes.push(element)                        
                    }
                },
                onNodeDiscarded: (node: Element) => {
                    if (node.classList && node.classList.contains("enliwfen")) {
                        console.debug("Remove node %o", node);
                        FeatureFactory.destroyFeature(node as HTMLElement);
                    }
                }
            });
            
            /* Before creating the new features the existing ones
               are updated. */
            Feature.forEach(feature => feature.domUpdated());
            
            /* Now that the updates have been merged into the document
               the collected feature nodes can be created.
               After the features are created and therefore present
               their observers can be initialized. */
            featureNodes.forEach(node => FeatureFactory.createFeature(node as HTMLElement));
            featureNodes.forEach(node => {
                const feature = Feature.get(node as HTMLElement);
                
                if (feature) {
                    feature.addObservers();
                }
            });
        }
    }
    
    
    createError(this: DOMAgent, response: Response): void {
        const errorDocument = `<html><body>
<h1>Unsupported response</h1>
<table>
<tbody>
<tr>
<td>HTTP status code</td><td>${response.status}</td>
</tr>
<tr>
<td>HTTP status text</td><td>${response.statusText}</td>
</tr>
<tr>
<td>Content-Type</td><td>${response.headers.get("Content-Type")}</td>
</tr>
</tbody>
</table>        
</body></html>`;

        DOMAgent.openErrorDialog(errorDocument);
    }

}

class FeatureFactory implements FeatureFactoryInterface {
    
    domAgent: DOMAgent;
    
    constructor() {
        this.domAgent = new DOMAgent(this);
    }
    
    createFeature(this: FeatureFactory, element: HTMLElement) {
        console.debug(`Going to create feature for element '${element.tagName}#${element.id}'`);
        
        if (! Feature.get(element)) {
            switch (element.tagName) {
                case "A":
                case "BUTTON":
                case "SELECT":
                    new ActionCall(element, this.domAgent);
                    break;
                    
                case "FORM":
                    new Form(element, this.domAgent);
                    break;
                    
                case "INPUT":
                    if (element.hasAttribute("list")) {
                        new Datalist(element, this.domAgent);    
                    } else {
                        this.createFeatureFromDataset(element);
                    }
                    break;
                    
                case "DIALOG":
                    new Dialog(element);
                    break;
                     
                default:
                    this.createFeatureFromDataset(element);
            }
        }
    }
    
    createFeatureFromDataset(this: FeatureFactory, element: HTMLElement) {
        const dataset = element.dataset;
        
        if ("enliwfenUrl" in dataset) {
            new Component(element, this.domAgent);
        } else if ("enliwfenToggle" in dataset || "enliwfenToggleClass" in dataset) {
            new ToggleAction(element);
        } else if ("enliwfenCheckboxGroup" in dataset  && element.tagName === "INPUT") {
            new CheckboxGroup(element);
        } else if ("enliwfenEventsource" in dataset) {
            EventSourceMap.get(new FeatureNode(element));
        }
    }
    
    destroyFeature(element: HTMLElement) {
        const feature = Feature.get(element);
        
        if (feature !== undefined) {
            feature.destroy();
        }
    }
    
    createFeatures() {
        DOMQuery.getFeatureElements().forEach(element => this.createFeature(element));
        Feature.forEach(feature => feature.addObservers())
    }
    
    static instance = new FeatureFactory();
    
}

class Enliwfen {
    static version() {
        return version;
    }    
}

FeatureFactory.instance.createFeatures();

export default Enliwfen;