import { RdfResourceCore } from '@tpluscode/rdfine/RdfResource'
import { Constructor, property } from '@tpluscode/rdfine'
import { dcterms, schema, xsd } from '@tpluscode/rdf-ns-builders'
import { cube } from '@cube-creator/core/namespace'
import { initializer } from './lib/initializer'
import { NamedNode } from 'rdf-js'

export interface Cube extends RdfResourceCore {
  dateCreated: Date
  creator: NamedNode
}

export function CubeMixin<Base extends Constructor>(Resource: Base) {
  class Impl extends Resource implements Cube {
    @property.literal({
      path: schema.dateCreated,
      datatype: xsd.date,
      type: Date,
      initial: () => new Date(),
    })
    dateCreated!: Date

    @property({ path: dcterms.creator })
    creator!: NamedNode
  }

  return Impl
}

CubeMixin.appliesTo = cube.Cube

type RequiredProperties = 'creator'

export const create = initializer<Cube, RequiredProperties>(CubeMixin, {
  types: [cube.Cube],
})