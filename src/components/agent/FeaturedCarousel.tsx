'use client'

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

import { AgentCard } from './AgentCard'
import type { AgentCardData } from './types'

export function FeaturedCarousel({ agents }: { agents: AgentCardData[] }) {
  return (
    <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="relative">
      <CarouselContent className="-ml-4">
        {agents.map((agent) => (
          <CarouselItem key={agent.id} className="pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
            <AgentCard agent={agent} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="-left-3 top-1/2 hidden -translate-y-1/2 border-[var(--border)] bg-white/95 shadow-md backdrop-blur sm:flex" />
      <CarouselNext className="-right-3 top-1/2 hidden -translate-y-1/2 border-[var(--border)] bg-white/95 shadow-md backdrop-blur sm:flex" />
    </Carousel>
  )
}
