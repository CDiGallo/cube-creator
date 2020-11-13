import { Constructor } from '@tpluscode/rdfine'
import { Mixin } from '@tpluscode/rdfine/lib/ResourceFactory'
import * as ns from '@cube-creator/core/namespace'
import { Table, ColumnMapping } from '@cube-creator/model'
import { AdditionalActions } from '@/api/mixins/ApiResource'

declare module '@cube-creator/model' {
  interface Table {
    isObservationTable: boolean;
    columnMappings: ColumnMapping[];
  }
}

export default function mixin<Base extends Constructor> (base: Base): Mixin {
  return class extends base implements Partial<Table>, AdditionalActions {
    get _additionalActions () {
      return {
        createColumnMapping: ns.cc.CreateColumnMappingAction,
      }
    }

    get isObservationTable (): boolean {
      return this.types.has(ns.cc.ObservationTable)
    }

    get columnMappings (): ColumnMapping[] {
      return this.getArray<ColumnMapping>(ns.cc.columnMapping)
    }
  }
}

mixin.appliesTo = ns.cc.Table
