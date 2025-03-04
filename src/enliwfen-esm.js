/* Import morphdom used to merge returned document fragments
 * into the live document.
 * The import requires an import map as described for example
 * here : https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
 */
import morphdom from "morphdom"

const version = "0.1.0"
const elementMap = new Map()

class FeatureNode {
    
    constructor(element) {
        this._element = element;
        this._dataset = element.dataset;
    }
    
    get element() {
        return this._element;
    }
    
    get dataset() {
        return this._dataset;
    }
    
    get url() {
        if (this._url === undefined) {
            const element = this._element;
            
            switch(element.tagName) {
                case "A":
                    return element.href;
                
                case "BUTTON":
                    return element.getAttribute("formaction") || element.dataset.enliwfenUrl
                
                case "FORM":
                    return element.action
                
                default:
                    return element.dataset.enliwfenUrl;
            }
        }
        
        return this._url            
    }
    
    get method() {
        if (this._method === undefined) {
            const element = this._element;
            
            switch(element.tagName) {
                case "FORM":
                    return this.deferred ? "GET" : element.method
                
                default:
                    return element.dataset.enliwfenMethod || "GET"
            }
        }
        
        return this._method
    }
    
    get headers() {
        if (this._headers === undefined) {
            const headers = this.dataset.enliwfenHeaders;
            
            this._headers = headers ? JSON.parse(headers) : null;
        }
        
        return this._headers
    }
    
    get target() {
        if (this._target === undefined) {
            const element = this._element;
            let target = element;
            
            if (element.dataset.enliwfenTarget) {
                target = document.querySelector(element.dataset.enliwfenTarget);
            }
            
            this._target = target;            
        }
        
        return this._target;
    }
    
    get targets() {
        if (this._targets === undefined) {
            const element = this._element;
            let targets;
            
            if (element.dataset.enliwfenTargets) {
                targets = document.querySelectorAll(element.dataset.enliwfenTargets);
            } else {
                targets = [this.target]
            }
            
            this._targets = targets;
        }
        
        return this._targets;
    }
    
    get event() {
        if (this._event === undefined) {
            const event = this.dataset.enliwfenEvent;
            
            if (event !== undefined) {
                this._event = event;
            } else if (this.element.tagName === "FORM") {
                this._event = "submit";
            } else if (this.element.tagName === "INPUT") {
                this._event = "change";
            } else {
                this._event = "click";
            }
        }
        
        return this._event;
    }
    
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
        
        return interval ? interval : null;
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
    
    dispatchEvent(eventType) {
        this.element.dispatchEvent(new CustomEvent(eventType));
    }
}

class DOMHelper {
    
    static merge(target, contents) {
        if (target !== null) {
            const featureNodes = []
            
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
            morphdom(target, contents, {
                onNodeAdded: (node) => {
                    if (node.classList && node.classList.contains("enliwfen")) {
                        console.debug("Add node %o", node);
                        /* A feature node. Add it to the list of feature
                           nodes. They are created after finishing the merge. */
                        featureNodes.push(node);
                    }
                },
                onBeforeElUpdated: (fromElement, toElement) => {
                    if (fromElement.classList.contains("enliwfen")) {
                        /* Remove the feature, if the new element either
                         * has a different ID or different 'enliwfen' settings. */
                        if (fromElement.id !== toElement.id) {
                            console.debug("Update needed due to different id! %o : %o", fromElement, toElement);
                            FeatureFactory.destroyFeature(fromElement);
                        } else {
                            for (const attribute of fromElement.attributes) {
                                if (attribute.name.startsWith("data-enliwfen")
                                    && attribute.value !== toElement.getAttribute(attribute.name)) {
                                    console.debug("Update needed due to different enliwfen settings! %o : %o", fromElement, toElement);
                                    FeatureFactory.destroyFeature(fromElement);
                                    break;
                                }
                            }
                        }
                    }
                },
                onElUpdated: (element) => {
                    if (element.classList.contains("enliwfen")) {
                        /* The element has been updated. Add the element
                           to the list of feature nodes. They are craeted
                           after finishing the merge. */
                        featureNodes.push(element)                        
                    }
                },
                onNodeDiscarded: (node) => {
                    if (node.classList && node.classList.contains("enliwfen")) {
                        console.debug("Remove node %o", node);
                        FeatureFactory.destroyFeature(node);
                    }
                }
            });
            
            /* Now that the updates have been merged into the document
               the collected feature nodes can be created. */
            featureNodes.forEach(node => FeatureFactory.createFeature(node));
        }
    }
    
    static mergeFromJson(target, data) {
        if (data.result && target !== null) {
            this.merge(target, data.result);
        }
        
        if (data.updates instanceof Object) {
            for (const [id, update] of Object.entries(data.updates)) {
                const target = document.getElementById(id);
                
                this.merge(target, update);
            }
        }
    }

}

class Endpoint {
    
    /*
     * @param node An instance of class FeatureNode
     */
    constructor(node) {
        this._node = node;
    }
    
    get node() {
        return this._node;
    }
    
    async succeeded(response) {
        const contentType = response.headers.get("Content-Type"),
              parameterIndex = contentType.indexOf(";"),
              mimeType = parameterIndex === -1 ? contentType : contentType.substring(0, parameterIndex),
              target = this.node.target;
              
        if (response.headers.has("Content-Length")) {
            switch(mimeType) {
                case "application/json":
                    const jsonResponse = await response.json();
                    
                    if (jsonResponse.assign_location) {
                        location.assign(jsonResponse.assign_location);
                    } else if (jsonResponse.replace_location) {
                        location.replace(jsonResponse.replace_location);
                    } else {
                        DOMHelper.mergeFromJson(target, jsonResponse);
                    }
                    break;
                
                case "text/html":
                    DOMHelper.merge(target, await response.text());
                    break;
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
                                        DOMHelper.mergeFromJson(target, jsonUpdate)
                                    } catch (error) {
                                        console.warn(`Error parsing expected JSON string : ${error}`);
                                    }
                                } else {
                                    DOMHelper.merge(target, currentUpdate);    
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
                                DOMHelper.mergeFromJson(target, jsonResponse);
                            }
                            break;
                        
                        case "text/html":
                            DOMHelper.merge(target, remainingText);
                            break;
                    }
                }
            } catch (error) {
                console.error(`Failed to read the stream from ${this.node.url} ({error})`)
            }
        } /* endif (response.headers.has("Content-Length")) */
    }
    
    async failed(response) {
        const target = this.node.target;
        
        switch(response.headers.get("Content-Type")) {            
            case "application/json":
                DOMHelper.mergeFromJson(target, await response.json());
                break;
                
            case "text/html":
                DOMHelper.merge(target, await response.text());
                break;
        }
    }
    
    async fetched(response) {
        switch(response.status) {
            case 200:
            case 201:
                await this.succeeded(response);
                break;
                            
            case 205:
                location.reload();
                break;
                
            case 500:
                /* An internal server error should
                 * be reported to a corresponding
                 * location on the page. */
                await this.failed(response);
                break;
        }
    }

    /*
     * @param node An instance of class FeatureNode
     */
    async call() {
        const {element, url, method, headers} = this.node,
              requestOptions = {method: method};
              
        if (headers) {
            requestOptions.headers = headers;
        }
        
        if (element.tagName === "FORM" && method.toLowerCase() === "post") {
            requestOptions.body = new FormData(element)
        }
    
        await this.fetched(await fetch(url, requestOptions));
    }

}

class Feature {
    
    constructor(element) {
        this._node = new FeatureNode(element);
    }
    
    get node() {
        return this._node;
    }
    
    destroy() {
        const {element, event} = this.node;
        
        element.removeEventListener(event, this);
        elementMap.delete(element);
    }
}

class ToggleAction extends Feature {
    
    constructor(element) {
        super(element);
        
        
        element.addEventListener(this.node.event, this);
        elementMap.set(element, this);
    }
    
    get node() {
        return this._node;
    }
    
    trigger() {
        const {toggleAttribute, toggleClass, targets} = this.node;

        if (toggleAttribute) {
            targets.forEach(target => target.toggleAttribute(toggleAttribute));
        } else if (toggleClass) {
            targets.forEach(target => target.classList.toggle(toggleClass));
        }
    }
    
    handleEvent(event) {
        if (event.type == this.node.event) {
            this.trigger();
        }
    }
}

class CheckboxGroup extends Feature {
    
    constructor(element) {
        super(element);
        
        
        const node = this.node,
              groupName = node.checkboxGroup,
              selector = `input[type='checkbox'][name='${groupName}']`;
              
        let checkboxes;      
        
        if (element.form) {
            checkboxes = element.form.querySelectorAll(selector);
        } else {
            checkboxes = document.querySelectorAll(selector);
        }

        element.addEventListener(node.event, this);
        checkboxes.forEach(checkbox => checkbox.addEventListener("change", this));
        elementMap.set(element, this);
        
        this._checkboxes = checkboxes;
    }
    
    get checkboxes() {
        return this._checkboxes;
    }
    
    destroy() {
        this.checkboxes.forEach(checkbox => checkbox.removeEventListener("change", this));
        
        super.destroy();
    }
    
    handleEvent(event) {
        const element = this.node.element,
              currentTarget = event.currentTarget;
              
        if (currentTarget === element && event.type === this.node.event) {
            const newStatus = element.checked;
            
            this.checkboxes.forEach(checkbox => checkbox.checked = newStatus);
        } else if (currentTarget !== element && event.type === "change") {
            if (!currentTarget.checked && element.checked){
                element.checked = false;
            } else if (!element.checked && Array.prototype.every.call(this.checkboxes, checkbox => checkbox.checked)) {
                element.checked = true;
            }
        }
    }
    
}

class ServerInteractionFeature extends Feature {
    
    constructor(element) {
        super(element);

        this._endpoint = new Endpoint(this._node);
    }
    
    get endpoint() {
        return this._endpoint;
    }
    
    async callServer({eventBefore, eventAfter} = {}) {
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
    
    constructor(element) {
        super(element);
        
        this.node.element.addEventListener(this.node.event, this);
        elementMap.set(element, this);
    }
    
    handleEvent(event) {
        if (event.type === this.node.event) {
            event.preventDefault();
            event.stopPropagation();
            this.callServer({eventBefore: "action.before", eventAfter: "action.done"});
        }
    }
}

class EventSourceMap {
        
    static get(node) {
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
    
    find(node) {
        return this._eventSources.get(node.eventSource);
    }
}

class Component extends ServerInteractionFeature {
    
    constructor(element) {
        super(element);

        const node = this.node,
              interval = node.interval;
        
        if (node.deferred) {
            this.callServer();
        } else if (interval) {
            this._intervalID = setInterval(() => this.callServer({eventBefore: "update.before", eventAfter: "update.done"}), interval);
            elementMap.set(element, this);
        } else if (node.event) {
            const eventSource = EventSourceMap.get(node);
            
            if (eventSource) {
                eventSource.addEventListener(node.event, this);
                this._eventSource = eventSource;
                elementMap.set(element, this);
            }
        }
    }
    
    destroy() {
        if (this._intervalID !== undefined) {
            clearInterval(this._intervalID);
        }
        
        if (this._eventSource !== undefined) {
            const eventSource = EventSourceMap.find(this.node);
            
            if (eventSource !== undefined) {
                eventSource.removeEventListener(this.node.event, this);
            }
        }
        
        super.destroy()
    }
    
    handleEvent(event) {
        if (event.type === this.node.event) {
            if (event.data) {
                console.debug(`Got event data ${event.data}.`);
                try {
                    const jsonUpdates = JSON.parse(event.data);
                    DOMHelper.mergeFromJson(null, jsonUpdates)
                } catch (error) {
                    console.warn(`Error parsing expected JSON string : ${error}`);
                }
            } else {
                console.debug(`Got event ${this.node.event}. Component will be updated.`);
                this.callServer({eventBefore: "update.before", eventAfter: "update.done"});
            }
        }
    }
    
}

class Form extends ServerInteractionFeature {
    
    constructor(element) {
        super(element);
        
        const node = this.node;
        
        if (node.deferred) {
            this.endpoint.call();
        } else {
            element.addEventListener(node.event, this);
        }
        
        elementMap.set(element, this);
    }

    handleEvent(event) {
        if (event.type === this.node.event) {
            event.preventDefault();
            this.callServer({eventBefore: "submission.before", eventAfter: "submission.after"});
        }
    }
    
}


class FeatureFactory {
    
    static createFeature(element) {
        if (! elementMap.has(element)) {
            switch (element.tagName) {
                case "A":
                case "BUTTON":
                    new ActionCall(element);
                    break;
                    
                case "FORM":
                    new Form(element);
                    break;
                    
                default:
                    const dataset = element.dataset;
                    
                    if ("enliwfenUrl" in dataset) {
                        new Component(element);
                    } else if ("enliwfenToggle" in dataset || "enliwfenToggleClass" in dataset) {
                        new ToggleAction(element);
                    } else if ("enliwfenCheckboxGroup" in dataset  && element.tagName === "INPUT") {
                        new CheckboxGroup(element);
                    } else if ("enliwfenEventsource" in dataset) {
                        EventSourceMap.get(new FeatureNode(element));
                    }
            }
        }
    }
    
    static destroyFeature(element) {
        const feature = elementMap.get(element);
        
        if (feature !== undefined) {
            feature.destroy();
        }
    }
    
    static createFeatures() {
        for (const element of document.getElementsByClassName("enliwfen")) {
            this.createFeature(element);
        }
    }
}


class Enliwfen {
    static version() {
        return version;
    }    
}

FeatureFactory.createFeatures();

export default Enliwfen;