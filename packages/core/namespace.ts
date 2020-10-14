import namespace from '@rdfjs/namespace'
import { NamedNode } from 'rdf-js'

type CubeCreatorClass =
  'CubeProject' |
  'ProjectsCollection' |
  'CsvMapping' |
  'EntryPoint' |
  'CSVSource' |
  'CSVSourceCollection' |
  'CreateProjectAction' |
  'UploadCSVAction'

type CubeCreatorProperty =
  'projectSourceKind' |
  'projects' |
  'csvMapping' |
  'csvSource' |
  'csvSourceCollection'

type OtherTerms =
  'dash'

type CubeCreatorNamespace = Record<CubeCreatorClass | CubeCreatorProperty | OtherTerms, NamedNode>

export const cube = namespace('http://ns.bergnet.org/cube/')
export const cc: CubeCreatorNamespace = namespace('https://cube-creator.zazuko.com/vocab#') as any
