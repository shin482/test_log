'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Circle, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'

type SiteCode = "IJH" | "EWH" | "SCH"

type SubjectRecord = {
  subject_id: string
  baseline: string
  fu1: string
  fu2: string
  fu3: string
  fu4: string
  status: string
  statusText: string
}

type ChecklistItem = {
  id: string
  label: string
  completed: boolean
}

type VisitChecklist = {
  visit: string
  items: ChecklistItem[]
  completed: boolean
}

type SubjectChecklist = {
  subject_id: string
  visits: VisitChecklist[]
}

const SITE_META: Record<SiteCode, { name: string }> = {
  IJH: { name: "인제대학교병원" },
  EWH: { name: "이대목동" },
  SCH: { name: "순천향대학교병원" },
}

// Mock checklist items for each visit
const VISIT_CHECKLIST_ITEMS = [
  '동의서 확인',
  '기초 검사 완료',
  '샘플 채취',
  '데이터 입력',
  'QA 확인'
]

function generateChecklist(subjectId: string, visits: string[]): SubjectChecklist {
  return {
    subject_id: subjectId,
    visits: visits.map(visit => ({
      visit,
      items: VISIT_CHECKLIST_ITEMS.map((label, index) => ({
        id: `${visit}-${index}`,
        label,
        completed: Math.random() > 0.5 // Mock completion
      })),
      completed: false
    }))
  }
}

export default function TrackerPage() {
  const searchParams = useSearchParams()
  const selectedSubject = searchParams.get('subject')
  const [selectedSite, setSelectedSite] = useState<SiteCode>('IJH')
  const [subjects, setSubjects] = useState<SubjectRecord[]>([])
  const [checklists, setChecklists] = useState<Record<string, SubjectChecklist>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (selectedSubject) {
      if (selectedSubject.startsWith('IJH')) setSelectedSite('IJH')
      else if (selectedSubject.startsWith('EWH')) setSelectedSite('EWH')
      else if (selectedSubject.startsWith('SCH')) setSelectedSite('SCH')
    }
  }, [selectedSubject])

  const siteSubjects = useMemo(() => {
    return subjects.filter(subject => {
      // Determine site from subject_id prefix
      if (subject.subject_id.startsWith('IJH')) return selectedSite === 'IJH'
      if (subject.subject_id.startsWith('EWH')) return selectedSite === 'EWH'
      if (subject.subject_id.startsWith('SCH')) return selectedSite === 'SCH'
      return false
    })
  }, [subjects, selectedSite])

  const toggleChecklistItem = (subjectId: string, visit: string, itemId: string) => {
    setChecklists(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        visits: prev[subjectId].visits.map(v =>
          v.visit === visit
            ? {
                ...v,
                items: v.items.map(item =>
                  item.id === itemId
                    ? { ...item, completed: !item.completed }
                    : item
                )
              }
            : v
        )
      }
    }))
  }

  const getVisitProgress = (visit: VisitChecklist) => {
    const completed = visit.items.filter(item => item.completed).length
    return Math.round((completed / visit.items.length) * 100)
  }

  const getSubjectProgress = (subjectChecklist: SubjectChecklist) => {
    const totalItems = subjectChecklist.visits.reduce((sum, visit) => sum + visit.items.length, 0)
    const completedItems = subjectChecklist.visits.reduce((sum, visit) =>
      sum + visit.items.filter(item => item.completed).length, 0)
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Visit Tracker</h1>
          <p className="text-muted-foreground">오늘 방문 대상자 체크리스트 관리</p>
        </div>

        <Tabs value={selectedSite} onValueChange={(value) => setSelectedSite(value as SiteCode)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(SITE_META).map(([code, meta]) => (
              <TabsTrigger key={code} value={code}>
                {meta.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(SITE_META).map(siteCode => (
            <TabsContent key={siteCode} value={siteCode} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {siteSubjects.map(subject => {
                  const checklist = checklists[subject.subject_id]
                  const progress = checklist ? getSubjectProgress(checklist) : 0
                  const isSelected = selectedSubject === subject.subject_id

                  return (
                    <Card key={subject.subject_id} className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{subject.subject_id}</CardTitle>
                          <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                            {progress}%
                          </Badge>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </CardHeader>
                      <CardContent>
                        {checklist && (
                          <div className="space-y-3">
                            {checklist.visits.map(visit => {
                              const visitProgress = getVisitProgress(visit)
                              return (
                                <div key={visit.visit} className="border rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{visit.visit.toUpperCase()}</span>
                                    <div className="flex items-center gap-1">
                                      {visitProgress === 100 ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span className="text-xs text-muted-foreground">{visitProgress}%</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    {visit.items.slice(0, 2).map(item => (
                                      <div key={item.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={item.completed}
                                          onCheckedChange={() => toggleChecklistItem(subject.subject_id, visit.visit, item.id)}
                                          className="h-3 w-3"
                                        />
                                        <label className="text-xs text-muted-foreground">{item.label}</label>
                                      </div>
                                    ))}
                                    {visit.items.length > 2 && (
                                      <p className="text-xs text-muted-foreground">
                                        +{visit.items.length - 2}개 항목
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  )
}