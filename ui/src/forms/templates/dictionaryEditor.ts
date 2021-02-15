import { html } from 'lit-element'
import { repeat } from 'lit-html/directives/repeat'
import { PropertyTemplate, FocusNodeTemplate } from '@hydrofoil/shaperone-wc/templates'
import { prov, rdf } from '@tpluscode/rdf-ns-builders'

export const focusNode = (wrapped: FocusNodeTemplate): FocusNodeTemplate => {
  const template: FocusNodeTemplate = (renderer, { focusNode }) => {
    if (focusNode.focusNode.has(rdf.type, prov.KeyEntityPair).terms.length) {
      return html`${repeat(focusNode.groups, group => renderer.renderGroup({ group }))}`
    }

    return wrapped(renderer, { focusNode })
  }

  template.loadDependencies = wrapped.loadDependencies

  return template
}

export const property = (wrapped: PropertyTemplate): PropertyTemplate => {
  const template: PropertyTemplate = (renderer, { property }) => {
    if (renderer.focusNode.focusNode.has(rdf.type, prov.KeyEntityPair).terms.length) {
      return html`${repeat(property.objects, object => html`<td>${renderer.renderObject({ object })}</td>`)}`
    }

    return wrapped(renderer, { property })
  }

  template.loadDependencies = wrapped.loadDependencies

  return template
}
