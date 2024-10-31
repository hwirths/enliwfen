/* Import morphdom used to merge returned document fragments
 * into the live document.
 * The import requires an import map as described for example
 * here : https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
 */
import morphdom from "morphdom"


class Enliwfen {
    
    /* Base representation of an enlivened element
     */
    static EnliwfenedElement = class {
        constructor(element) {
            this._element = element;
        }
        
        get element() {
            return this._element;
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
                        return element.method
                    
                    default:
                        return element.dataset.enliwfenMethod || "GET"
                }
            }
            
            return this._method
        }
        
        merge(result) {
            const element = this._element;
            let target = element;
            
            if (element.dataset.enliwfenTarget) {
                target = document.querySelector(element.dataset.enliwfenTarget);
            }
            
            morphdom(target, result);
            Enliwfen.update(target);
        }

        async succeeded(response) {
            switch(response.headers.get("Content-Type")) {
                case "application/json":
                    const data = await response.json();
                    
                    if (data.assign_location) {
                        location.assign(data.assign_location)
                    } else if (data.replace_location) {
                        location.replace(data.replace_location)
                    } else {
                        this.merge(data.result);
                    }
                    break;
                    
                case "text/html":
                    const result = await response.text();
                    this.merge(result);
                    break;
            }
        }
        
        async failed(response) {
            switch(response.headers.get("Content-Type")) {
                case "application/json":
                    const data = await response.json();
                    this.merge(data.result);
                    break;
                    
                case "text/html":
                    const result = await response.text();
                    this.merge(result);
                    break;
            }
        }
        
        async fetch() {
            const element = this._element,
                  dataset = element.dataset,
                  {url, method} = this,
                  headers = dataset.enliwfenHeaders,
                  requestOptions = {method: method};
                  
            if (headers) {
                requestOptions.headers = JSON.parse(headers);
            }
            
            if (element.tagName === "FORM") {
                requestOptions.body = new FormData(element)
            }
        
            const response = await fetch(url, requestOptions);

            switch(response.status) {
                case 200:
                case 201:
                    this.succeeded(response);
                    break;
                                
                case 205:
                    location.reload();
                    break;
                    
                case 500:
                    this.failed(response);
                    break;
            }
        }
    } /* classs Element */
    
    static Action = class extends Enliwfen.EnliwfenedElement {
        constructor(element) {
            super(element);
        }
    
        async trigger() {
            const element = this.element;

            element.dispatchEvent(new CustomEvent("enliwfen.action.before"))
            await this.fetch();        
            element.dispatchEvent(new CustomEvent("enliwfen.action.done"));
        }   
         
        handleEvent(event) {
            switch (event.type) {
                case "click":
                    event.preventDefault();
                    event.stopPropagation();
                    this.trigger();
                    break;
            }
        }
    }
    
    static get actions() {
        if (this._actions === undefined) {
            this._actions = new Map();
        }
        
        return this._actions;
    }
    
    static newAction(element) {
        const actions = this.actions;
        
        if (actions.get(element) === undefined) {
            const action = new Enliwfen.Action(element);

            element.addEventListener("click", action);
            actions.set(element, action);
        }
        
    }
    
    static Component = class extends Enliwfen.EnliwfenedElement {
        constructor(element) {
            super(element);
        }
        
        async update() {
            const element = this.element;
            
            element.dispatchEvent(new CustomEvent("enliwfen.update.before"));
            await this.fetch();
            element.querySelectorAll(".enliwfen").forEach(element => {
                console.log(element);
                
                switch (element.tagName) {
                    case "A":
                    case "BUTTON":
                        this.newAction(element);
                        break;
                        
                    case "FORM":
                        this.newForm(element);
                        break;
                        
                    default:
                        this.newComponent(element);
                }
            });
            element.dispatchEvent(new CustomEvent("enliwfen.update.done"));
        }
    }
    
    static get components() {
        if (this._components === undefined) {
            this._components = new Map();
        }
        
        return this._components;
    }
    
    static newComponent(element) {
        const components = this.components;
        
        if (components.get(element) === undefined) {
            const dataset = element.dataset,
                  component = new Enliwfen.Component(element);
            
            if ("enliwfenDeferred" in dataset) {
                component.update();
            }
            
            if (dataset.enliwfenInterval) {
                setInterval(() => component.update(), dataset.enliwfenInterval);
            }
            
            components.set(element, component);
        }
    }
    
    static Form = class extends Enliwfen.EnliwfenedElement {
        constructor(element) {
            super(element);
        }
        
        async load() {
            const response = await fetch(this.element.action),
                  result = await response.text();
                  
            this.merge(result);
        }
        
        async submit() {
            const element = this.element;
            
            element.dispatchEvent(new CustomEvent("enliwfen.submission.before"));
            await this.fetch();
            element.dispatchEvent(new CustomEvent("enliwfen.submission.done"));  
        }
        
        handleEvent(event) {
            switch(event.type) {
                case "submit":
                    event.preventDefault();
                    this.submit();
                    break;
            }
        }
    }
    
    static get forms() {
        if (this._forms === undefined) {
            this._forms = new Map();
        }
        
        return this._forms;
    }

    static async newForm(element) {
        const forms = this.forms;
        
        if (forms.get(element) === undefined) {
            const form = new Enliwfen.Form(element),
                  dataset = element.dataset;
            
            if ("enliwfenDeferred" in dataset) {
                await form.load();
            }
            
            element.addEventListener("submit", form);
            forms.set(element, form);
        }
    }
    
    static newElement(element) {
        console.log(element);
        
        switch (element.tagName) {
            case "A":
            case "BUTTON":
                this.newAction(element);
                break;
                
            case "FORM":
                this.newForm(element);
                break;
                
            default:
                this.newComponent(element);
        }
    }
    
    static update(target) {
        target.querySelectorAll(".enliwfen").forEach(element => this.newElement(element));        
    }
    
    static init() {
        for (const element of document.getElementsByClassName("enliwfen")) {
            this.newElement(element);
        }
    }
}

Enliwfen.init();

export default Enliwfen;