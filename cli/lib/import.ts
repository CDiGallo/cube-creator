import { CONSTRUCT, SELECT } from '@tpluscode/sparql-builder'
import type { Context } from 'barnard59-core/lib/Pipeline'
import StreamClient from 'sparql-http-client'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { NamedNode, Stream } from 'rdf-js'
import { PassThrough } from 'readable-stream'
import * as ns from '@cube-creator/core/namespace'
import { hydra, rdf, schema, sh } from '@tpluscode/rdf-ns-builders'
import { readable } from 'duplex-to'
import $rdf from 'rdf-ext'
import clownface from 'clownface'
import { Hydra } from 'alcaeus/node'
import merge from 'merge2'
import type { DatasetIndexed } from 'rdf-dataset-indexed/dataset'

interface CubeQuery {
  endpoint: NamedNode
  graph: NamedNode | undefined
  cube: NamedNode
}

interface DimensionQuery extends CubeQuery {
  metadataResource: string
}

interface CubeMetadataQuery extends CubeQuery {
  datasetResource: string
}

/**
 * Populates cc:DimensionMetadataResource with dimensions found in the imported cube
 */
export async function dimensionsQuery(this: Context, { endpoint, cube, graph, metadataResource }: DimensionQuery) {
  const client = new ParsingClient({
    endpointUrl: endpoint.value,
  })
  const streamClient = new StreamClient({
    endpointUrl: endpoint.value,
  })

  const metadataCollection = clownface({ dataset: $rdf.dataset() })
    .namedNode(metadataResource)
    .addOut(rdf.type, [ns.cc.DimensionMetadataCollection, hydra.Resource])

  let query = SELECT.DISTINCT`?dimension`
    .WHERE`
      ${cube} ${ns.cube.observationConstraint} ?shape .
      ?shape ${sh.property} ?property .
      ?property ${sh.path} ?dimension .

      filter(
        !(?dimension in ( ${rdf.type}, ${ns.cube.observedBy} ))
      )
    `

  let dimensionMetadata = CONSTRUCT`?dimension ?p ?o`
    .WHERE`
      ${cube} a ${ns.cube.Cube} ; ${ns.cube.observationConstraint} ?shape .

      ?shape ${sh.property} ?property .
      ?property ${sh.path} ?dimension .
      ?property ?p ?o .

      filter (
        !strstarts(str(?p), str(${sh()}))
      )
    `

  if (graph) {
    query = query.FROM(graph)
    dimensionMetadata = dimensionMetadata.FROM(graph)
  }

  const dimensions = await query.execute(client.query)
  for (let i = 1; i <= dimensions.length; i++) {
    const { dimension } = dimensions[i - 1]

    this.log.debug(`Adding dimension ${dimension.value}`)

    const dimensionMetadata = metadataCollection.namedNode(`${metadataCollection.value}/${i}`)
    metadataCollection.addOut(schema.hasPart, dimensionMetadata, dm => {
      dm.addOut(schema.about, dimension)
    })
  }

  return readable(merge(
    metadataCollection.dataset.toStream(),
    await dimensionMetadata.execute(streamClient.query),
  ))
}

export async function cubeMetadataQuery(this: Context, { cube, graph, endpoint, datasetResource }: CubeMetadataQuery) {
  const client = new StreamClient({
    endpointUrl: endpoint.value,
  })

  const { representation, response } = await Hydra.loadResource(datasetResource)
  const cubeResource = representation?.get(cube.value)
  if (!cubeResource) {
    this.log.error(`Failed to load cube dataset. Response was: '${response?.xhr.statusText}'`)
    return $rdf.dataset().toStream()
  }

  let cubeMetaQuery = CONSTRUCT`${cube} ?p ?o`
    .WHERE`
      ${cube} ?p ?o .

      filter(
        !strstarts(str(?p), str(${ns.cube()}))
      )
    `
  if (graph) {
    cubeMetaQuery = cubeMetaQuery.FROM(graph)
  }

  const origDataset: DatasetIndexed = cubeResource.pointer.dataset
  return readable(merge(
    await cubeMetaQuery.execute(client.query),
    origDataset.match(null, null, null, $rdf.namedNode(datasetResource)).toStream(),
  ))
}

/**
 * Fetches all cube data, excluding metadata. Only shape and observations
 */
export function cubeQuery(this: Context, { endpoint, cube, graph }: CubeQuery): Stream {
  const client = new StreamClient({
    endpointUrl: endpoint.value,
  })

  let query = CONSTRUCT`
    ${cube} a ${ns.cube.Cube} ;
            ${ns.cube.observationConstraint}  ?shape ;
            ${ns.cube.observationSet} ?set .
    ?shape ?shapeP ?shapeO .
    ?propertyS ?propertyP ?propertyO .

    ?set ${ns.cube.observation} ?observation .
    ?observation ?observationP ?observationO .`
    .WHERE`
    {
      # Constraint Shape properties
      ${cube}
        a ${ns.cube.Cube} ;
        ${ns.cube.observationConstraint} ?shape ;
      .

      ?shape ?shapeP ?shapeO .
    }
    union
    {
      # Property Shape properties need to be queried deep to get RDF Lists
      ${cube} a ${ns.cube.Cube} ;
              ${ns.cube.observationConstraint}/${sh.property} ?property .

      ?property (<>|!<>)* ?propertyS .
      ?propertyS ?propertyP ?propertyO .

      filter(
        # Only keep SHACL and RDF to exclude any dimension metadata
        regex(str(?propertyP), str(${sh()})) || regex(str(?propertyP), str(${rdf()}))
      )
    }
    union
    {
      # Actual observation data
      ${cube} a ${ns.cube.Cube} ;
              ${ns.cube.observationSet} ?set .

      ?set ${ns.cube.observation} ?observation .
      ?observation ?observationP ?observationO .
    }
    `

  const stream = new PassThrough({ objectMode: true })
  if (graph) {
    query = query.FROM(graph)
  }

  query.execute(client.query)
    .then(quads => quads.pipe(stream))

  return readable(stream)
}
