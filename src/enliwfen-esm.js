/*
 Import morphdom used to merge returned document fragments
 into the live document.
 The import requires an import map as described for example
 here : https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
 */
import morphdom from "morphdom"

const version = "0.1.0"
const elementMap = new Map()

/*
 A feature node wraps an element intended
 to be enlivened. It provides the properties
 taken from the elements itself and the 
 data-enliwfen-* attributes, respectively.
 */
class FeatureNode {
    
    constructor(element) {
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
                    return element.href;
                
                case "BUTTON":
                case "INPUT":
                    return element.dataset.enliwfenUrl || element.formAction;
                
                case "FORM":
                    return element.action;
                
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
                    return this.deferred ? "GET" : element.method
                
                case "BUTTON":
                case "INPUT":
                    return element.formMethod || element.dataset.enliwfenMethod || "GET"
                    
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
            let target = element;
            
            if (element.dataset.enliwfenTarget) {
                target = document.querySelector(element.dataset.enliwfenTarget);
            }
            
            this._target = target;            
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
    
    get observers() {
        if (this._observers === undefined) {
            const observers = this.dataset.enliwfenObservers;
            
            this._observers = observers ? observers : null;
        }
        
        return this._observers;
    }
    
    dispatchEvent(eventType) {
        this.element.dispatchEvent(new CustomEvent(eventType));
    }
}

/*
*/
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
               the collected feature nodes can be created.
               After the features are created and therefore present
               their observers */
            featureNodes.forEach(node => FeatureFactory.createFeature(node));
            featureNodes.forEach(node => {
                const feature = elementMap.get(node);
                
                if (feature) {
                    feature.addObservers();
                }
            });
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
    
    static showError(data) {
        /* Create the elements used to build the error dialog
           and to present the error page. */
        const errorContainer = document.createElement("div"),
              shadowRoot = errorContainer.attachShadow({mode: "open"}),
              errorDialog = document.createElement("dialog"),
              closeButton = document.createElement("button"),
              errorPage = document.createElement("iframe"),
              body = document.body;

        /* Configure the error page and set the data */        
        errorPage.setAttribute("sandbox", "");        
        errorPage.setAttribute("style", "width: 100%; height: 100%")
        errorPage.setAttribute("srcdoc", data);
        
        /* Configure the close button */
        closeButton.appendChild(document.createTextNode("X"));
        closeButton.setAttribute("autofocus", "");
        closeButton.setAttribute("style", "display: block; width: 2rem; border: 0; float: right; font-size: 2rem;");
        
        /* On click close the error dialog */
        closeButton.addEventListener("click", () => errorDialog.close());

        /* Configure the error dialog and append the
           close button and the iframe. */
        errorDialog.setAttribute("style", "width: 75vw; height:75vh;");
        errorDialog.appendChild(closeButton);
        errorDialog.appendChild(errorPage);
        
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
    
    static createError(response) {
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

        DOMHelper.showError(errorDocument);
    }

}

class Endpoint {
    
    static getMimeType(response) {
        const contentType = response.headers.get("Content-Type"),
              parameterIndex = contentType.indexOf(";");
              
        return parameterIndex === -1 ?
            contentType
            : contentType.substring(0, parameterIndex);
    }
    
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
        const mimeType = Endpoint.getMimeType(response),
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
                    DOMHelper.createError(response);
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
                            
                        default:
                            DOMHelper.createError(response);
                    }
                }
            } catch (error) {
                console.error(`Failed to read the stream from ${this.node.url} ({error})`)
            }
        } /* endif (response.headers.has("Content-Length")) */
    }
    
    async failed(response) {
        const target = this.node.target;
        
        switch(Endpoint.getMimeType(response)) {            
            case "application/json":
                DOMHelper.mergeFromJson(target, await response.json());
                break;
                
            case "text/html":
                DOMHelper.merge(target, await response.text());
                break;
                
            default:
                DOMHelper.createError(response);
        }
    }
    
    async fetched(response) {
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
                   the reurned information is handled like the
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
                        DOMHelper.showError(await response.text());
                        break;
                        
                    default:
                        DOMHelper.createError(response);
                }
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
        
        switch(element.tagName) {
            case "FORM":
                if (method.toLowerCase() === "post") {
                    requestOptions.body = new FormData(element);
                }
                break;
                
            case "BUTTON":
            case "INPUT":
            case "SELECT":
                /* A request body with form data will be added, if the
                   the element belongs to a form and the HTTP method
                   is set to 'post'. */
                if (element.form && (method.toLowerCase() === "post")) {
                    requestOptions.body = new FormData(element.form);
                }
                break;
        }
    
        await this.fetched(await fetch(url, requestOptions));
    }

}

class Feature {
    
    constructor(element) {
        this._node = new FeatureNode(element);
        this._observations = new Map();
    }
    
    get node() {
        return this._node;
    }
        
    startObserving(element, events) {
        events.forEach(event => element.addEventListener(event, this));    
        this._observations.set(element, events);
    }
    
    stopObserving(element) {
        const events = this._observations.get(element);
        
        if (events) {
            events.forEach(event => element.removeEventListener(event, this));
            this._observations.delete(element);
        }
    }
    
    addObservers() {}
    
    removeObservers() {
        const {element, observers} = this.node;
        
        if (observers) {
            document.querySelectorAll(observers).forEach(observerElement => {
                const feature = elementMap.get(observerElement);
                
                if (feature) {
                    feature.stopObserving(element);
                }
            })
        }
    }
    
    destroy() {
        const {element, event} = this.node;
        
        this.removeObservers();
        
        this._observations.entries().forEach(entry => {
            entry[0].removeEventListener(entry[1], this);    
        });
        this._observations.clear();
        
        element.removeEventListener(event, this);
        elementMap.delete(element);
    }
}

class ToggleAction extends Feature {
    
    constructor(element) {
        super(element);
        
        this._open = 0;
        
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
        } else if (event.type.startsWith("enliwfen.")) {
            if (event.type.endsWith(".before")) {
                if (this._open === 0) {
                    this.trigger();
                }
                
                this._open += 1
            } else if (event.type.endsWith(".done")) {
                this._open -= 1;
                
                if (this._open === 0) {
                    this.trigger();
                }
            }
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

class Dialog extends Feature {
    
    constructor(element) {
        const dismissButtons = element.querySelectorAll("[data-enliwfen-dismissdialog]");
        
        super(element);
        
        dismissButtons.forEach(button => button.addEventListener("click", () => element.close()));
        
        if (element.dataset.enliwfenDialogstatus === "open") {
            element.showModal();
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
    
    addObservers() {
        const {element, observers} = this.node;
        
        if (observers) {
            document.querySelectorAll(observers).forEach(observerElement => {
                const feature = elementMap.get(observerElement);
                
                if (feature) {
                    feature.startObserving(element, ["enliwfen.action.before", "enliwfen.action.done"]);
                }
            });
        }
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
            }

            elementMap.set(element, this);
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
        } else if (event.type === "enliwfen.submission.after") {
            console.debug(`Got event 'enliwfen.submission.after'. Component will be updated.`);
            this.callServer({eventBefore: "update.before", eventAfter: "update.done"});
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

    addObservers() {
        const {element, observers} = this.node;
        
        if (observers) {
            document.querySelectorAll(observers).forEach(observerElement => {
                const feature = elementMap.get(observerElement);
                
                if (feature) {
                    feature.startObserving(element, ["enliwfen.submission.after"]);
                }
            });
        } 
    }
    
    handleEvent(event) {
        if (event.type === this.node.event) {
            event.preventDefault();
            this.callServer({eventBefore: "submission.before", eventAfter: "submission.after"});
        }
    }
    
}

class Datalist extends Feature {
    
    constructor(element) {
        super(element);
        
        this._datalist = undefined;
        this._scheduled = undefined;
        this._lastMatch = undefined;
        
        const datalistElement = document.querySelector(`#${element.getAttribute("list")}`);
        
        if (datalistElement !== null) {
            this._datalist = new Component(datalistElement);
            element.addEventListener(this.node.event, this);
        }
    }
    
    handleEvent(event) {
        const datalist = this._datalist;
        
        if ((datalist !== undefined) && (event.type == this.node.event)) {
            const {element, dataset} = this.node,
                  matches = element.value.match(dataset.enliwfenPattern);
            
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
        }
    }
}

class FeatureFactory {
    
    static createFeatureFromDataset(element) {
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
    
    static createFeature(element) {
        if (! elementMap.has(element)) {
            switch (element.tagName) {
                case "A":
                case "BUTTON":
                case "SELECT":
                    new ActionCall(element);
                    break;
                    
                case "FORM":
                    new Form(element);
                    break;
                    
                case "INPUT":
                    if (element.hasAttribute("list")) {
                        new Datalist(element);    
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
        
        elementMap.values().forEach(feature => feature.addObservers())
    }
}


class Enliwfen {
    static version() {
        return version;
    }    
}

FeatureFactory.createFeatures();

export default Enliwfen;