/* const ENLIWFEN_HEADERS = {
    REQUEST: "x-enliwfen-request",
    RELOAD: "x-enliwfen-reload"
}; */

import { version } from "./declarations";
import { DOMQuery } from "./domquery";
import { DOMAgent } from "./domagent";
import { FeatureNode }from "./featurenode";
import { Feature } from  "./feature";
import { Endpoint } from "./endpoint";


class ActionIndicator extends Feature {
    _enabled = 0;
    
    constructor(element: HTMLElement) {
        super(element);

        element.hidden = true
    }

    show() {
        this.node.element.hidden = false;
    }

    hide() {
        this.node.element.hidden = true;
    }

    observerUpdate(updateDetail: string): void {
        if (updateDetail.startsWith("enliwfen.")) {
            if (updateDetail.endsWith(".before")) {
                if (this._enabled === 0) {
                    this.show();
                }
                
                this._enabled += 1
            } else if (updateDetail.endsWith(".done") || updateDetail.endsWith(".after")) {
                this._enabled -= 1;
                
                if (this._enabled === 0) {
                    this.hide();
                }
            } else {
                super.observerUpdate(updateDetail);
            }
        } else {
            super.observerUpdate(updateDetail);
        }
    }
}

class ToggleAction extends Feature {
    
    constructor(element: HTMLElement) {
        super(element);
        
        if (this.node.event !== null) {
            element.addEventListener(this.node.event, this);    
        } else {
            console.log(`ToggleAction.constructor() [${this.node}] - No event of interest set for the toggle action '${element}'.`)
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
    
    observerUpdate(updateDetail: string) {
        if (updateDetail === "enliwfen.toggle") {
            this.trigger();
        } else {
            super.observerUpdate(updateDetail);
        }
    }
    
    handleEvent(event: Event) {
        if (event.type == this.node.event) {
            this.trigger();
        } else {
            super.handleEvent(event);
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
        this.domUpdate();
        
        /* Add this feature as event handler to
           the element of this feature.
           Map the feature to its element in
           the global element map. */
        if (this.node.event !== null) {
            element.addEventListener(this.node.event, this);    
        } else {
            console.log(`CheckboxGroup.constructor() [${this.node}] - No event of interest set for teh checkbox group '${element}'`);
        }
    }
    
    get checkboxes() {
        return this._checkboxes;
    }
    
    domUpdate() {
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
        this.checkboxes?.forEach(checkbox => checkbox.removeEventListener("change", this));
        
        super.destroy();
    }
    
    handleEvent(event: Event) {
        const element = this.node.element as HTMLInputElement,
              currentTarget = event.currentTarget as HTMLInputElement;
              
        if (currentTarget === element && event.type === this.node.event) {
            const newStatus = element.checked;
            
            this.checkboxes?.forEach(checkbox => checkbox.checked = newStatus);
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
    
    constructor(element: HTMLElement, domAgent: DOMAgent) {
        super(element);

        this.endpoint = new Endpoint(this.node.url, domAgent, this.node.element);
    }
    
    async callServer(this: ServerInteractionFeature, {eventBefore, eventAfter}: {eventBefore: string, eventAfter: string}) {
        const {method, headers, timeout} = this.node;

        if (eventBefore) {            
            this.node.dispatchEvent(`enliwfen.${eventBefore}`);
            this.notifyObservers(`enliwfen.${eventBefore}`);
        }
        
        await this.endpoint.call(method, headers, timeout);
        
        if (eventAfter) {
            this.notifyObservers(`enliwfen.${eventAfter}`);
            this.node.dispatchEvent(`enliwfen.${eventAfter}`);
        }
    }
 }
 
class ActionCall extends ServerInteractionFeature {
    
    constructor(element: HTMLElement, domAgent: DOMAgent) {
        super(element, domAgent);
        
        if (this.node.event !== null) {
            this.node.element.addEventListener(this.node.event, this);    
        } else {
            console.log(`ActionCall.constructor() [${this.node}] - There is no event of insterest set for the action call '${element}'.`);
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
                this._eventSources = eventSources = new Map();
            } else {
                eventSource = eventSources.get(url);
            }
            
            if (eventSource === undefined) {
                /* A new event source is created. */
                eventSource = new EventSource(url);
                
                /* Errors are logged.
                   TODO: It might be a regular connection loss,
                         which can be fixed by a reconnect.
                         It might be an irrversible error and
                         a reconnect is known to not work.
                         Should an irreversible error be shown
                         within an error dialog? */
                eventSource.addEventListener("error", (event) => {
                    console.error(event);
                    /* eventSources.delete(url); */
                });
                
                /* The sepcial event 'reset-content' corresponds
                   to the HTTP 205 response code and is intended
                   to trigger a location reload. */
                eventSource.addEventListener("reset-content", () => location.reload());

                /* The special event 'keepalive' is intended
                   to check aliveness of the connection.
                   For debug purposes the event is logged. */
                eventSource.addEventListener("keepalive", () => console.debug(`EventSourceMap.get() [${url}] - Event 'keepalive' received on event source '${url}'.`));
                
                /* The new event source is added to the map
                   of event soruces. */                
                eventSources.set(url, eventSource);
            }
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
    readonly domAgent: DOMAgent
    
    constructor(element: HTMLElement, domAgent: DOMAgent) {
        super(element, domAgent);

        const node = this.node,
              interval = node.interval;
        
        this.domAgent = domAgent;
        
        if (node.deferred) {
            this.callServer({eventBefore: "", eventAfter: ""});
        } else if (interval) {
            this._intervalID = setInterval(() => this.callServer({eventBefore: "update.before", eventAfter: "update.done"}), interval);
        } else if (node.event) {
            const eventSource = EventSourceMap.get(node);
            
            if (eventSource) {
                console.debug(`Component.constructor() [${this.node}] - Component is going to listen on event '${node.event}' at the event source '${node.eventSource}'.`);
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
    
    observerUpdate(updateDetail: string) {
        if (updateDetail.startsWith("enliwfen")) {
            if (updateDetail.endsWith(".after") || updateDetail.endsWith(".done")) {
                console.debug(`Component.observerUpdate() [${this.node}] - Got observer update ${updateDetail}. Component will be updated.`);
                this.callServer({eventBefore: "update.before", eventAfter: "update.done"});
            } else {
                super.observerUpdate(updateDetail);
            }
        } else {
            super.observerUpdate(updateDetail);
        }
    }
    
    handleEvent(event: Event) {
        if (event.type === this.node.event) {
            if (event instanceof MessageEvent && event.data) {
                console.debug(`Component.handleEvetn [${this.node}] - Got event data ${event.data}.`);
                try {
                    const jsonUpdates = JSON.parse(event.data);
                    this.domAgent.updateFromJson(jsonUpdates, this.node.element)
                } catch (error) {
                    console.warn(`Component.handleEvent() [${this.node}] - Error parsing expected JSON string : ${error}`);
                }
            } else {
                console.debug(`Component.handleEvent() [${this.node}] - Got event ${this.node.event}. Component will be updated.`);
                this.callServer({eventBefore: "update.before", eventAfter: "update.done"});
            }
        } else if (event.type.startsWith("enliwfen.") &&                
                   (event.type.endsWith(".after") || event.type.endsWith(".done"))) {
            /* TODO: Adding a component itsel to the observers list may leed to an
                     inifinite loop of updates!
                     As well there are chances of circular observer chains. */ 
            console.debug(`Component.handleEvent() [${this.node}] - Got event '{event.type}'. Component will be updated.`);
            this.callServer({eventBefore: "update.before", eventAfter: "update.done"});
        }
    }
    
}

class Form extends ServerInteractionFeature {
    
    constructor(element: HTMLElement, domAgent: DOMAgent) {
        super(element, domAgent);
        
        const node = this.node;
        
        if (node.deferred) {
            const {method, headers, timeout} = node;

            this.endpoint.call(method, headers, timeout);
        } else if (node.event !== null) {
            element.addEventListener(node.event, this);
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
    
    constructor(element: HTMLElement, domAgent: DOMAgent) {
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
                console.log(`Datalist.constructor() [${this.node}] - No datalist element with id '${datalistId}' given for feature node '${element}'.`);
            }
        } else {
            console.log(`Datalist.constructor() [${this.node}] - There is no event defined for feature node '${element}'.`);
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
                console.log(`Datalist.handleEvent() [${this.node}] - There is no filter pattern given in the feature node '${element}' for datalist updates.`);
            }
        }
    }
}

class FeatureFactory extends DOMAgent {
    
    replaceElement(this: FeatureFactory, target: HTMLElement, update: HTMLElement): void {
        console.debug(`FeatureFactroy.replaceElement() - New HTML element '${update.tagName}#${update.id}' is going to replace element '${target.tagName}#${target.id}'.`)

        /* Destroy all features of the target subtree. */
        for (const feature of Feature.features(target)) {
            feature.destroy();
        }

        /* Replace target with the update. */        
        target.replaceWith(update);
        
        /* Before creating the new features the existing ones
           are updated. */
        Feature.forEach(feature => feature.domUpdate());
        
        /* Now that the update has replaced the target
           the collected feature nodes can be created. */
        for (const featureElement of DOMQuery.featureElements(update)) {
            this.createFeature(featureElement);
        }
    }
    
    createFeature(this: FeatureFactory, element: HTMLElement) {
        console.debug(`FeatureFactory.createFeature() - Going to create feature for element '${element.tagName}#${element.id}'`);
        
        if (! Feature.get(element)) {
            switch (element.tagName) {
                case "A":
                case "SELECT":
                    new ActionCall(element, this);
                    break;
                    
                case "BUTTON":
                    if ("enliwfenToggle" in element.dataset || "enliwfenToggleClass" in element.dataset) {
                        new ToggleAction(element);
                    } else {
                        new ActionCall(element, this);
                    }
                    break;
                    
                case "FORM":
                    new Form(element, this);
                    break;
                    
                case "INPUT":
                    if (element.hasAttribute("list")) {
                        new Datalist(element, this);    
                    } else {
                        this.createFeatureFromDataset(element);
                    }
                    break;
                    
                case "DIALOG":
                    new Dialog(element as HTMLDialogElement);
                    break;
                     
                default:
                    this.createFeatureFromDataset(element);
            }
        }
    }
    
    createFeatureFromDataset(this: FeatureFactory, element: HTMLElement) {
        const dataset = element.dataset;
        
        if ("enliwfenUrl" in dataset) {
            new Component(element, this);
        } else if ("enliwfenToggle" in dataset || "enliwfenToggleClass" in dataset) {
            new ToggleAction(element);
        } else if ("enliwfenCheckboxGroup" in dataset  && element.tagName === "INPUT") {
            new CheckboxGroup(element);
        } else if ("enliwfenEventsource" in dataset) {
            EventSourceMap.get(new FeatureNode(element));
        } else if ("enliwfenActionIndicator" in dataset) {
            new ActionIndicator(element);
        }
    }
    
    destroyFeature(element: HTMLElement) {
        const feature = Feature.get(element);
        
        if (feature !== undefined) {
            feature.destroy();
        }
    }
    
    createFeatures() {
        for (const featureElement of DOMQuery.featureElements()) {
            this.createFeature(featureElement);
        }
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