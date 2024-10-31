import morphdom from "morphdom"

class Enliwfen {
    
    static getUrl(element) {
        switch(element.tagName) {
            case "A":
            return element.href;
            
            case "BUTTON":
            return element.getAttribute("formaction") || element.dataset.enliwfenUrl
            
            default:
            return element.dataset.enliwfenUrl;
        }
    }
    
    static async fetch(element) {
        const dataset = element.dataset,
              url = this.getUrl(element), // element.tagName === "A" ? element.href : dataset.enliwfenUrl,
              headers = dataset.enliwfenHeaders,
              requestOptions = {method: dataset.enliwfenMethod || "GET"};
              
        if (headers) {
            requestOptions.headers = JSON.parse(headers);
        }
    
        return fetch(url, requestOptions);
    }

    static async morphResult(result, element) {
        let target = element;
        
        if (element.dataset.enliwfenTarget) {
            target = document.querySelector(element.dataset.enliwfenTarget);
        }
        
        morphdom(target, result);
        
        target.querySelectorAll(".enliwfen").forEach(element => {
            console.log(element);
            
            switch (element.tagName) {
                case "A":
                case "BUTTON":
                    this.newAction(element);
                    break;
                    
                case "FORM":
                    /* tbd */
                    break;
                    
                default:
                    this.newComponent(element);
            }
        });
    }
    
    static async processCall(element) {
        const response = await this.fetch(element);
        let data;
        
        switch(response.status) {
            case 200:
            case 201:
                data = await response.json();
                
                if (data.assign_location) {
                    location.assign(data.assign_location)
                } else if (data.replace_location) {
                    location.replace(data.replace_location)
                } else {
                    this.morphResult(data.result, element);
                }
                break;
                            
            case 205:
                location.reload();
                break;
                
            case 500:
                data = await response.json();
                this.morphResult(data.result, element);
                break;
        }
    }
    
    static Action = class {
        constructor(element) {
            this._element = element;            
        }
    
        async process() {
            const element = this._element;

            element.dispatchEvent(new CustomEvent("enliwfen.action.before"))
            await Enliwfen.processCall(element);        
            element.dispatchEvent(new CustomEvent("enliwfen.action.done"));
        }   
         
        handleEvent(event) {
            switch (event.type) {
                case "click":
                event.preventDefault();
                event.stopPropagation();
                this.process();
                break;
            }
        }
    }
    
    static actions() {
        if (this._actions === undefined) {
            this._actions = new Map()
        }
        
        return this._actions
    }
    
    static newAction(element) {
        const actions = this.actions()
        
        if (actions.get(element) === undefined) {
            const action = new Enliwfen.Action(element);

            element.addEventListener("click", action);
            actions.set(element, action);
        }
        
    }
    
    static Component = class {
        constructor(element) {
            this._element = element;
        }
        
        async update() {
            const element = this._element;
            
            element.dispatchEvent(new CustomEvent("enliwfen.update.before"));
            await Enliwfen.processCall(element);
            element.dispatchEvent(new CustomEvent("enliwfen.update.done"));
        }
    }
    
    static newComponent(element) {
        const dataset = element.dataset,
              component = new Enliwfen.Component(element);
        
        if ("enliwfenDeferred" in dataset) {
            component.update();
        }
        
        if (dataset.enliwfenInterval) {
            setInterval(() => component.update(), dataset.enliwfenInterval);
        }
    }
    
    static Form = class {
        constructor(element) {
            this._element = element            
        }
        
        async submit() {
            const element = this._element,
                  formData = new FormData(element),
                  response = await fetch(element.action, {
                    method: element.method,
                    body: formData
                  }),
                  result = await response.text();
                  
            Enliwfen.morphResult(result, element);
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
    
    static async newForm(element) {
        const form = new Enliwfen.Form(element),
              dataset = element.dataset;
        
        if ("enliwfenDeferred" in dataset) {
            const response = await fetch(element.action),
                  result = await response.text();
            
            Enliwfen.morphResult(result, element);                
        }
        
        element.addEventListener("submit", form); 
    }
    
    static init() {
        for (const element of document.getElementsByClassName("enliwfen")) {
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
    }
}

Enliwfen.init();

export default Enliwfen;