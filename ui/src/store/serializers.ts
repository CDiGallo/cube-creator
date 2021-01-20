import { Actions } from '@/api/mixins/ApiResource'
import { cc } from '@cube-creator/core/namespace'
import {
  ColumnMapping,
  CsvColumn,
  CsvSource,
  Cube,
  Dataset,
  DimensionMetadata,
  DimensionMetadataCollection,
  Job,
  JobCollection,
  Project,
  ProjectsCollection,
  SourcesCollection,
  Table,
  TableCollection,
} from '@cube-creator/model'
import { IdentifierMapping, LiteralColumnMapping, ReferenceColumnMapping } from '@cube-creator/model/ColumnMapping'
import { Link } from '@cube-creator/model/lib/Link'
import { dcterms, rdfs } from '@tpluscode/rdf-ns-builders'
import { RdfResource } from '@tpluscode/rdfine/RdfResource'

export function serializeProjectsCollection (collection: ProjectsCollection): ProjectsCollection {
  return Object.freeze({
    ...serializeResource(collection),
    member: collection.member.map(serializeProject),
  }) as ProjectsCollection
}

export function serializeProject (project: Project): Project {
  return Object.freeze({
    ...serializeResource(project),
    csvMapping: Object.freeze(project.csvMapping),
    dataset: project.dataset
      ? serializeLink(project.dataset)
      : project.dataset,
    cubeGraph: project.cubeGraph,
    creator: project.creator,
    label: project.label,
    jobCollection: project.jobCollection
      ? serializeLink(project.jobCollection)
      : project.jobCollection,
    cubeIdentifier: project.cubeIdentifier,
    maintainer: project.maintainer
      ? {
        ...serializeLink(project.maintainer),
        label: project.maintainer?.pointer.out(rdfs.label, { language: ['en', 'de', 'fr', ''] }),
      }
      : project.maintainer,
    publishedRevision: project.publishedRevision,
  })
}

export function serializeSourcesCollection (collection: SourcesCollection): SourcesCollection {
  return Object.freeze({
    ...serializeResource(collection),
    actions: {
      ...serializeActions(collection.actions),
      upload: collection.actions.upload,
    },
    member: collection.member.map(serializeSource),
  }) as unknown as SourcesCollection
}

export function serializeSource (source: CsvSource): CsvSource {
  return Object.freeze({
    ...serializeResource(source),
    actions: {
      ...serializeActions(source.actions),
      replace: source.actions.replace,
    },
    name: source.name,
    error: source.error,
    columns: source.columns.map(serializeColumn),
    dialect: source.dialect,
    csvMapping: source.csvMapping,
  }) as unknown as CsvSource
}

export function serializeColumn (column: CsvColumn): CsvColumn {
  return Object.freeze({
    ...serializeResource(column),
    name: column.name,
    samples: column.samples,
    order: column.order,
  }) as CsvColumn
}

export function serializeTableCollection (collection: TableCollection): TableCollection {
  return Object.freeze({
    ...serializeResource(collection),
    member: collection.member.map(serializeTable),
  }) as TableCollection
}

export function serializeTable (table: Table): Table {
  return {
    ...serializeResource(table),
    actions: {
      ...serializeActions(table.actions),
      createLiteralColumnMapping: table.actions.createLiteralColumnMapping,
      createReferenceColumnMapping: table.actions.createReferenceColumnMapping,
    },
    name: table.name,
    csvSource: table.csvSource,
    color: table.color,
    identifierTemplate: table.identifierTemplate,
    isObservationTable: table.isObservationTable,
    columnMappings: table.columnMappings.map(serializeColumnMapping),
    csvMapping: table.csvMapping,
    csvw: table.csvw,
  }
}

export function serializeColumnMapping (columnMapping: ColumnMapping): ReferenceColumnMapping | LiteralColumnMapping {
  return columnMapping.types.has(cc.LiteralColumnMapping)
    ? serializeLiteralColumnMapping(columnMapping as LiteralColumnMapping)
    : serializeReferenceColumnMapping(columnMapping as ReferenceColumnMapping)
}

export function serializeLiteralColumnMapping (columnMapping: LiteralColumnMapping): LiteralColumnMapping {
  return Object.freeze({
    ...serializeResource(columnMapping),
    targetProperty: columnMapping.targetProperty,
    sourceColumn: Object.freeze(columnMapping.sourceColumn),
    datatype: columnMapping.datatype,
    language: columnMapping.language,
  })
}

export function serializeReferenceColumnMapping (columnMapping: ReferenceColumnMapping): ReferenceColumnMapping {
  return Object.freeze({
    ...serializeResource(columnMapping),
    targetProperty: columnMapping.targetProperty,
    referencedTable: serializeLink<Table>(columnMapping.referencedTable),
    identifierMapping: columnMapping.identifierMapping.map(serializeIdentifierMapping),
  })
}

export function serializeIdentifierMapping (identifierMapping: IdentifierMapping): IdentifierMapping {
  return Object.freeze({
    ...serializeResource(identifierMapping),
    sourceColumn: serializeLink<CsvColumn>(identifierMapping.sourceColumn),
    referencedColumn: serializeLink<CsvColumn>(identifierMapping.referencedColumn),
  })
}

export function serializeDimensionMetadataCollection (collection: DimensionMetadataCollection): DimensionMetadataCollection {
  return Object.freeze({
    ...serializeResource(collection),
    hasPart: collection.hasPart.map(serializeDimensionMetadata),
  }) as DimensionMetadataCollection
}

export function serializeDimensionMetadata (dimension: DimensionMetadata): DimensionMetadata {
  return Object.freeze({
    ...serializeResource(dimension),
    name: dimension.name,
    about: dimension.about,
    description: dimension.description,
    scaleOfMeasure: dimension.scaleOfMeasure,
  })
}

export function serializeJobCollection (collection: JobCollection): JobCollection {
  const members = collection.member ?? []

  return Object.freeze({
    ...serializeResource(collection),
    actions: {
      ...serializeActions(collection.actions),
      createTransform: collection.actions.createTransform,
      createPublish: collection.actions.createPublish,
    },
    member: members.map(serializeJob),
  }) as unknown as JobCollection
}

export function serializeJob (job: Job): Job {
  return Object.freeze({
    ...serializeResource(job),
    name: job.name,
    created: job.created,
    actionStatus: job.actionStatus,
    link: job.link ? serializeLink(job.link) : null,
  }) as Job
}

export function serializeCubeMetadata (cubeMetadata: Dataset): Dataset {
  return {
    ...serializeResource(cubeMetadata),
    title: cubeMetadata.pointer.out(dcterms.title).terms,
    hasPart: cubeMetadata.hasPart.map(serializeCube),
    dimensionMetadata: serializeLink(cubeMetadata.dimensionMetadata),
  } as Dataset
}

export function serializeCube (cube: Cube): Cube {
  return {
    id: cube.id,
    observations: cube.observations,
    creator: cube.creator,
    dateCreated: cube.dateCreated,
  } as Cube
}

export function serializeResource (resource: RdfResource): RdfResource {
  return {
    id: resource.id,
    types: Object.freeze(resource.types),
    clientPath: resource.clientPath,
    actions: serializeActions(resource.actions),
    pointer: Object.freeze(resource.pointer),
  } as RdfResource
}

export function serializeLink<T extends RdfResource> (resource: Link<T>): Link<T> {
  return {
    id: resource.id,
  } as Link<T>
}

export function serializeActions (actions: Actions): Actions {
  return Object.freeze({
    create: actions.create,
    edit: actions.edit,
    delete: actions.delete,
  })
}
