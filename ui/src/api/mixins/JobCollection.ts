import { Constructor } from '@tpluscode/rdfine'
import { Mixin } from '@tpluscode/rdfine/lib/ResourceFactory'
import * as ns from '@cube-creator/core/namespace'
import { AdditionalActions } from '@/api/mixins/ApiResource'

export default function mixin<Base extends Constructor> (base: Base): Mixin {
  return class extends base implements AdditionalActions {
    get _additionalActions () {
      return {
        create: ns.cc.TransformAction
      }
    }
  }
}

mixin.appliesTo = ns.cc.JobCollection
