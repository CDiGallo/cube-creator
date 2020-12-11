import { NamedNode } from 'rdf-js'
import { ResourceStore } from '../../ResourceStore'
import { cc } from '@cube-creator/core/namespace'
import * as DimensionMetadataQueries from '../queries/dimension-metadata'
import * as TableQueries from '../queries/table'
import { deleteColumnMapping } from '../column-mapping/delete'

interface DeleteTableCommand {
  resource: NamedNode
  store: ResourceStore
  dimensionMetadataQueries?: Pick<typeof DimensionMetadataQueries, 'getDimensionMetaDataCollection'>
  tableQueries?: Pick<typeof TableQueries, 'getTableForColumnMapping'>
}

export async function deleteTable({
  resource: tableTerm,,
  store,
  dimensionMetadataQueries: { getDimensionMetaDataCollection } = DimensionMetadataQueries,
  tableQueries: { getTableForColumnMapping } = TableQueries,
}: DeleteTableCommand): Promise<void> {
  if (tableTerm.termType !== 'NamedNode') return
  
  const table = await store.get(tableTerm, { allowMissing: true })
  if (!table) return

  // Delete in columnMappings
  const columnMappings = table.out(cc.columnMapping).terms
  for await (const columnMapping of columnMappings) {
    if (columnMapping.termType === 'NamedNode') {
      await deleteColumnMapping({
        resource: columnMapping,
        store,
        dimensionMetadataQueries: { getDimensionMetaDataCollection },
        tableQueries: { getTableForColumnMapping },
      })
    }
  }

  // Delete Graph
  store.delete(tableTerm)
}
