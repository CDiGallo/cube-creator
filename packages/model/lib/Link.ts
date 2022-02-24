import { DatasetCore } from 'rdf-js'
import { RdfResource, RdfResourceCore } from '@tpluscode/rdfine/RdfResource'
import type { HydraResponse } from 'alcaeus'

export type Link<T extends RdfResourceCore = RdfResourceCore> = RdfResourceCore & Partial<Omit<RdfResource, 'load'>> & {
  load?(): Promise<HydraResponse<DatasetCore, T>>
}
