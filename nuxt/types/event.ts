export type Visibility = 'PUBLIC' | 'PRIVATE'

export class Event {
  authorUsername: string
  description?: string
  end: Date
  id: string
  isArchived: boolean
  isInPerson: boolean
  isRemote: boolean
  location: string
  name: string
  slug?: string
  start: Date
  url?: string
  visibility: Visibility

  constructor(
    id: string,
    authorUsername: string,
    end: Date,
    isArchived: boolean,
    isInPerson: boolean,
    isRemote: boolean,
    location: string,
    name: string,
    start: Date,
    visibility: Visibility
  ) {
    this.id = id
    this.authorUsername = authorUsername
    this.end = end
    this.isArchived = isArchived
    this.isInPerson = isInPerson
    this.isRemote = isRemote
    this.location = location
    this.name = name
    this.start = start
    this.visibility = visibility
  }
}
