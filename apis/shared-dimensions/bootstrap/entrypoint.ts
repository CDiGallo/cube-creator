import { hydra, rdf } from '@tpluscode/rdf-ns-builders'
import { md } from '@cube-creator/core/namespace'
import { NamespaceBuilder } from '@rdfjs/namespace'
import type { BootstrappedResourceFactory } from './index'

export const entrypoint = (ptr: BootstrappedResourceFactory, ns: NamespaceBuilder) =>
  ptr('').addOut(rdf.type, hydra.Resource)
    .addOut(md.sharedDimensions, ns('term-sets'))