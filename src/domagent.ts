import type { FeatureElement } from "./declarations";
import { enliwfen } from "./declarations";

/*
*/
export class DOMAgent {
    
    readonly parser = new DOMParser();

    static dispatchEvent(scope: HTMLElement, event: CustomEvent) {
        if (scope.classList.contains(enliwfen)) {
            scope.dispatchEvent(event);
        }

        for (const element of scope.getElementsByClassName(enliwfen)) {
            element.dispatchEvent(event);
        }
    }
    
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
        console.debug(`DOMAgent.replaceElement() - New HTML element '${update.tagName}#${update.id}' is going to replace element '${target.tagName}#${target.id}'.`)

        /* Replace target with the update. */        
        target.replaceWith(update);
    }
    
    // private isTarget(this: DOMAgent, targetCandidate: HTMLElement, update: HTMLElement): boolean {
    //     if (update instanceof HTMLFormElement && targetCandidate instanceof HTMLFormElement) {
    //         /* Both elements are form elements. They are swappable if they
    //            have the same action and the same method.
    //            Remind that even wizards can be bound to the same
    //            action path. */
    //         return update.action === targetCandidate.action && update.method === targetCandidate.method;
    //     }

    //     if (update instanceof HTMLLinkElement && targetCandidate instanceof HTMLLinkElement) {
    //         /* Links are swappable without any further constraints, so far. */
    //         return true;
    //     }

    //     if (targetCandidate.tagName !== update.tagName) {
    //         /* The tag name of the target candidate is different to
    //            the tag name of the update element. */
    //         return false;
    //     }

    //     if ("enliwfenSwappable" in targetCandidate.dataset || "enliwfenUpdatable" in targetCandidate.dataset) {
    //         /* The target candidate and the update element have the same
    //            tag name. Further the target candidate is marked as swappable
    //            and/or updatable. The update can be applied to the target
    //            candidate. */
    //         return true;
    //     }
        
    //     return false;
    // }

    private getTarget(this: DOMAgent, update: HTMLElement, targetCandidate: HTMLElement | null): HTMLElement | null {
        let target = null;

        if (update.id) {
            /* The update element has an id. */
            if (targetCandidate?.id == update.id) {
                /* The element of the source node has the same id
                    as the update element. The target candidate
                    will be the target of the update. */
                target = targetCandidate;
            } else {
                /* The source node does not match the update.
                    An element with the same id is looked up
                    in the active document.
                    If no element matches the id, the result
                    will be the target candidate, if given,
                    or 'null'. */
                target = document.getElementById(update.id) || targetCandidate;
            }
        } else if (targetCandidate /* && this.isTarget(targetCandidate, update) */) {
            /* The update node does not have an id. The element of the
                source node can act as target for the update.
                TODO: Integrate method 'isTarget()' into the check, in order
                to get more control over replacements. */
            target = targetCandidate;
        }

        return target;
    }

    updateFromHtml(this: DOMAgent, htmlString: string, domTarget?: FeatureElement): void {
        /* The HTML string is parsed into a new document. */
        const document_update = this.parser.parseFromString(htmlString, "text/html"),
              body_update = document_update.body;

        if (body_update.id
            && body_update.id === document.body.id
            && document.body.dataset.enliwfenSwappable !== undefined) {
            /* The update refers to the body of the document. The body
               of the document is replaced. */
            console.log(`DOMAgent.updateFromHtmlString() - Going to replace the body of the document.`);

            try {
                this.replaceElement(document.body, body_update);
            } catch(error) {
                console.log(`DOMAgent.updateFromHtmlString() - Error replacing the body of the document (${error}).`);
            }
        } else {
            /* The body of the document update contains updates
               of specific parts of the document. The children
               collection of the body element is live updated. Therefore looping over
               the children collection and removing elements from it at the same time
               is'nt a good idea. Therefore the children are referenced in a separate
               list, which is then used to loop over the updates.
               TODO: Maybe looping as long as the children collection
                     is not empty is an alternative approach. */
            const updates = [...document_update.body.children],
                targetCandidate = domTarget || null;
            
            for (const update of updates) {
                if (update instanceof HTMLElement) {
                    console.log(`DOMAgent.updateFromHtmlString() - Going to merge the update '${update.tagName}[${update.id}]'.`)
                    
                    const target = this.getTarget(update, targetCandidate);
                                    
                    if (target !== null) {
                        /* There is a target element on which the update
                        can be applied. */
                        try {
                            this.replaceElement(target, update);
                        } catch(error) {
                            console.log(`DOMAgent.updateFromHtmlString() - Error merging the update '${update.tagName}[${update.id}]' (${error}).`)
                        }
                    } else {
                        /* No element of the active document can be
                            identified as a target for the update.
                            The update is discarded. */
                        console.info(`DOMAgent.updateFromHtmlString() - No target found for the update '${update.tagName}[${update.id}]'`);
                    }
                }
            }        
        }            
    }
    
    updateFromJson(this: DOMAgent, json: any, domTarget?: FeatureElement): void {
        if (json.result) {
            this.updateFromHtml(json.result, domTarget);
        }
        
        if (json.updates instanceof Object) {
            for (const [id, updateString] of Object.entries(json.updates)) {
                if (typeof id === "string" && typeof updateString === "string") {
                    this.updateFromHtml(updateString, document.getElementById(id));
                }
            }
        }
    }
    
    showError(this: DOMAgent, htmlString: string, domTarget?: FeatureElement): void {
        if (htmlString.startsWith("<!DOCTYPE") || htmlString.startsWith("<!doctype") || htmlString.startsWith("<html")) {
            DOMAgent.openErrorDialog(htmlString);
        } else {
            this.updateFromHtml(htmlString, domTarget);
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
