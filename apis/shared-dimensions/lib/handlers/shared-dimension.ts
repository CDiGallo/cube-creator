import asyncMiddleware from 'middleware-async'
import { protectedResource } from '@hydrofoil/labyrinth/resource'
import clownface from 'clownface'
import { schema } from '@tpluscode/rdf-ns-builders/strict'
import cors from 'cors'
import { serializers } from '@rdfjs-elements/formats-pretty'
import error from 'http-errors'
import { md, meta } from '@cube-creator/core/namespace'
import * as ns from '@tpluscode/rdf-ns-builders'
import { createTerm, getExportedDimension } from '../domain/shared-dimension'
import { store } from '../store'
import { shaclValidate } from '../middleware/shacl'
import { rewrite } from '../rewrite'
import shapes from '../shapes'

export const post = protectedResource(shaclValidate, asyncMiddleware(async (req, res) => {
  const term = await createTerm({
    resource: rewrite(await req.resource()),
    termSet: clownface({ dataset: await req.hydra.resource.dataset() }).node(req.hydra.term),
    store: store(),
  })

  res.setHeader('Location', term.value)
  res.status(201)
  return res.dataset(term.dataset)
}))

export const getExport = protectedResource(cors({ exposedHeaders: 'content-disposition' }), asyncMiddleware(async (req, res, next) => {
  if (!req.dataset) {
    return next(new error.BadRequest())
  }
  const query = clownface({ dataset: await req.dataset() })
  const termSet: any = query
    .has(schema.inDefinedTermSet)
    .out(schema.inDefinedTermSet)
    .term

  const { dimension, data } = await getExportedDimension({
    resource: termSet,
    store: store(),
  })

  const name = dimension.out(schema.name, { language: ['en', '*'] })?.value || 'dimension'

  res.setHeader('Content-Disposition', `attachment; filename="${name}.trig"`)
  res.setHeader('Content-Type', 'application/trig')

  const quadStream: any = serializers.import('application/trig', data, {
    prefixes: {
      md: md().value,
      meta: meta().value,
      schema: ns.schema().value,
      sh: ns.sh().value,
      rdf: ns.rdf().value,
      rdfs: ns.rdfs().value,
      xsd: ns.xsd().value,
      hydra: ns.hydra().value,
    },
  })
  quadStream.pipe(res)
}))
