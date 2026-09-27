import type { DOMAgentInterface } from "./declarations";
import type { FeatureNode } from "./featurenode";


export class Endpoint {
    node: FeatureNode
    domAgent: DOMAgentInterface
    
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
    constructor(node: FeatureNode, domAgent: DOMAgentInterface) {
        this.node = node;
        this.domAgent = domAgent;
    }
    
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
                    const headers = response.headers;
                                        
                    if (headers.has("Content-Disposition")) {
                        const filenames = headers.get("Content-Disposition")?.split(";").filter(e => e.trimStart().startsWith("filename"));
                        
                        if ((filenames !== undefined) && filenames.length) {
                            const content = await response.blob(),
                                contentURL = URL.createObjectURL(content),
                                link = document.createElement("a"),
                                filename = filenames[0].split("=")[1].replaceAll("\"","").trim();

                            link.href = contentURL;
                            link.download = filename
                            link.click() 
                            URL.revokeObjectURL(contentURL);
                        }
                    }
                    break;

                default:
                    this.domAgent.createError(response);
            }
        } else if (response.body !== null) {
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
                                        console.warn(`Endpoint.succeeded() [${this.node}] - Error parsing expected JSON string : ${error}`);
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
                console.error(`Endpoint.succeeded() [${this.node}] - Failed to read the stream from ${this.node.url} ({error})`)
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
            requestOptions.headers = Object.assign(headers || {}, {"x-enliwfen-request": "true"});

            if (timeout > 0) {
                console.debug(`Endpoint.call() [${this.node}] - A timeout of '${timeout}ms' is going to be set for call of '${url}'.`)
                requestOptions.signal = AbortSignal.timeout(timeout);
            } else {
                console.debug(`Endpoint.call() [${this.node}] - No timeout ist set for call of '${url}'.`)
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
                    /* A request body with form data will be added, if
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
            console.log(`Endpoint.call() [${this.node}] - No URL to call ist set in the feature node '${element}'.`)
        }
    }

}
