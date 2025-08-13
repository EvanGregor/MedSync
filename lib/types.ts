export interface PatientInfo {
  patientId: string
  fullName: string
  dateOfBirth: string
  age: number
  gender: string
  phoneNumber: string
  address: string
  eyeSide: string
  familyHistoryOfCancer: string
  previousDiagnosis: string
  ongoingTreatments: string
  recordCreated: string
  lastUpdated: string
}

export interface ReportResult {
  // Legacy fields (to be removed)
  prediction?: boolean
  probability?: number
  message?: string
  success?: boolean
  
  // Med-Gemma specific fields
  findings?: string
  confidence?: number
  recommendations?: string
  severity?: string
}

export interface Report {
  id: string
  
  // Database column names (snake_case)
  patient_id: string
  test_type: string
  original_name: string
  file_name: string
  uploaded_at: string
  priority: string
  notes?: string
  user_name?: string
  
  // Image URLs
  original_image_url?: string
  overlayed_image_url?: string
  masked_image_url?: string
  
  // JSONB fields from database
  result?: ReportResult
  patient_info?: PatientInfo
  
  // Legacy fields (camelCase)
  overlayedImageUrl?: string
  maskedImageUrl?: string
  originalImageUrl?: string
  patientInfo?: PatientInfo
  createdAt?: string
  updatedAt?: string
} 