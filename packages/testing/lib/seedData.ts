import ParsingClient from 'sparql-http-client/ParsingClient'
import StreamClient from 'sparql-http-client/StreamClient'
import fs from 'fs'
import path from 'path'
import { parsers } from '@rdfjs/formats-common'
import $rdf from 'rdf-ext'
import { DatasetCore, Quad, Term } from 'rdf-js'
import { xsd, _void } from '@tpluscode/rdf-ns-builders'
import { sparql } from '@tpluscode/rdf-string'
import RdfPxParser from 'rdf-parser-px'
import TripleToQuadTransform from 'rdf-transform-triple-to-quad'
import { ccClients, mdClients } from './index'
import through2 from 'through2'
import { cube } from '@cube-creator/core/namespace'

async function removeTestGraphs(client: ParsingClient, dataset: DatasetCore) {
  const graphs = [...dataset.match(null, _void.inDataset)].map(({ subject }) => subject)

  const dropGraphs = sparql`${graphs.map(graph => sparql`DROP SILENT GRAPH ${graph};`)}`.toString()
  return client.query.update(dropGraphs)
}

const insertTestData = async (pathName: string, { parsingClient, streamClient }: { parsingClient: ParsingClient; streamClient: StreamClient }) => {
  const file = fs.createReadStream(path.resolve(process.cwd(), pathName))
  const stream = parsers.import('application/trig', file)

  if (stream) {
    const ds = await $rdf.dataset().import(stream)
    await removeTestGraphs(parsingClient, ds)
    await streamClient.store.post(ds.toStream())
  }
}

export const insertTestProject = () => {
  return insertTestData('fuseki/sample-ubd.trig', ccClients)
}

export const insertTestDimensions = () => {
  return insertTestData('fuseki/shared-dimensions.trig', mdClients)
}

const oldCubeNs = /^http:\/\/ns\.bergnet\.org\/cube\//

function rebaseCubeNs<T extends Term>(term: T): T {
  if (term.termType === 'NamedNode') {
    return $rdf.namedNode(term.value.replace(oldCubeNs, cube().value)) as any
  }

  return term
}

export const insertPxCube = () => {
  const client = new StreamClient({
    endpointUrl: process.env.PX_CUBE_QUERY_ENDPOINT!,
    storeUrl: process.env.PX_CUBE_GRAPH_ENDPOINT!,
  })

  const pxStream = fs.createReadStream(path.resolve(__dirname, '../../../fuseki/px-x-0703010000_103.px'))
  const parser = new RdfPxParser({
    baseIRI: process.env.PX_CUBE_BASE!,
    encoding: 'iso-8859-15',
    metadata: [{
      titles: 'Jahr',
      datatype: xsd.gYear.value,
    }],
  })

  const pxCubeStream = parser.import(pxStream)
    .pipe(new TripleToQuadTransform($rdf.namedNode(process.env.PX_CUBE_GRAPH!)))
    .pipe(through2.obj(function ({ subject, predicate, object, graph }: Quad, _, cb) {
      this.push($rdf.quad(
        rebaseCubeNs(subject),
        rebaseCubeNs(predicate),
        rebaseCubeNs(object),
        graph,
      ))

      cb()
    }))

  return client.store.put(pxCubeStream)
}
