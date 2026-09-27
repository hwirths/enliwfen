import { DOMQuery } from "./domquery";

/*
 A feature node wraps an element intended
 to be enlivened. It provides the properties
 taken from the elements itself and the 
 data-enliwfen-* attributes, respectively.
 */
export class FeatureNode {
    
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
                
                this._timeout = !Number.isNaN(timeout) ? Math.max(0, timeout) : 30000;
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
            let targets: HTMLElement[];
            
            if (element.dataset.enliwfenTargets) {
                targets = DOMQuery.selectAll(element.dataset.enliwfenTargets);

                if (targets.length === 0) {
                    targets.push(this.target);
                }
            } else {
                targets = [this.target];
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

    toString(): string {
        return `${this.element.tagName}[${this.element.id}]`;
    }
}

