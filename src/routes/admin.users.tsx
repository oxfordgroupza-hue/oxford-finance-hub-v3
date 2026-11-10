import { useState } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { ArrowLeft, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { getAdminConsoleData, assignUserRole, revokeUserRole, suspendUserAccount, reinstateUserAccount, saveCustomRole, setCustomRoleActive, setUserPermissionOverride, revokeUserPermissionOverride } from '@/lib/admin-actions'
import { formatDateTime } from '@/lib/format'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'

export const Route = createFileRoute('/admin/users')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
      throw redirect({ to: '/login' })
    }
  },
  loader: () => getAdminConsoleData(),
  head: () => ({ meta: [{ title: 'User & role administration | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [view, setView] = useState<'users' | 'roles' | 'permissions'>('users')
  const [selectedRole, setSelectedRole] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null)
  const [busyUser, setBusyUser] = useState<string | null>(null)
  const [roleEditor, setRoleEditor] = useState<{
    roleId?: string; key: string; name: string; description: string;
    audience: 'office' | 'customer' | 'partner' | 'service'; permissions: string[]
  } | null>(null)
  const [roleBusy, setRoleBusy] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null)
  const [overridePermission, setOverridePermission] = useState('')
  const [overrideEffect, setOverrideEffect] = useState<'grant' | 'deny'>('deny')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideBusy, setOverrideBusy] = useState(false)

  const refresh = async () => { await router.invalidate() }
  const activeRoleIds = new Set(data.assignments.filter((assignment) => !assignment.revokedAt).map((assignment) => `${assignment.userId}:${assignment.roleId}`))
  const activeSuspensions = new Set(data.suspensions.filter((suspension) => !suspension.liftedAt).map((suspension) => suspension.userId))

  const assign = async (userId: string) => {
    const roleId = selectedRole[userId]
    if (!roleId) return
    setBusyUser(userId)
    try {
      const result = await assignUserRole({ data: { userId, roleId } })
      toast.success(result.note)
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not assign role.') }
    finally { setBusyUser(null) }
  }
  const revoke = async (userId: string, roleId: string) => {
    setBusyUser(userId)
    try {
      const result = await revokeUserRole({ data: { userId, roleId } })
      toast.success(result.note)
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not revoke role.') }
    finally { setBusyUser(null) }
  }
  const suspend = async (userId: string) => {
    if (reason.trim().length < 5) { toast.error('Enter a clear reason of at least five characters.'); return }
    setBusyUser(userId)
    try {
      await suspendUserAccount({ data: { userId, reason: reason.trim() } })
      toast.success('Account suspended.')
      setReason('')
      setSuspendTarget(null)
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not suspend account.') }
    finally { setBusyUser(null) }
  }
  const reinstate = async (userId: string) => {
    setBusyUser(userId)
    try {
      await reinstateUserAccount({ data: { userId } })
      toast.success('Account reinstated.')
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not reinstate account.') }
    finally { setBusyUser(null) }
  }

  const addOverride = async (userId: string) => {
    if (!overridePermission || overrideReason.trim().length < 5) {
      toast.error('Choose a permission and provide a reason of at least five characters.')
      return
    }
    setOverrideBusy(true)
    try {
      await setUserPermissionOverride({ data: {
        userId, permission: overridePermission, effect: overrideEffect, reason: overrideReason.trim(),
      } })
      toast.success('Permission override saved.')
      setOverrideTarget(null)
      setOverridePermission('')
      setOverrideReason('')
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save permission override.') }
    finally { setOverrideBusy(false) }
  }

  const revokeOverride = async (overrideId: string) => {
    setOverrideBusy(true)
    try {
      await revokeUserPermissionOverride({ data: { overrideId } })
      toast.success('Permission override revoked.')
      await refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not revoke permission override.') }
    finally { setOverrideBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#c7a45a]">Oxford Business Group</p><h1 className="mt-1 font-serif text-3xl">User & access administration</h1></div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#d8bd7c]"><ArrowLeft className="size-4" /> Super Admin</Link>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8">
        <section className="rounded-lg border border-[#c7a45a]/25 bg-[#171510] p-5">
          <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-[#d8bd7c]" /><h2 className="font-serif text-2xl">Protected controls</h2></div>
          <p className="mt-2 text-sm leading-6 text-white/60">All account and role changes are checked on the server and written to the append-only security audit trail. Database-backed role and permission changes are re-evaluated on each protected request.</p>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button variant={view === 'users' ? 'gold' : 'outlineGold'} onClick={() => setView('users')}><Users className="size-4" /> Users ({data.users.length})</Button>
          <Button variant={view === 'roles' ? 'gold' : 'outlineGold'} onClick={() => setView('roles')}>System roles ({data.roles.length})</Button>
          <Button variant={view === 'permissions' ? 'gold' : 'outlineGold'} onClick={() => setView('permissions')}>Permission catalogue ({data.permissions.length})</Button>
        </div>

        {view === 'users' && (
          <section className="space-y-4">
            {data.users.map((user) => {
              const assigned = data.assignments.filter((assignment) => assignment.userId === user.id && !assignment.revokedAt)
              const eligibleRoles = data.roles.filter((role) => role.audience === user.accountType && role.isActive && !activeRoleIds.has(`${user.id}:${role.id}`))
              const suspended = activeSuspensions.has(user.id)
              return (
                <article key={user.id} className="rounded-lg border border-white/10 bg-[#121212] p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <p className="font-medium">{user.displayName || user.email}</p>
                      <p className="mt-1 break-all text-sm text-white/55">{user.email}</p>
                      <p className="mt-2 text-xs text-white/40">{user.accountType} · {user.status} · last login {user.lastLoginAt ? formatDateTime(String(user.lastLoginAt)) : 'never'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suspended ? <Button size="sm" variant="outlineGold" disabled={busyUser === user.id} onClick={() => void reinstate(user.id)}>Reinstate account</Button> : (
                        <Button size="sm" variant="outline" disabled={busyUser === user.id || user.status !== 'active'} onClick={() => setSuspendTarget(suspendTarget === user.id ? null : user.id)}>Suspend account</Button>
                      )}
                    </div>
                  </div>
                  {suspendTarget === user.id && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row">
                      <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for suspension" className="bg-black/30" />
                      <Button size="sm" variant="destructive" disabled={busyUser === user.id} onClick={() => void suspend(user.id)}>Confirm suspension</Button>
                    </div>
                  )}
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-xs uppercase tracking-wider text-white/45">Active roles</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assigned.length ? assigned.map((assignment) => (
                        <span key={assignment.roleId} className="inline-flex items-center gap-2 rounded border border-[#c7a45a]/25 bg-[#c7a45a]/10 px-3 py-1.5 text-xs text-[#e5cc91]">
                          {assignment.roleName}
                          <button type="button" disabled={busyUser === user.id} onClick={() => void revoke(user.id, assignment.roleId)} className="text-white/50 hover:text-white" aria-label={`Revoke ${assignment.roleName}`}>×</button>
                        </span>
                      )) : <span className="text-xs text-white/40">No role assigned</span>}
                    </div>
                    {eligibleRoles.length > 0 && user.status === 'active' && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Select value={selectedRole[user.id] || ''} onValueChange={(roleId) => setSelectedRole((current) => ({ ...current, [user.id]: roleId }))}>
                          <SelectTrigger className="sm:max-w-xs bg-black/30"><SelectValue placeholder="Choose a role to assign" /></SelectTrigger>
                          <SelectContent>{eligibleRoles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="sm" variant="outlineGold" disabled={!selectedRole[user.id] || busyUser === user.id} onClick={() => void assign(user.id)}>Assign role</Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-white/45">Individual permission overrides</p>
                        <p className="mt-1 text-xs text-white/40">Overrides take precedence over role permissions and are recorded in the security audit trail.</p>
                      </div>
                      <Button size="sm" variant="outlineGold" disabled={user.status !== 'active' || overrideBusy}
                        onClick={() => {
                          setOverrideTarget(overrideTarget === user.id ? null : user.id)
                          setOverridePermission('')
                          setOverrideEffect('deny')
                          setOverrideReason('')
                        }}>
                        {overrideTarget === user.id ? 'Close' : 'Add override'}
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {data.overrides.filter((override) => override.userId === user.id && !override.revokedAt &&
                        (!override.expiresAt || override.expiresAt.getTime() > Date.now())).map((override) => (
                        <div key={override.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-black/20 px-3 py-2 text-xs">
                          <span className="min-w-0 break-all">
                            <span className="font-medium text-white/85">{override.permission}</span>
                            <span className={override.effect === 'deny' ? 'ml-2 text-red-300' : 'ml-2 text-emerald-300'}>{override.effect}</span>
                            {override.reason && <span className="ml-2 text-white/40">· {override.reason}</span>}
                          </span>
                          <Button size="sm" variant="ghost" disabled={overrideBusy} onClick={() => void revokeOverride(override.id)}>Revoke</Button>
                        </div>
                      ))}
                      {!data.overrides.some((override) => override.userId === user.id && !override.revokedAt &&
                        (!override.expiresAt || override.expiresAt.getTime() > Date.now())) &&
                        <p className="text-xs text-white/35">No active overrides.</p>}
                    </div>
                    {overrideTarget === user.id && (
                      <div className="mt-4 grid gap-3 rounded border border-[#c7a45a]/20 bg-black/20 p-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs text-white/55">Permission</p>
                          <Select value={overridePermission} onValueChange={setOverridePermission}>
                            <SelectTrigger className="bg-black/30"><SelectValue placeholder="Choose a permission" /></SelectTrigger>
                            <SelectContent>
                              {data.permissions.filter((permission) => permission.accountTypes.includes(user.accountType)).map((permission) => (
                                <SelectItem key={permission.key} value={permission.key}>{permission.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <p className="mb-1 text-xs text-white/55">Effect</p>
                          <Select value={overrideEffect} onValueChange={(value) => setOverrideEffect(value as 'grant' | 'deny')}>
                            <SelectTrigger className="bg-black/30"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deny">Deny permission</SelectItem>
                              <SelectItem value="grant">Grant permission</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2">
                          <Input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)}
                            placeholder="Reason for this override (minimum five characters)" className="bg-black/30" />
                        </div>
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <Button size="sm" disabled={overrideBusy || !overridePermission || overrideReason.trim().length < 5}
                            onClick={() => void addOverride(user.id)}>Save override</Button>
                          <Button size="sm" variant="ghost" disabled={overrideBusy} onClick={() => setOverrideTarget(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
            {data.users.length === 0 && <p className="rounded border border-white/10 p-6 text-sm text-white/50">No accounts have been provisioned.</p>}
          </section>
        )}

        {view === 'roles' && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-serif text-2xl">Role and permission manager</h2><p className="mt-1 text-sm text-white/50">System roles are protected. Custom roles can be tailored to the least privilege required.</p></div>
              <Button variant="outlineGold" onClick={() => setRoleEditor({ key: '', name: '', description: '', audience: 'office', permissions: [] })}>Create custom role</Button>
            </div>
            {roleEditor && (
              <article className="rounded-lg border border-[#c7a45a]/35 bg-[#171510] p-5">
                <h3 className="font-serif text-xl">{roleEditor.roleId ? 'Edit custom role' : 'New custom role'}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input value={roleEditor.name} onChange={(event) => setRoleEditor((current) => current && ({ ...current, name: event.target.value }))} placeholder="Role name" className="bg-black/30" />
                  <Input value={roleEditor.key} onChange={(event) => setRoleEditor((current) => current && ({ ...current, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))} placeholder="role_key" className="bg-black/30" />
                  <Input value={roleEditor.description} onChange={(event) => setRoleEditor((current) => current && ({ ...current, description: event.target.value }))} placeholder="Description" className="bg-black/30 sm:col-span-2" />
                  <Select value={roleEditor.audience} onValueChange={(audience) => setRoleEditor((current) => current && ({ ...current, audience: audience as typeof current.audience, permissions: [] }))}>
                    <SelectTrigger className="bg-black/30"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="office">Office</SelectItem><SelectItem value="customer">Customer</SelectItem><SelectItem value="partner">Partner</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent>
                  </Select>
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-white/50">Permissions allowed for {roleEditor.audience} accounts</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.permissions.filter((permission) => permission.accountTypes.includes(roleEditor.audience)).map((permission) => (
                    <label key={permission.key} className="flex items-start gap-2 rounded border border-white/10 bg-black/20 p-2 text-xs">
                      <input type="checkbox" checked={roleEditor.permissions.includes(permission.key)} onChange={(event) => setRoleEditor((current) => current && ({
                        ...current, permissions: event.target.checked
                          ? [...current.permissions, permission.key]
                          : current.permissions.filter((key) => key !== permission.key),
                      }))} />
                      <span>{permission.label}<span className="mt-0.5 block text-white/35">{permission.key}</span></span>
                    </label>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <Button disabled={roleBusy || !roleEditor.key || !roleEditor.name} onClick={async () => {
                    setRoleBusy(true)
                    try {
                      await saveCustomRole({ data: roleEditor })
                      toast.success('Custom role saved.')
                      setRoleEditor(null)
                      await refresh()
                    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save role.') }
                    finally { setRoleBusy(false) }
                  }}>Save role</Button>
                  <Button variant="ghost" onClick={() => setRoleEditor(null)}>Cancel</Button>
                </div>
              </article>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {data.roles.map((role) => {
                const template = data.templates.find((item) => item.key === role.key)
                const rolePermissionKeys = data.rolePermissions.filter((item) => item.roleId === role.id).map((item) => item.key)
                return <article key={role.id} className="rounded-lg border border-white/10 bg-[#121212] p-5">
                  <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{role.name}</h2><span className="text-xs text-[#d8bd7c]">{role.isReserved ? 'Reserved' : role.isSystem ? 'System' : 'Custom'}</span></div>
                  <p className="mt-1 text-xs text-white/40">{role.audience} · {role.isActive ? 'Active' : 'Inactive'}</p>
                  <p className="mt-3 text-sm leading-6 text-white/60">{role.description}</p>
                  <p className="mt-3 text-xs text-white/40">{template?.permissions.length ?? rolePermissionKeys.length} permissions</p>
                  {!role.isSystem && !role.isReserved && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                      <Button size="sm" variant="outlineGold" onClick={() => setRoleEditor({
                        roleId: role.id, key: role.key, name: role.name, description: role.description,
                        audience: role.audience, permissions: rolePermissionKeys,
                      })}>Edit permissions</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        setRoleBusy(true)
                        try { await setCustomRoleActive({ data: { roleId: role.id, active: !role.isActive } }); toast.success(role.isActive ? 'Role deactivated.' : 'Role activated.'); await refresh() }
                        catch (error) { toast.error(error instanceof Error ? error.message : 'Could not change role status.') }
                        finally { setRoleBusy(false) }
                      }} disabled={roleBusy}>{role.isActive ? 'Deactivate' : 'Activate'}</Button>
                    </div>
                  )}
                </article>
              })}
            </div>
          </section>
        )}

        {view === 'permissions' && (
          <section className="rounded-lg border border-white/10 bg-[#121212] p-5">
            <h2 className="font-serif text-2xl">Permission catalogue</h2>
            <div className="mt-4 divide-y divide-white/10">
              {data.permissions.map((permission) => <div key={permission.key} className="flex flex-col justify-between gap-1 py-3 sm:flex-row">
                <div><p className="text-sm font-medium">{permission.label}</p><p className="mt-1 text-xs text-white/40">{permission.key}</p></div>
                <p className="text-xs text-white/50">{permission.scope} · {permission.accountTypes.join(', ')}</p>
              </div>)}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
