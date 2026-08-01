// Shapes mirror cloud-be-go: apps/compute/sshkeys entity + request DTO.

export interface SSHKey {
    id: string
    tenant_serial: number
    created_at: string
    updated_at: string
    name: string
    public_key: string
    fingerprint: string
    user_id: string
    account_id?: string
}

export interface CreateSSHKeyRequest {
    name: string
    public_key: string
}
