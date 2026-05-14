export interface StudyQuota {
  subject: string
  dailyLoad: number
  examDate: string
}

const QUOTA_KEY = 'haku_study_quota'

export function saveStudyQuota(q: StudyQuota): void {
  localStorage.setItem(QUOTA_KEY, JSON.stringify(q))
}

export function getStudyQuota(): StudyQuota | null {
  const raw = localStorage.getItem(QUOTA_KEY)
  if (!raw) return null
  try {
    const q = JSON.parse(raw) as StudyQuota
    return new Date(q.examDate) > new Date() ? q : null
  } catch {
    return null
  }
}
