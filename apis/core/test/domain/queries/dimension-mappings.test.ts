import { describe, it, beforeEach } from 'mocha'
import sinon from 'sinon'
import { Term } from 'rdf-js'
import $rdf from 'rdf-ext'
import { expect } from 'chai'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { parsingClient, client, insertTestData } from '@cube-creator/testing/lib'
import clownface from 'clownface'
import TermMap from '@rdfjs/term-map'
import { replaceValueWithDefinedTerms } from '../../../lib/domain/queries/dimension-mappings'

describe('lib/domain/queries/dimension-mappings @SPARQL', function () {
  this.timeout(20000)

  const dimensionMapping = $rdf.namedNode('https://cube-creator.lndo.site/cube-project/ubd/dimension-mapping/pollutant')
  let terms: Map<Term, Term>
  const sparqlSpy = sinon.spy(client.query, 'update')

  beforeEach(async () => {
    terms = new TermMap()
    await insertTestData('fuseki/sample-ubd.trig')

    sparqlSpy.resetHistory()
  })

  it('does nothing when called without any terms', async () => {
    // when
    await replaceValueWithDefinedTerms({ dimensionMapping, terms }, client)

    // then
    expect(sparqlSpy).not.to.have.been.called
  })

  it('updates observations', async () => {
    // given
    const observationId = $rdf.namedNode('https://environment.ld.admin.ch/foen/ubd/28/observation/blBAS-2003-annualmean')
    const definedTerm = $rdf.namedNode('http://www.wikidata.org/entity/Q5282')
    terms.set($rdf.literal('so2'), definedTerm)

    // when
    await replaceValueWithDefinedTerms({ dimensionMapping, terms }, client)

    // then
    const quads = await DESCRIBE`${observationId}`.execute(parsingClient.query)
    const observation = clownface({ dataset: $rdf.dataset(quads) }).namedNode(observationId)
    expect(observation).to.matchShape({
      property: {
        path: $rdf.namedNode('https://environment.ld.admin.ch/foen/ubd/28/pollutant'),
        hasValue: definedTerm,
        minCount: 1,
        maxCount: 1,
      },
    })
  })
})
