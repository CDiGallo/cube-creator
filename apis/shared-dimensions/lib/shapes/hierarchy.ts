import { Initializer } from '@tpluscode/rdfine/RdfResource'
import { NodeShape, fromPointer as nodeShape } from '@rdfine/shacl/lib/NodeShape'
import { fromPointer as iriTemplate } from '@rdfine/hydra/lib/IriTemplate'
import { dash, dcterms, hydra, schema, sd, sh, xsd } from '@tpluscode/rdf-ns-builders/strict'
import { editor, md, meta } from '@cube-creator/core/namespace'
import { AnyPointer } from 'clownface'
import env from '@cube-creator/core/env'

export default function (graph: AnyPointer): Initializer<NodeShape> {
  const sharedDimensionCollection = graph.namedNode('/dimension/_term-sets')
  const publicQueryEndpoint = graph.blankNode()
    .addOut(sd.endpoint, graph.namedNode(env.PUBLIC_QUERY_ENDPOINT))

  const nextInHierarchyShapeId = graph.blankNode()
  const nextInHierarchyShape = nodeShape(nextInHierarchyShapeId, {
    property: [{
      name: 'Name',
      path: schema.name,
      minCount: 1,
      maxCount: 1,
      datatype: xsd.string,
      order: 10,
    }, {
      name: 'Type',
      path: sh.targetClass,
      maxCount: 1,
      nodeKind: sh.IRI,
      order: 15,
      [dash.editor.value]: editor.HierarchyLevelTargetEditor,
      [dcterms.source.value]: publicQueryEndpoint,
    }, {
      name: 'Property',
      path: sh.path,
      minCount: 1,
      maxCount: 1,
      nodeKind: sh.IRI,
      node: nodeShape({
        xone: [{
          nodeKind: sh.IRI,
        }, {
          nodeKind: sh.BlankNode,
          property: {
            path: sh.inversePath,
            nodeKind: sh.IRI,
            minCount: 1,
            maxCount: 1,
          },
        }],
      }),
      order: 20,
      [dash.editor.value]: editor.HierarchyPathEditor,
      [dcterms.source.value]: publicQueryEndpoint,
    }, {
      name: 'Next level',
      path: meta.nextInHierarchy,
      order: 25,
      [dash.editor.value]: dash.DetailsEditor,
      nodeKind: sh.BlankNode,
      node: nextInHierarchyShapeId,
      maxCount: 1,
    }],
  })

  return {
    name: 'Hierarchy',
    targetClass: meta.Hierarchy,
    property: [{
      name: 'Name',
      path: schema.name,
      minCount: 1,
      maxCount: 1,
      datatype: xsd.string,
      order: 1,
    }, {
      name: 'Root dimension',
      path: md.sharedDimension,
      minCount: 1,
      maxCount: 1,
      nodeKind: sh.IRI,
      [dash.editor.value]: dash.InstancesSelectEditor,
      [hydra.collection.value]: sharedDimensionCollection,
      order: 5,
    }, {
      name: 'Root',
      path: meta.hierarchyRoot,
      minCount: 1,
      nodeKind: sh.IRI,
      [dash.editor.value]: dash.AutoCompleteEditor,
      order: 10,
      [hydra.search.value]: iriTemplate({
        variableRepresentation: hydra.ExplicitRepresentation,
        template: '/dimension/_terms?dimension={dimension}{&q}',
        mapping: [{
          variable: 'dimension',
          property: md.sharedDimension,
          required: true,
        }, {
          variable: 'q',
          property: hydra.freetextQuery,
          [sh.minLength.value]: 0,
        }],
      }),
    }, {
      name: 'First level',
      path: meta.nextInHierarchy,
      order: 15,
      [dash.editor.value]: dash.DetailsEditor,
      nodeKind: sh.BlankNode,
      node: nextInHierarchyShape,
      minCount: 1,
      maxCount: 1,
    }],
  }
}
