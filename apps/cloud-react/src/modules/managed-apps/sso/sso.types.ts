export interface Application {
  id: string
  name: string
  slug: string
  description: string
  website_url: string
  icon_url: string
  company_name: string
  industry: string
  support_email: string
  is_active: boolean
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface Configuration {
  id: string
  application_id: string
  env: string
  is_active: boolean
  config?: Record<string, any>
  meta_data?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface CreateApplicationRequest {
  name: string
  description: string
  websiteUrl: string
  iconUrl?: string
  companyName: string
  industry: string
  supportEmail: string
  educationalPlatform: boolean
  metadata?: Record<string, any>
}

export interface UpdateApplicationRequest {
  name: string
  description: string
  websiteUrl: string
  iconUrl?: string
  companyName: string
  industry: string
  supportEmail: string
  educationalPlatform: boolean
  metadata?: Record<string, any>
}

export interface CreateConfigurationRequest {
  env: string
  config?: Record<string, any>
  meta_data?: Record<string, any>
}
