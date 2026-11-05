import { LayoutDashboard, GraduationCap, Building2, BriefcaseBusiness, FileCheck2, ShieldCheck, Tags, Sparkles, ChartNoAxesCombined, FileBarChart2, Bell, History, Settings } from 'lucide-react'

export const adminNavigation = [
  { label: 'OVERVIEW', items: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  ] },
  { label: 'MANAGEMENT', items: [
    { label: 'Students', path: '/dashboard/students', icon: GraduationCap },
    { label: 'Employers', path: '/dashboard/employers', icon: Building2 },
    { label: 'Job Listings', path: '/dashboard/jobs', icon: BriefcaseBusiness },
    { label: 'Applications', path: '/dashboard/applications', icon: FileCheck2 },
    { label: 'Approvals', path: '/dashboard/approvals', icon: ShieldCheck },
  ] },
  { label: 'AI & ANALYTICS', items: [
    { label: 'Skills Management', path: '/dashboard/skills', icon: Tags },
    { label: 'AI Job Matching', path: '/dashboard/matching', icon: Sparkles },
    { label: 'Skill Gap Analytics', path: '/dashboard/skill-gaps', icon: ChartNoAxesCombined },
    { label: 'Reports', path: '/dashboard/reports', icon: FileBarChart2 },
  ] },
  { label: 'SYSTEM', items: [
    { label: 'Notifications', path: '/dashboard/notifications', icon: Bell },
    { label: 'Activity Logs', path: '/dashboard/activity-logs', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
  ] },
]
