import {
  Ban, Building2, ClipboardCheck, Cpu, FileText, FolderKanban, GitBranch, Globe, ListChecks,
  Server, Sparkles, Tag, User, Users, UsersRound, Workflow, type LucideIcon,
} from 'lucide-react'
import type { EntityType } from '../types'

export const typeIcon: Record<EntityType, LucideIcon> = {
  progetto: FolderKanban,
  mappa: GitBranch,
  processo: Workflow,
  attivita: ListChecks,
  ruolo: Users,
  sistema: Server,
  persona: User,
  esterno: Building2,
  documento: FileText,
  requisito: ClipboardCheck,
  componente: Cpu,
  team: UsersRound,
  tema: Tag,
  paese: Globe,
  vincolo: Ban,
}

/** Icon of the synthetic "Overview" root */
export const RootIcon = Sparkles
