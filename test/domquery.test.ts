import { beforeEach, describe, expect, it } from "vitest";
import { DOMQuery } from "./DOMQuery";
import { enliwfen } from "./declarations";

describe("DOMQuery", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    describe("selectFirst", () => {
        it("returns the first matching HTMLElement", () => {
            document.body.innerHTML = `
                <div class="item">First</div>
                <div class="item">Second</div>
            `;

            const result = DOMQuery.selectFirst(".item");

            expect(result).toBeInstanceOf(HTMLElement);
            expect(result?.textContent).toBe("First");
        });

        it("returns null when nothing matches", () => {
            const result = DOMQuery.selectFirst(".missing");

            expect(result).toBeNull();
        });

        it("returns null when the matching element is not an HTMLElement", () => {
            document.body.innerHTML = `
                <svg>
                    <circle class="item"></circle>
                </svg>
            `;

            const result = DOMQuery.selectFirst(".item");

            expect(result).toBeNull();
        });

        it("searches within the supplied scope", () => {
            document.body.innerHTML = `
                <div id="one">
                    <span class="item">One</span>
                </div>
                <div id="two">
                    <span class="item">Two</span>
                </div>
            `;

            const scope = document.querySelector("#two") as HTMLElement;

            const result = DOMQuery.selectFirst(".item", scope);

            expect(result?.textContent).toBe("Two");
        });

        it("returns null when the scope does not contain a match", () => {
            document.body.innerHTML = `
                <div id="one">
                    <span class="item">One</span>
                </div>
            `;

            const scope = document.createElement("div");

            const result = DOMQuery.selectFirst(".item", scope);

            expect(result).toBeNull();
        });
    });

    describe("queryAll", () => {
        it("yields all matching HTMLElements", () => {
            document.body.innerHTML = `
                <div class="item">One</div>
                <div class="item">Two</div>
                <div class="item">Three</div>
            `;

            const result = [...DOMQuery.queryAll(".item")];

            expect(result).toHaveLength(3);
            expect(result.map(element => element.textContent)).toEqual([
                "One",
                "Two",
                "Three",
            ]);
        });

        it("yields nothing when there are no matches", () => {
            const result = [...DOMQuery.queryAll(".missing")];

            expect(result).toEqual([]);
        });

        it("only yields HTMLElements", () => {
            document.body.innerHTML = `
                <div class="item">HTML</div>
                <svg>
                    <circle class="item"></circle>
                </svg>
            `;

            const result = [...DOMQuery.queryAll(".item")];

            expect(result).toHaveLength(1);
            expect(result[0].textContent).toBe("HTML");
        });

        it("searches within the supplied scope", () => {
            document.body.innerHTML = `
                <div id="one">
                    <span class="item">One</span>
                </div>
                <div id="two">
                    <span class="item">Two</span>
                    <span class="item">Three</span>
                </div>
            `;

            const scope = document.querySelector("#two") as HTMLElement;

            const result = [...DOMQuery.queryAll(".item", scope)];

            expect(result.map(element => element.textContent)).toEqual([
                "Two",
                "Three",
            ]);
        });
    });

    describe("selectAll", () => {
        it("returns all matching elements as an array", () => {
            document.body.innerHTML = `
                <div class="item">One</div>
                <div class="item">Two</div>
            `;

            const result = DOMQuery.selectAll(".item");

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2);
            expect(result.map(element => element.textContent)).toEqual([
                "One",
                "Two",
            ]);
        });

        it("returns an empty array when nothing matches", () => {
            expect(DOMQuery.selectAll(".missing")).toEqual([]);
        });
    });

    describe("featureElements", () => {
        it("returns all feature elements in the document", () => {
            document.body.innerHTML = `
                <div class="${enliwfen}">One</div>
                <div class="${enliwfen}">Two</div>
                <div class="other">Three</div>
            `;

            const result = [...DOMQuery.featureElements()];

            expect(result).toHaveLength(2);
            expect(result.map(element => element.textContent)).toEqual([
                "One",
                "Two",
            ]);
        });

        it("includes the scope itself when it has the feature class", () => {
            const scope = document.createElement("div");
            scope.classList.add(enliwfen);
            scope.textContent = "Scope";

            const child = document.createElement("div");
            child.classList.add(enliwfen);
            child.textContent = "Child";

            scope.appendChild(child);
            document.body.appendChild(scope);

            const result = [...DOMQuery.featureElements(scope)];

            expect(result).toHaveLength(2);
            expect(result[0]).toBe(scope);
            expect(result[1]).toBe(child);
        });

        it("does not include the scope itself when it lacks the feature class", () => {
            const scope = document.createElement("div");
            const child = document.createElement("div");

            child.classList.add(enliwfen);
            scope.appendChild(child);
            document.body.appendChild(scope);

            const result = [...DOMQuery.featureElements(scope)];

            expect(result).toEqual([child]);
        });

        it("returns an empty iterable when the scope contains no feature elements", () => {
            const scope = document.createElement("div");
            document.body.appendChild(scope);

            const result = [...DOMQuery.featureElements(scope)];

            expect(result).toEqual([]);
        });
    });

    describe("getFeatureElements", () => {
        it("returns feature elements as an array", () => {
            document.body.innerHTML = `
                <div class="${enliwfen}">One</div>
                <div class="${enliwfen}">Two</div>
            `;

            const result = DOMQuery.getFeatureElements();

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(2);
        });

        it("includes a matching scope and its matching descendants", () => {
            const scope = document.createElement("div");
            scope.classList.add(enliwfen);

            const child = document.createElement("div");
            child.classList.add(enliwfen);

            scope.appendChild(child);
            document.body.appendChild(scope);

            const result = DOMQuery.getFeatureElements(scope);

            expect(result).toEqual([scope, child]);
        });
    });
});
