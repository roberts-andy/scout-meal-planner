import { Recipe, RecipeVersion } from './types'

export function migrateRecipeToVersioning(recipe: Recipe): Recipe {
  if (recipe.currentVersion !== undefined && recipe.versions !== undefined) {
    return recipe
  }
  
  return {
    ...recipe,
    currentVersion: 1,
    versions: [],
  }
}

export function getRecipeEventVersion(recipe: Recipe, eventId: string): RecipeVersion | undefined {
  return recipe.versions.find(v => v.eventId === eventId)
}

export function shouldCreateNewVersion(recipe: Recipe, eventId: string): boolean {
  return !getRecipeEventVersion(recipe, eventId)
}

export function revertRecipeToVersion(recipe: Recipe, targetVersion: number): Recipe {
  const versionToRevert = recipe.versions.find(v => v.versionNumber === targetVersion)
  
  if (!versionToRevert) {
    return recipe
  }

  const newVersionNumber = recipe.currentVersion + 1
  
  const currentSnapshot: RecipeVersion = {
    versionNumber: recipe.currentVersion,
    eventId: undefined,
    eventName: undefined,
    name: recipe.name,
    description: recipe.description,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    variations: recipe.variations,
    tags: recipe.tags,
    createdAt: recipe.updatedAt,
    changeNote: `Before reverting to v${targetVersion}`,
  }

  return {
    ...recipe,
    name: versionToRevert.name,
    description: versionToRevert.description,
    servings: versionToRevert.servings,
    ingredients: versionToRevert.ingredients.map(ing => ({ ...ing, id: crypto.randomUUID() })),
    variations: versionToRevert.variations.map(v => ({ ...v, id: crypto.randomUUID() })),
    tags: versionToRevert.tags,
    currentVersion: newVersionNumber,
    updatedAt: Date.now(),
    versions: [
      currentSnapshot,
      {
        versionNumber: newVersionNumber,
        eventId: undefined,
        eventName: undefined,
        name: versionToRevert.name,
        description: versionToRevert.description,
        servings: versionToRevert.servings,
        ingredients: versionToRevert.ingredients,
        variations: versionToRevert.variations,
        tags: versionToRevert.tags,
        createdAt: Date.now(),
        changeNote: `Reverted to v${targetVersion}`,
      },
      ...recipe.versions
    ],
  }
}
