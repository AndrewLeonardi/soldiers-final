/**
 * MilestoneCallout — HTML overlay for training milestone banners.
 *
 * Sprint 2, Phase C3. Slides in from right, holds 1.5s, slides out.
 * Milestones: FIRST HIT, FIRST KILL, 10 IN A ROW.
 */
import { useEffect, useState, useRef } from 'react'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import type { MilestoneEvent } from '@stores/campTrainingStore'
import '@styles/camp-ui.css'

export function MilestoneCallout() {
  const activeMilestone = useCampTrainingStore((s) => s.activeMilestone)
  const [visible, setVisible] = useState<MilestoneEvent | null>(null)
  const lastMilestoneRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeMilestone) return
    // Only show new milestones
    const key = `${activeMilestone.type}-${activeMilestone.generation}`
    if (key === lastMilestoneRef.current) return
    lastMilestoneRef.current = key

    setVisible(activeMilestone)

    // Auto-hide after animation duration (2.5s matches CSS)
    const timer = setTimeout(() => setVisible(null), 2500)
    return () => clearTimeout(timer)
  }, [activeMilestone])

  if (!visible) return null

  return (
    <div className="milestone-overlay">
      <div key={`${visible.type}-${visible.generation}`} className="milestone-callout">
        {visible.label}
      </div>
    </div>
  )
}
