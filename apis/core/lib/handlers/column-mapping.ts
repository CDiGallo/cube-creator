import asyncMiddleware from 'middleware-async'
import { protectedResource } from '@hydrofoil/labyrinth/resource'
import { shaclValidate } from '../middleware/shacl'
import { createColumnMapping } from '../domain/column-mapping/create'

export const post = protectedResource(shaclValidate, asyncMiddleware(async (req, res) => {
  const columnMapping = await createColumnMapping({
    tableId: req.hydra.resource.term,
    resource: await req.resource(),
  })

  res.status(201)
  res.header('Location', columnMapping.value)
  await res.dataset(columnMapping.dataset)
}))