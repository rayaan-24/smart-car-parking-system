import random
from models.slot import ParkingSlot
from models.reservation import Reservation

class GeneticAlgorithm:
    """
    Genetic Algorithm for optimizing parking slot selection.
    
    The algorithm finds the optimal parking slot by minimizing:
    1. Distance from entrance (primary factor)
    2. Slot availability
    3. No reservation conflicts
    
    Chromosome: Represents a parking slot candidate
    Population: Set of candidate slots
    Fitness: Score based on distance and availability
    """
    
    def __init__(self, population_size=20, generations=50, mutation_rate=0.1, crossover_rate=0.8):
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.best_fitness = 0
        self.generations_run = 0
        self.best_slot = None
        
    def initialize_population(self, available_slots):
        """
        Create initial population from available slots.
        If we have fewer slots than population size, use all slots.
        """
        if not available_slots:
            return []
        
        if len(available_slots) >= self.population_size:
            return random.sample(available_slots, self.population_size)
        else:
            population = available_slots.copy()
            while len(population) < self.population_size:
                population.append(random.choice(available_slots))
            return population
    
    def calculate_fitness(self, slot, date=None, start_time=None, end_time=None):
        """
        Calculate fitness score for a slot.
        
        Fitness Components:
        - Distance score: Closer slots are better (inverse distance)
        - Availability score: Available slots get full score
        - Conflict score: No conflicts get full score
        
        Weights:
        - Distance: 50% (most important)
        - Availability: 30%
        - No conflicts: 20%
        """
        distance_score = 0
        availability_score = 0
        conflict_score = 0
        
        if slot['status'] == 'available':
            distance = float(slot['entrance_distance'])
            
            if distance > 0:
                distance_score = (1.0 / distance) * 50
            else:
                distance_score = 50
            
            availability_score = 30
            
            if date and start_time and end_time:
                has_conflict = Reservation.check_conflict(
                    slot['id'], date, start_time, end_time
                )
                if not has_conflict:
                    conflict_score = 20
                else:
                    conflict_score = 0
            else:
                conflict_score = 20
        
        total_fitness = distance_score + availability_score + conflict_score
        
        return total_fitness
    
    def selection(self, population, fitness_scores):
        """
        Tournament selection: Select the best individual from a random subset.
        """
        tournament_size = 3
        tournament_indices = random.sample(range(len(population)), min(tournament_size, len(population)))
        
        best_idx = tournament_indices[0]
        best_fitness = fitness_scores[best_idx]
        
        for idx in tournament_indices[1:]:
            if fitness_scores[idx] > best_fitness:
                best_fitness = fitness_scores[idx]
                best_idx = idx
        
        return population[best_idx]
    
    def crossover(self, parent1, parent2):
        """
        Single-point crossover: Combine attributes from two parents.
        For parking slots, we primarily use the better fitness parent.
        """
        if random.random() < self.crossover_rate:
            if random.random() < 0.5:
                return parent1
            else:
                return parent2
        return parent1
    
    def mutate(self, chromosome, available_slots):
        """
        Mutation: Randomly replace chromosome with another available slot.
        """
        if random.random() < self.mutation_rate and available_slots:
            return random.choice(available_slots)
        return chromosome
    
    def evolve(self, population, available_slots, date=None, start_time=None, end_time=None):
        """
        Evolve population for one generation.
        """
        new_population = []
        
        fitness_scores = [
            self.calculate_fitness(slot, date, start_time, end_time)
            for slot in population
        ]
        
        while len(new_population) < len(population):
            parent1 = self.selection(population, fitness_scores)
            parent2 = self.selection(population, fitness_scores)
            
            offspring = self.crossover(parent1, parent2)
            offspring = self.mutate(offspring, available_slots)
            
            new_population.append(offspring)
        
        return new_population
    
    def find_optimal_slot(self, date=None, start_time=None, end_time=None):
        """
        Main GA execution: Find optimal parking slot.
        
        Steps:
        1. Initialize population
        2. Evaluate fitness
        3. Evolve for specified generations
        4. Return best slot
        """
        available_slots = ParkingSlot.get_available_slots()
        
        if not available_slots:
            return None
        
        if len(available_slots) == 1:
            return available_slots[0]
        
        population = self.initialize_population(available_slots)
        
        for generation in range(self.generations):
            fitness_scores = [
                self.calculate_fitness(slot, date, start_time, end_time)
                for slot in population
            ]
            
            best_idx = fitness_scores.index(max(fitness_scores))
            best_fitness = fitness_scores[best_idx]
            
            if best_fitness > self.best_fitness:
                self.best_fitness = best_fitness
                self.best_slot = population[best_idx]
            
            population = self.evolve(population, available_slots, date, start_time, end_time)
            
            self.generations_run = generation + 1
            
            if self.best_fitness >= 100:
                break
        
        return self.best_slot
    
    def get_algorithm_stats(self):
        """
        Get statistics about the GA execution.
        """
        return {
            'population_size': self.population_size,
            'generations': self.generations,
            'generations_run': self.generations_run,
            'mutation_rate': self.mutation_rate,
            'crossover_rate': self.crossover_rate,
            'best_fitness': self.best_fitness,
            'converged': self.best_fitness >= 90
        }
