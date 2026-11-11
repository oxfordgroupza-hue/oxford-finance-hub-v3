export function isActivePartnerAccount(account: { accountType: string; status: string } | null | undefined): boolean {
  return account?.accountType === 'partner' && account.status === 'active'
}
