import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import clownface from 'clownface'
import $rdf from 'rdf-ext'
import { csvw, hydra, rdf, schema, sh, xsd } from '@tpluscode/rdf-ns-builders'
import { cc } from '@cube-creator/core/namespace'
import { createColumnMapping } from '../../../lib/domain/column-mapping/create'
import { TestResourceStore } from '../../support/TestResourceStore'
import '../../../lib/domain'

describe('domain/column-mapping/create', () => {
  let store: TestResourceStore
  const table = clownface({ dataset: $rdf.dataset() })
    .namedNode('myTable')
    .addOut(rdf.type, cc.Table)
  const csvSource = clownface({ dataset: $rdf.dataset() })
    .namedNode('foo')
    .addOut(rdf.type, cc.CSVSource)
    .addOut(csvw.column, $rdf.namedNode('my-column'), (column) => {
      column.addOut(schema.name, $rdf.literal('My Column'))
    })
  table.addOut(cc.csvSource, csvSource.term)

  beforeEach(() => {
    store = new TestResourceStore([
      table,
      csvSource,
    ])
  })

  it('creates identifier by slugifying the column schema:name', async () => {
    // given
    const resource = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode(''))
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column'))
      .addOut(cc.targetProperty, 'test')

    // when
    const columnMapping = await createColumnMapping({ resource, store, tableId: table.term })

    // then
    expect(columnMapping.term.value).to.match(/\/my-column-(.+)$/)
  })

  it('creates correctly shaped cc:ColumnMapping', async () => {
    // given
    const resource = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode(''))
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column'))
      .addOut(cc.targetProperty, $rdf.namedNode('test'))
      .addOut(cc.datatype, xsd.integer)
      .addOut(cc.language, $rdf.literal('fr'))
      .addOut(cc.defaultValue, $rdf.literal('test'))

    // when
    const columnMapping = await createColumnMapping({ resource, store, tableId: table.term })

    // then
    expect(columnMapping).to.matchShape({
      property: [{
        path: rdf.type,
        [sh.hasValue.value]: [cc.ColumnMapping, hydra.Resource],
        minCount: 2,
      }, {
        path: cc.sourceColumn,
        hasValue: $rdf.namedNode('my-column'),
        minCount: 1,
      }, {
        path: cc.targetProperty,
        hasValue: $rdf.namedNode('test'),
        minCount: 1,
      }, {
        path: cc.datatype,
        hasValue: xsd.integer,
        minCount: 1,
      }, {
        path: cc.language,
        hasValue: $rdf.literal('fr'),
        minCount: 1,
      }, {
        path: cc.defaultValue,
        hasValue: $rdf.literal('test'),
        minCount: 1,
      }],
    })
  })

  it('links column mapping from table', async () => {
    // given
    const resource = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode(''))
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column'))
      .addOut(cc.targetProperty, $rdf.namedNode('test'))

    // when
    const columnMapping = await createColumnMapping({ resource, store, tableId: table.term })

    // then
    expect(table).to.matchShape({
      property: [{
        path: cc.columnMapping,
        [sh.hasValue.value]: columnMapping.term,
        minCount: 1,
      }],
    })
  })
})