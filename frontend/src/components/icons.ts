import {
  Ban, Building2, ClipboardCheck, Cpu, FileText, FolderKanban, GitBranch, Globe, ListChecks,
  Server, Sparkles, Tag, User, Users, UsersRound, Workflow, type LucideIcon,
} from 'lucide-react'
import type { EntityType } from '../types'

export const typeIcon: Record<EntityType, LucideIcon> = {
  project: FolderKanban,
  map: GitBranch,
  process: Workflow,
  activity: ListChecks,
  role: Users,
  system: Server,
  person: User,
  external: Building2,
  document: FileText,
  requirement: ClipboardCheck,
  component: Cpu,
  team: UsersRound,
  topic: Tag,
  country: Globe,
  constraint: Ban,
}

/** Icon of the synthetic "Overview" root */
export const RootIcon = Sparkles
