'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Circle, Search, Calendar, Filter, Users, Clock, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type SiteCode = "IJH" | "EWH" | "SCH"

type VisitType = "Baseline" | "F/U"

type ChecklistItem = {
  id: string
  label: string
  completed: boolean
}

type SItemDetail = {
  collected: boolean
  method?: 'direct' | 'email' | 'sms' | 'other'
  otherMethod?: string
  date?: string
}

type LabCollection = {
  collected: boolean
  testDate?: string
  memo?: string
}

type SubjectVisit = {
  id: string
  name: string
  visitType: VisitType
  time: string
  site: SiteCode
  checklist: ChecklistItem[]
  progress: number
  status: 'pending' | 'in-progress' | 'completed'
  sDetail?: SItemDetail
  labCollection?: LabCollection
}

const SITE_META: Record<SiteCode, { name: string; color: string; bgColor: string; borderColor: string }> = {
  IJH: {
    name: "인제대학교병원",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800"
  },
  EWH: {
    name: "이대목동병원",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800"
  },
  SCH: {
    name: "순천향대학교병원",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800"
  },
}

const BASELINE_CHECKLIST = [
  { id: 'T', label: 'T' },
  { id: 'P', label: 'P' },
  { id: 'I', label: 'I' },
  { id: 'S', label: 'S' },
  { id: 'E', label: 'E' },
  { id: '2D', label: '2D' },
  { id: '3D', label: '3D' },
  { id: 'cm', label: 'cm' },
  { id: 'SC', label: 'SC' },
  { id: 'EN', label: 'EN' },
]

const FU_CHECKLIST = [
  { id: 'T', label: 'T' },
  { id: 'P', label: 'P' },
  { id: 'I', label: 'I' },
  { id: 'E', label: 'E' },
  { id: '2D', label: '2D' },
  { id: 'cm', label: 'cm' },
]

// Mock data for today's visits
const MOCK_VISITS: SubjectVisit[] = [
  {
    id: 'IJH-001',
    name: '김철수',
    visitType: 'Baseline',
    time: '09:00',
    site: 'IJH',
    checklist: BASELINE_CHECKLIST.map(item => ({ ...item, completed: Math.random() > 0.7 })),
    progress: 0,
    status: 'in-progress',
    sDetail: { collected: false },
    labCollection: { collected: false }
  },
  {
    id: 'IJH-002',
    name: '이영희',
    visitType: 'F/U',
    time: '10:30',
    site: 'IJH',
    checklist: FU_CHECKLIST.map(item => ({ ...item, completed: Math.random() > 0.5 })),
    progress: 0,
    status: 'pending',
    sDetail: { collected: false },
    labCollection: { collected: false }
  },
  {
    id: 'EWH-001',
    name: '박민수',
    visitType: 'Baseline',
    time: '11:00',
    site: 'EWH',
    checklist: BASELINE_CHECKLIST.map(item => ({ ...item, completed: Math.random() > 0.8 })),
    progress: 0,
    status: 'completed',
    sDetail: { collected: false },
    labCollection: { collected: false }
  },
  {
    id: 'EWH-002',
    name: '정수진',
    visitType: 'F/U',
    time: '14:00',
    site: 'EWH',
    checklist: FU_CHECKLIST.map(item => ({ ...item, completed: Math.random() > 0.6 })),
    progress: 0,
    status: 'in-progress',
    sDetail: { collected: false },
    labCollection: { collected: false }
  },
  {
    id: 'SCH-001',
    name: '최지은',
    visitType: 'F/U',
    time: '15:30',
    site: 'SCH',
    checklist: FU_CHECKLIST.map(item => ({ ...item, completed: Math.random() > 0.4 })),
    progress: 0,
    status: 'pending',
    sDetail: { collected: false },
    labCollection: { collected: false }
  },
  {
    id: 'SCH-002',
    name: '강민준',
    visitType: 'Baseline',
    time: '16:00',
    site: 'SCH',
    checklist: BASELINE_CHECKLIST.map(item => ({ ...item, completed: false })),
    progress: 0,
    status: 'pending',
    sDetail: { collected: false },
    labCollection: { collected: false }
  },
]

export default function TrackerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    }>
      <TrackerPageContent />
    </Suspense>
  )
}

const calculateProgress = (checklist: ChecklistItem[]): number => {
  if (checklist.length === 0) return 0
  const completed = checklist.filter(item => item.completed).length
  return Math.round((completed / checklist.length) * 100)
}

const calculateStatus = (progress: number): 'pending' | 'in-progress' | 'completed' => {
  if (progress === 0) return 'pending'
  if (progress === 100) return 'completed'
  return 'in-progress'
}

function TrackerPageContent() {
  const searchParams = useSearchParams()
  const selectedSubject = searchParams.get('subject')
  const [selectedSite, setSelectedSite] = useState<SiteCode>('IJH')
  const [visits, setVisits] = useState<SubjectVisit[]>(MOCK_VISITS)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')

  // Initialize progress on mount
  useEffect(() => {
    setVisits(prevVisits =>
      prevVisits.map(visit => {
        const progress = calculateProgress(visit.checklist)
        const status = calculateStatus(progress)
        return { ...visit, progress, status }
      })
    )
  }, [])

  // Auto-select subject from URL params
  useEffect(() => {
    if (selectedSubject) {
      const visit = visits.find(v => v.id === selectedSubject)
      if (visit) {
        setSelectedSite(visit.site)
        setSelectedVisitId(visit.id)
      }
    }
  }, [selectedSubject])

  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const matchesSite = visit.site === selectedSite
      const matchesSearch = visit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           visit.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || visit.status === statusFilter
      return matchesSite && matchesSearch && matchesStatus
    })
  }, [visits, selectedSite, searchQuery, statusFilter])

  // Get current visit from visits array to ensure it's always in sync
  const currentVisit = useMemo(() => {
    return visits.find(v => v.id === selectedVisitId) || null
  }, [visits, selectedVisitId])

  const toggleChecklistItem = (visitId: string, itemId: string) => {
    setVisits(prevVisits =>
      prevVisits.map(visit => {
        if (visit.id !== visitId) return visit
        
        const updatedChecklist = visit.checklist.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        )
        
        const progress = calculateProgress(updatedChecklist)
        const status = calculateStatus(progress)
        
        return {
          ...visit,
          checklist: updatedChecklist,
          progress,
          status
        }
      })
    )
  }

  const updateSDetail = (visitId: string, detail: Partial<SItemDetail>) => {
    setVisits(prevVisits =>
      prevVisits.map(visit =>
        visit.id === visitId
          ? {
              ...visit,
              sDetail: { ...visit.sDetail, ...detail }
            }
          : visit
      )
    )
  }

  const updateLabCollection = (visitId: string, detail: Partial<LabCollection>) => {
    setVisits(prevVisits =>
      prevVisits.map(visit =>
        visit.id === visitId
          ? {
              ...visit,
              labCollection: { ...visit.labCollection, ...detail }
            }
          : visit
      )
    )
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Visit Tracker</h1>
              <p className="text-muted-foreground mt-1">오늘 방문 대상자 체크리스트 관리</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{today}</span>
            </div>
          </div>
        </div>

        {/* Site Selection Tabs */}
        <Tabs value={selectedSite} onValueChange={(value) => setSelectedSite(value as SiteCode)} className="w-full mb-6">
          <TabsList className="grid w-full grid-cols-3">
            {Object.entries(SITE_META).map(([code, meta]) => (
              <TabsTrigger key={code} value={code} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  code === 'IJH' ? 'bg-blue-500' :
                  code === 'EWH' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {meta.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 ID로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="in-progress">진행중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {Object.keys(SITE_META).map(siteCode => (
            <TabsContent key={siteCode} value={siteCode} className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visit List */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">오늘 방문 대상자</h2>
                    <Badge variant="secondary">{filteredVisits.length}명</Badge>
                  </div>

                  {filteredVisits.length === 0 ? (
                    <Card>
                      <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>해당 조건의 방문자가 없습니다.</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredVisits.map(visit => (
                      <Card
                        key={visit.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedVisitId === visit.id
                            ? `${SITE_META[visit.site].borderColor} border-2 shadow-md`
                            : 'hover:border-border'
                        }`}
                        onClick={() => setSelectedVisitId(visit.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                visit.site === 'IJH' ? 'bg-blue-500' :
                                visit.site === 'EWH' ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              <div>
                                <CardTitle className="text-lg">{visit.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                  <span>{visit.id}</span>
                                  <span>•</span>
                                  <Clock className="h-3 w-3" />
                                  <span>{visit.time}</span>
                                </CardDescription>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={visit.status === 'completed' ? 'default' : 'secondary'}
                                className="mb-2"
                              >
                                {visit.status === 'completed' ? '완료' :
                                 visit.status === 'in-progress' ? '진행중' : '대기중'}
                              </Badge>
                              <div className="text-sm text-muted-foreground">
                                {visit.progress}%
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={SITE_META[visit.site].color}>
                              {visit.visitType}
                            </Badge>
                            <Progress value={visit.progress} className="flex-1 h-2" />
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>

                {/* Checklist Detail */}
                <div className="space-y-4">
                  {currentVisit ? (
                    <>
                      {/* Lab Collection Section */}
                      <Card className={`${SITE_META[currentVisit.site].bgColor} ${SITE_META[currentVisit.site].borderColor} border`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            Lab 수집 확인
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-3 p-3 rounded-lg border bg-background">
                            <Checkbox
                              id={`${currentVisit.id}-lab-collected`}
                              checked={currentVisit.labCollection?.collected || false}
                              onCheckedChange={(checked) =>
                                updateLabCollection(currentVisit.id, { collected: checked as boolean })
                              }
                              className="h-5 w-5"
                            />
                            <label
                              htmlFor={`${currentVisit.id}-lab-collected`}
                              className="font-medium cursor-pointer select-none"
                            >
                              Lab 수집 완료
                            </label>
                          </div>

                          {currentVisit.labCollection?.collected && (
                            <div className="space-y-3 pt-2 border-t">
                              <div>
                                <label className="text-sm font-medium mb-2 block">검사일자</label>
                                <Input
                                  type="date"
                                  value={currentVisit.labCollection.testDate || ''}
                                  onChange={(e) =>
                                    updateLabCollection(currentVisit.id, { testDate: e.target.value })
                                  }
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">메모 (선택)</label>
                                <textarea
                                  placeholder="검사값이나 특이사항 기록..."
                                  value={currentVisit.labCollection.memo || ''}
                                  onChange={(e) =>
                                    updateLabCollection(currentVisit.id, { memo: e.target.value })
                                  }
                                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Checklist Section */}
                      <Card className={`${SITE_META[currentVisit.site].bgColor} ${SITE_META[currentVisit.site].borderColor} border`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  currentVisit.site === 'IJH' ? 'bg-blue-500' :
                                  currentVisit.site === 'EWH' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                {currentVisit.name}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {currentVisit.id} • {currentVisit.visitType} • {currentVisit.time}
                              </CardDescription>
                            </div>
                            <Badge variant={currentVisit.status === 'completed' ? 'default' : 'secondary'}>
                              {currentVisit.progress}%
                            </Badge>
                          </div>
                          <Progress value={currentVisit.progress} className="mt-3" />
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                              체크리스트
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              {currentVisit.checklist.map(item => (
                                <div key={item.id}>
                                  <div
                                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                      item.completed
                                        ? 'bg-muted/50 border-muted'
                                        : 'bg-background border-border hover:border-primary/50'
                                    }`}
                                  >
                                    <Checkbox
                                      id={`${currentVisit.id}-${item.id}`}
                                      checked={item.completed}
                                      onCheckedChange={() => toggleChecklistItem(currentVisit.id, item.id)}
                                      className="h-5 w-5"
                                    />
                                    <label
                                      htmlFor={`${currentVisit.id}-${item.id}`}
                                      className={`font-medium cursor-pointer select-none ${
                                        item.completed ? 'line-through text-muted-foreground' : ''
                                      }`}
                                    >
                                      {item.label}
                                    </label>
                                  </div>

                                  {/* S Item Detail Section */}
                                  {item.id === 'S' && currentVisit.checklist.find(c => c.id === 'S')?.completed && (
                                    <div className="mt-2 ml-0 p-3 bg-background border border-dashed rounded-lg space-y-3">
                                      <div>
                                        <label className="text-sm font-medium mb-2 block">사본 전달 방식</label>
                                        <Select
                                          value={currentVisit.sDetail?.method || ''}
                                          onValueChange={(value) =>
                                            updateSDetail(currentVisit.id, { 
                                              method: value as 'direct' | 'email' | 'sms' | 'other',
                                              otherMethod: undefined
                                            })
                                          }
                                        >
                                          <SelectTrigger className="text-sm">
                                            <SelectValue placeholder="전달 방식 선택" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="direct">직접 전달</SelectItem>
                                            <SelectItem value="email">이메일 전달</SelectItem>
                                            <SelectItem value="sms">문자/카카오톡 전달</SelectItem>
                                            <SelectItem value="other">기타</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {currentVisit.sDetail?.method === 'other' && (
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">기타 전달 방식</label>
                                          <Input
                                            placeholder="기타 방식 입력..."
                                            value={currentVisit.sDetail.otherMethod || ''}
                                            onChange={(e) =>
                                              updateSDetail(currentVisit.id, { otherMethod: e.target.value })
                                            }
                                            className="text-sm"
                                          />
                                        </div>
                                      )}

                                      {currentVisit.sDetail?.method && (
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">전달일자</label>
                                          <Input
                                            type="date"
                                            value={currentVisit.sDetail.date || ''}
                                            onChange={(e) =>
                                              updateSDetail(currentVisit.id, { date: e.target.value })
                                            }
                                            className="text-sm"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card className="h-full">
                      <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">대상자를 선택하세요</p>
                          <p className="text-sm">왼쪽 리스트에서 방문자를 클릭하여 체크리스트를 확인하세요.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  )
}