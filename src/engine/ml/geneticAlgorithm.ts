/**
 * Genetic algorithm for evolving neural net weights.
 * Population of weight vectors → selection → crossover → mutation → next gen.
 */

export class GeneticAlgorithm {
  populationSize: number
  eliteCount: number
  mutationRate: number
  mutationStrength: number
  crossoverRate: number

  constructor(
    populationSize = 30,
    eliteCount = 6,
    mutationRate = 0.2,
    mutationStrength = 0.6,
    crossoverRate = 0.35,
  ) {
    this.populationSize = populationSize
    this.eliteCount = eliteCount
    this.mutationRate = mutationRate
    this.mutationStrength = mutationStrength
    this.crossoverRate = crossoverRate
  }

  /** Create initial random population */
  initPopulation(weightCount: number): number[][] {
    const pop: number[][] = []
    for (let i = 0; i < this.populationSize; i++) {
      const individual: number[] = []
      for (let w = 0; w < weightCount; w++) {
        individual.push(Math.random() * 2 - 1)
      }
      pop.push(individual)
    }
    return pop
  }

  /** Seed population: first individual uses provided weights, rest are mutations of it */
  initSeededPopulation(weightCount: number, seed: number[]): number[][] {
    const pop: number[][] = [[...seed]]
    for (let i = 1; i < this.populationSize; i++) {
      const mutated = seed.map(w => {
        if (Math.random() < 0.3) {
          return w + gaussianRandom() * 0.5
        }
        return w
      })
      pop.push(mutated)
    }
    return pop
  }

  /** Evolve: given fitnesses for current generation, produce next generation */
  evolve(population: number[][], fitnesses: number[], generation: number): number[][] {
    const indices = Array.from({ length: population.length }, (_, i) => i)
    indices.sort((a, b) => (fitnesses[b] ?? -Infinity) - (fitnesses[a] ?? -Infinity))

    const sorted = indices
      .map((i) => population[i])
      .filter((p): p is number[] => p !== undefined)
    const newPop: number[][] = []

    // Elites survive unchanged
    for (let i = 0; i < this.eliteCount; i++) {
      const elite = sorted[i]
      if (!elite) break
      newPop.push([...elite])
    }

    // Adaptive mutation: strength decays over generations
    const adaptiveStrength = Math.max(0.1, this.mutationStrength * Math.pow(0.98, generation))

    // Fill remaining slots
    while (newPop.length < this.populationSize) {
      const parentA = this.tournamentSelect(population, fitnesses, 3)
      const parentB = this.tournamentSelect(population, fitnesses, 3)

      let child: number[]
      if (Math.random() < this.crossoverRate) {
        child = this.crossover(parentA, parentB)
      } else {
        child = [...parentA]
      }

      child = this.mutate(child, this.mutationRate, adaptiveStrength)
      newPop.push(child)
    }

    return newPop
  }

  private tournamentSelect(population: number[][], fitnesses: number[], k: number): number[] {
    // Population is guaranteed non-empty at call time (populationSize
    // is >= 1). The `!` assertions below are safe because the random
    // index is always within bounds.
    let bestIdx = Math.floor(Math.random() * population.length)
    let bestFit = fitnesses[bestIdx] ?? -Infinity

    for (let i = 1; i < k; i++) {
      const idx = Math.floor(Math.random() * population.length)
      const f = fitnesses[idx] ?? -Infinity
      if (f > bestFit) {
        bestIdx = idx
        bestFit = f
      }
    }
    return population[bestIdx] ?? []
  }

  private crossover(a: number[], b: number[]): number[] {
    return a.map((val, i) => (Math.random() < 0.5 ? val : (b[i] ?? val)))
  }

  private mutate(weights: number[], rate: number, strength: number): number[] {
    return weights.map(w => {
      if (Math.random() < rate) {
        return w + gaussianRandom() * strength
      }
      return w
    })
  }
}

/** Box-Muller transform for gaussian random numbers */
function gaussianRandom(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}
