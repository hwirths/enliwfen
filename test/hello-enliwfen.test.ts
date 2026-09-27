import { expect, test } from 'vitest'
import { default as Enliwfen } from '../src/enliwfen-esm.ts'
import { DOMQuery } from '../src/domquery.ts';

test('tests the Enliwfen version to be the one expected by the tests.', () => {
  expect(Enliwfen.version()).toBe("0.1.0")

  const container = document.createElement("div");
  container.id = "container";

  expect(DOMQuery.selectFirst("#container")).toBeNull()
  container.classList.add("enliwfen");
  document.body.appendChild(container);

  expect(document.getElementById("container")).toBe(container);
  
  const container_replacement = "<div id='container'>Some test content</div>"
})

