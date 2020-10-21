import { GraphPointer } from 'clownface'
import { NamedNode } from 'rdf-js'
import { rdfs, rdf, hydra, dcterms } from '@tpluscode/rdf-ns-builders'
import { cc, shape } from '@cube-creator/core/namespace'
import { ResourceStore } from '../../ResourceStore'
import * as id from '../identifiers'
import { resourceStore } from '../resources'

interface CreateProjectCommand {
  projectsCollection: NamedNode
  resource: GraphPointer
  store?: ResourceStore
  user: NamedNode
}

export async function createProject({
  projectsCollection,
  resource,
  store = resourceStore(),
  user,
}: CreateProjectCommand): Promise<GraphPointer> {
  const label = resource.out(rdfs.label).term!

  const project = await store
    .createMember(projectsCollection, id.cubeProject(label.value))

  project.addOut(rdfs.label, label)
    .addOut(dcterms.creator, user)

  if (shape('cube-project/create#CSV').equals(resource.out(cc.projectSourceKind).term)) {
    const mapping = store
      .create(id.csvMapping(project))
      .addOut(rdf.type, cc.CsvMapping)

    project.addOut(cc.csvMapping, mapping)

    const sourceCollection = store
      .create(id.csvSourceCollection(mapping))
      .addOut(rdf.type, [cc.CSVSourceCollection, hydra.Collection])
      .addOut(hydra.title, 'CSV-Sources')
      .addOut(cc.csvMapping, mapping)
      .addOut(hydra.manages, manages => {
        // ?member rdf:type cc:CSVSource
        manages.addOut(hydra.property, rdf.type)
        manages.addOut(hydra.object, cc.CSVSource)
      })
      .addOut(hydra.manages, manages => {
        // ?member cc:csvMapping <mapping>
        manages.addOut(hydra.object, mapping)
        manages.addOut(hydra.property, cc.csvMapping)
      })

    mapping.addOut(cc.csvSourceCollection, sourceCollection)

    const tableCollection = store
      .create(id.tableCollection(mapping))
      .addOut(rdf.type, [cc.TableCollection, hydra.Collection])
      .addOut(hydra.title, 'Tables')
      .addOut(cc.csvMapping, mapping)
      .addOut(hydra.manages, manages => {
        // ?member rdf:type cc:Table
        manages.addOut(hydra.property, rdf.type)
        manages.addOut(hydra.object, cc.Table)
      })
      .addOut(hydra.manages, manages => {
        // ?member cc:csvMapping <mapping>
        manages.addOut(hydra.object, mapping)
        manages.addOut(hydra.property, cc.csvMapping)
      })

    mapping.addOut(cc.tables, tableCollection)
  }

  await store.save()
  return project
}
