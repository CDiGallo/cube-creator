import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import * as sinon from 'sinon'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import { csvw, hydra, rdf, schema, xsd } from '@tpluscode/rdf-ns-builders'
import { cc } from '@cube-creator/core/namespace'
import { TestResourceStore } from '../../support/TestResourceStore'
import type * as DimensionMetadataQueries from '../../../lib/domain/queries/dimension-metadata'
import type * as TableQueries from '../../../lib/domain/queries/table'
import '../../../lib/domain'
import { NotFoundError } from '../../../lib/errors'
import { NamedNode } from 'rdf-js'
import DatasetExt from 'rdf-ext/lib/Dataset'
import { deleteColumnMapping } from '../../../lib/domain/column-mapping/delete'
import { ColumnMapping } from '@cube-creator/model'

describe('domain/column-mapping/delete', () => {
  let store: TestResourceStore
  let dimensionMetadataQueries: typeof DimensionMetadataQueries
  let getDimensionMetaDataCollection: sinon.SinonStub
  const getLinkedTablesForSource = sinon.stub()
  const getTablesForMapping = sinon.stub()
  let tableQueries: typeof TableQueries
  let getTableForColumnMapping: sinon.SinonStub
  let dimensionMetadataCollection: GraphPointer<NamedNode, DatasetExt>
  let columnMapping: GraphPointer<NamedNode, DatasetExt>
  let columnMappingObservation: GraphPointer<NamedNode, DatasetExt>
  let observationTable: GraphPointer<NamedNode, DatasetExt>

  beforeEach(() => {
    const csvMapping = clownface({ dataset: $rdf.dataset() })
      .namedNode('csv-mapping')
      .addOut(rdf.type, cc.CsvMapping)
      .addOut(cc.namespace, 'http://example.com/')
    const csvSource = clownface({ dataset: $rdf.dataset() })
      .namedNode('foo')
      .addOut(rdf.type, cc.CSVSource)
      .addOut(csvw.column, $rdf.namedNode('my-column'), (column) => {
        column.addOut(schema.name, $rdf.literal('My Column'))
      })
      .addOut(csvw.column, $rdf.namedNode('my-column2'), (column) => {
        column.addOut(schema.name, $rdf.literal('My Column 2'))
      })

    columnMapping = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode('columnMapping'))
      .addOut(rdf.type, cc.ColumnMapping)
      .addOut(rdf.type, hydra.Resource)
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column'))
      .addOut(cc.targetProperty, $rdf.namedNode('test'))
      .addOut(cc.datatype, xsd.integer)
      .addOut(cc.language, $rdf.literal('fr'))
      .addOut(cc.defaultValue, $rdf.literal('test'))

    const otherColumnMapping = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode('otherColumnMapping'))
      .addOut(rdf.type, cc.ColumnMapping)
      .addOut(rdf.type, hydra.Resource)
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column2'))
      .addOut(cc.targetProperty, $rdf.namedNode('other'))

    const table = clownface({ dataset: $rdf.dataset() })
      .namedNode('myTable')
      .addOut(rdf.type, cc.Table)
      .addOut(rdf.type, cc.ObservationTable)
      .addOut(cc.csvMapping, csvMapping)
      .addOut(cc.csvSource, csvSource)
      .addOut(cc.columnMapping, columnMapping)
      .addOut(cc.columnMapping, otherColumnMapping)

    columnMappingObservation = clownface({ dataset: $rdf.dataset() })
      .node($rdf.namedNode('columnMappingObservation'))
      .addOut(rdf.type, cc.ColumnMapping)
      .addOut(rdf.type, hydra.Resource)
      .addOut(cc.sourceColumn, $rdf.namedNode('my-column'))
      .addOut(cc.targetProperty, $rdf.namedNode('test'))
      .addOut(cc.datatype, xsd.integer)

    observationTable = clownface({ dataset: $rdf.dataset() })
      .namedNode('myObservationTable')
      .addOut(rdf.type, cc.Table)
      .addOut(rdf.type, cc.ObservationTable)
      .addOut(cc.csvMapping, csvMapping)
      .addOut(cc.csvSource, csvSource)
      .addOut(cc.columnMapping, columnMappingObservation)
      .addOut(cc.columnMapping, columnMapping)

    dimensionMetadataCollection = clownface({ dataset: $rdf.dataset() })
      .namedNode('dimensionMetadataCollection')
      .addOut(rdf.type, cc.DimensionMetadataCollection)
      .addOut(schema.hasPart, $rdf.namedNode('myDimension'), dim => {
        dim.addOut(schema.about, $rdf.namedNode('test'))
      })
      .addOut(schema.hasPart, $rdf.namedNode('myDimension2'), dim => {
        dim.addOut(schema.about, $rdf.namedNode('test2'))
      })

    store = new TestResourceStore([
      table,
      observationTable,
      csvMapping,
      csvSource,
      dimensionMetadataCollection,
      columnMapping,
      otherColumnMapping,
      columnMappingObservation,
    ])

    getDimensionMetaDataCollection = sinon.stub().resolves(dimensionMetadataCollection.term.value)
    dimensionMetadataQueries = { getDimensionMetaDataCollection }
    getTableForColumnMapping = sinon.stub().resolves(observationTable.term.value)
    tableQueries = {
      getLinkedTablesForSource,
      getTablesForMapping,
      getTableForColumnMapping,
    }
  })

  it('deletes a column mapping and its dimensions', async () => {
    const resourceId = $rdf.namedNode('columnMappingObservation')

    const dimensionsCount = dimensionMetadataCollection.out(schema.hasPart).terms.length
    const columnMappingsCount = observationTable.out(cc.columnMapping).terms.length
    const dimensionMetadataCount = dimensionMetadataCollection.node($rdf.namedNode('myDimension')).out().values.length

    await deleteColumnMapping({ resource: resourceId, store, dimensionMetadataQueries, tableQueries })

    const columnMapping = await store.getResource<ColumnMapping>(resourceId)
    expect(columnMapping).to.eq(undefined)

    expect(dimensionMetadataCollection.out(schema.hasPart).terms).to.have.length(dimensionsCount - 1)
    expect(observationTable.out(cc.columnMapping).terms).to.have.length(columnMappingsCount - 1)
    expect(dimensionMetadataCollection.node($rdf.namedNode('myDimension')).out().values).to.have.length(dimensionMetadataCount - 1)
  })

  it('throw if column mapping does not exist', async () => {
    const resource = $rdf.namedNode('columnMapping-foo')
    const promise = deleteColumnMapping({ resource, store, dimensionMetadataQueries, tableQueries })

    await expect(promise).to.have.rejectedWith(NotFoundError)
  })
})