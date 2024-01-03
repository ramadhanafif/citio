/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Class = "class",
	ClassSimple = "class_simple",
	ClassTopics = "class_topics",
	Teachers = "teachers",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type ClassRecord = {
	name?: string
	wa_reference?: string
}

export type ClassSimpleRecord = {
	kelas: string
	materi: string
	pemateri: string
	pendamping: string
	reminder?: boolean
	tanggal: IsoDateString
}

export type ClassTopicsRecord = {
	assistant?: RecordIdString
	main_teacher?: RecordIdString
	reminder_1st?: boolean
	reminder_2nd?: boolean
	schedule?: IsoDateString
	subtopic?: string
	topic?: string
}

export type TeachersRecord = {
	full_name?: string
	phone_number?: string
}

// Response types include system fields and match responses from the PocketBase API
export type ClassResponse<Texpand = unknown> = Required<ClassRecord> & BaseSystemFields<Texpand>
export type ClassSimpleResponse<Texpand = unknown> = Required<ClassSimpleRecord> & BaseSystemFields<Texpand>
export type ClassTopicsResponse<Texpand = unknown> = Required<ClassTopicsRecord> & BaseSystemFields<Texpand>
export type TeachersResponse<Texpand = unknown> = Required<TeachersRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	class: ClassRecord
	class_simple: ClassSimpleRecord
	class_topics: ClassTopicsRecord
	teachers: TeachersRecord
}

export type CollectionResponses = {
	class: ClassResponse
	class_simple: ClassSimpleResponse
	class_topics: ClassTopicsResponse
	teachers: TeachersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'class'): RecordService<ClassResponse>
	collection(idOrName: 'class_simple'): RecordService<ClassSimpleResponse>
	collection(idOrName: 'class_topics'): RecordService<ClassTopicsResponse>
	collection(idOrName: 'teachers'): RecordService<TeachersResponse>
}
